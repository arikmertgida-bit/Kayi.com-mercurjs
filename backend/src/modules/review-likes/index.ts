import { Module } from "@medusajs/framework/utils"
import ReviewLikeService from "./service"

export const REVIEW_LIKE_MODULE = "reviewLike"

export default Module(REVIEW_LIKE_MODULE, { service: ReviewLikeService })
