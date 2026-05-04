import { AbstractFileProviderService, MedusaError } from '@medusajs/framework/utils';
import { Logger } from '@medusajs/framework/types';
import { 
  ProviderUploadFileDTO,
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO
} from '@medusajs/framework/types';
import { Client } from 'minio';
import path from 'path';
import { ulid } from 'ulid';
import sharp from 'sharp';

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])
const MAX_IMAGE_DIMENSION = 1920
const WEBP_QUALITY = 85

type InjectedDependencies = {
  logger: Logger
}

interface MinioServiceConfig {
  endPoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
  bucket?: string
}

export interface MinioFileProviderOptions {
  endPoint: string
  port?: number
  useSSL?: boolean
  accessKey: string
  secretKey: string
  bucket?: string
}

const DEFAULT_BUCKET = 'medusa-media'

/**
 * Service to handle file storage using MinIO.
 */
class MinioFileProviderService extends AbstractFileProviderService {
  static identifier = 'minio-file'
  protected readonly config_: MinioServiceConfig
  protected readonly logger_: Logger
  protected client: Client
  protected readonly bucket: string

  constructor({ logger }: InjectedDependencies, options: MinioFileProviderOptions) {
    super()
    this.logger_ = logger
    this.config_ = {
      endPoint: options.endPoint,
      port: options.port ?? 443,
      useSSL: options.useSSL ?? true,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
      bucket: options.bucket
    }

    // Use provided bucket or default
    this.bucket = this.config_.bucket || DEFAULT_BUCKET
    this.logger_.info(`MinIO service initialized with bucket: ${this.bucket}`)

    // Initialize Minio client
    this.client = new Client({
      endPoint: this.config_.endPoint,
      port: this.config_.port,
      useSSL: this.config_.useSSL,
      accessKey: this.config_.accessKey,
      secretKey: this.config_.secretKey
    })

    // Initialize bucket and policy
    this.initializeBucket().catch(error => {
      this.logger_.error(`Failed to initialize MinIO bucket: ${error.message}`)
    })
  }

  static validateOptions(options: Record<string, any>) {
    const requiredFields = [
      'endPoint',
      'accessKey',
      'secretKey'
    ]

    requiredFields.forEach((field) => {
      if (!options[field]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${field} is required in the provider's options`
        )
      }
    })
  }

  private async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const bucketExists = await this.client.bucketExists(this.bucket)
      
      if (!bucketExists) {
        // Create the bucket
        await this.client.makeBucket(this.bucket)
        this.logger_.info(`Created bucket: ${this.bucket}`)

        // Set bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicRead',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`]
            }
          ]
        }

        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
        this.logger_.info(`Set public read policy for bucket: ${this.bucket}`)
      } else {
        this.logger_.info(`Using existing bucket: ${this.bucket}`)
        
        // Verify/update policy on existing bucket
        try {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicRead',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`]
              }
            ]
          }
          await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
          this.logger_.info(`Updated public read policy for existing bucket: ${this.bucket}`)
        } catch (policyError) {
          this.logger_.warn(`Failed to update policy for existing bucket: ${policyError.message}`)
        }
      }
    } catch (error) {
      this.logger_.error(`Error initializing bucket: ${error.message}`)
      throw error
    }
  }

  async upload(
    file: ProviderUploadFileDTO
  ): Promise<ProviderFileResultDTO> {
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file provided'
      )
    }

    if (!file.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    try {
      const parsedFilename = path.parse(file.filename)
      const safeName = parsedFilename.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase()
        .substring(0, 60)

      let content = Buffer.from(file.content, 'base64')
      let mimeType = file.mimeType
      let fileExt = '.webp'

      // Görsel ise WebP'ye çevir, boyutlandır ve sıkıştır
      if (IMAGE_MIME_TYPES.has(file.mimeType)) {
        const optimized = await sharp(content)
          .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer()
        content = Buffer.from(optimized)
        mimeType = 'image/webp'
        fileExt = '.webp'
      } else {
        fileExt = parsedFilename.ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase()
      }

      const fileKey = `${safeName}-${ulid()}${fileExt}`

      // Upload file (MinIO does not support x-amz-acl or custom x-amz-meta-* headers in signature)
      await this.client.putObject(
        this.bucket,
        fileKey,
        content,
        content.length,
        {
          'Content-Type': mimeType,
        }
      )

      // Build public-facing URL
      const protocol = this.config_.useSSL ? 'https' : 'http'
      const baseUrl = process.env.MINIO_PUBLIC_URL ||
        `${protocol}://${this.config_.endPoint}:${this.config_.port}`
      const url = `${baseUrl}/${this.bucket}/${fileKey}`

      this.logger_.info(`Successfully uploaded file ${fileKey} to MinIO bucket ${this.bucket}`)

      return {
        url,
        key: fileKey
      }
    } catch (error) {
      this.logger_.error(`Failed to upload file: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to upload file: ${error.message}`
      )
    }
  }

  async delete(
    fileData: ProviderDeleteFileDTO
  ): Promise<void> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      await this.client.removeObject(this.bucket, fileData.fileKey)
      this.logger_.info(`Successfully deleted file ${fileData.fileKey} from MinIO bucket ${this.bucket}`)
    } catch (error) {
      // Log error but don't throw if file doesn't exist
      this.logger_.warn(`Failed to delete file ${fileData.fileKey}: ${error.message}`)
    }
  }

  async getPresignedDownloadUrl(
    fileData: ProviderGetFileDTO
  ): Promise<string> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const url = await this.client.presignedGetObject(
        this.bucket,
        fileData.fileKey,
        24 * 60 * 60 // URL expires in 24 hours
      )
      this.logger_.info(`Generated presigned URL for file ${fileData.fileKey}`)
      return url
    } catch (error) {
      this.logger_.error(`Failed to generate presigned URL: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate presigned URL: ${error.message}`
      )
    }
  }
}

export default MinioFileProviderService
