import { model } from "@medusajs/framework/utils"

const ReviewReply = model.define("review_reply", {
  id: model.id().primaryKey(),
  review_id: model.text(),
  customer_id: model.text().nullable(),
  seller_id: model.text().nullable(),
  seller_name: model.text().nullable(),
  content: model.text(),
  likes_count: model.number().default(0),
  liked_by_ids: model.json().nullable(),
})

export default ReviewReply
