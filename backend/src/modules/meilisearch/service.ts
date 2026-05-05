import { MeiliSearch, Index } from "meilisearch"
import { MedusaError } from "@medusajs/framework/utils"

type MeilisearchOptions = {
  host: string
  apiKey: string
  productIndexName: string
}

export type MeilisearchIndexType = "product"

export default class MeilisearchModuleService {
  private client: MeiliSearch
  private options: MeilisearchOptions

  constructor({}: Record<string, unknown>, options: MeilisearchOptions) {
    if (!options.host || !options.apiKey || !options.productIndexName) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Meilisearch options are required"
      )
    }
    this.client = new MeiliSearch({
      host: options.host,
      apiKey: options.apiKey,
    })
    this.options = options
  }

  async getIndexName(type: MeilisearchIndexType): Promise<string> {
    switch (type) {
      case "product":
        return this.options.productIndexName
      default:
        throw new Error(`Invalid index type: ${type}`)
    }
  }

  async indexData(
    data: Record<string, unknown>[],
    type: MeilisearchIndexType = "product"
  ): Promise<void> {
    if (!data.length) return
    const indexName = await this.getIndexName(type)
    const index: Index = this.client.index(indexName)
    const task = await index.addDocuments(data)
    // Log task UID for observability — MeiliSearch processes writes asynchronously
    console.info(
      `[MEILISEARCH] indexData enqueued ${data.length} documents — taskUid: ${task.taskUid}`
    )
  }

  /**
   * Fetch documents by ID using parallelised requests (Promise.all).
   * Each getDocument() call is sent concurrently — wall-clock time is bounded
   * by the slowest single request, not the sum of all requests.
   */
  async retrieveFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product"
  ): Promise<Record<string, unknown>[]> {
    if (!documentIds.length) return []
    const indexName = await this.getIndexName(type)
    const index: Index = this.client.index(indexName)

    const results = await Promise.all(
      documentIds.map(async (id) => {
        try {
          return (await index.getDocument(id)) as Record<string, unknown>
        } catch {
          return null
        }
      })
    )
    return results.filter((r): r is Record<string, unknown> => r !== null)
  }

  async deleteFromIndex(
    documentIds: string[],
    type: MeilisearchIndexType = "product"
  ): Promise<void> {
    if (!documentIds.length) return
    const indexName = await this.getIndexName(type)
    const index: Index = this.client.index(indexName)
    const task = await index.deleteDocuments(documentIds)
    console.info(
      `[MEILISEARCH] deleteFromIndex enqueued ${documentIds.length} deletions — taskUid: ${task.taskUid}`
    )
  }

  async search(query: string, type: MeilisearchIndexType = "product") {
    const indexName = await this.getIndexName(type)
    const index: Index = this.client.index(indexName)
    return await index.search(query)
  }
}
