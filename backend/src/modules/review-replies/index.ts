import { Module } from "@medusajs/framework/utils"
import ReviewReplyService from "./service"

export const REVIEW_REPLY_MODULE = "reviewReply"

export default Module(REVIEW_REPLY_MODULE, { service: ReviewReplyService })
