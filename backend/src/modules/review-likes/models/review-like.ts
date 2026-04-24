import { model } from "@medusajs/framework/utils"

const ReviewLike = model.define("review_like", {
  id: model.id().primaryKey(),
  review_id: model.text(),
  customer_id: model.text(),
})

export default ReviewLike
