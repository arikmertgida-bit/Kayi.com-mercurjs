import { Module } from "@medusajs/framework/utils"
import ReviewImageService from "./service"

export const REVIEW_IMAGE_MODULE = "reviewImage"

export default Module(REVIEW_IMAGE_MODULE, {
  service: ReviewImageService,
})
