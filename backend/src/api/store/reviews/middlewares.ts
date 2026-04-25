import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework"
import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  StoreCreateReview,
  StoreGetReviewsParams,
  StoreUpdateReview,
} from "./validators"

const storeReviewFields = [
  "id",
  "reference",
  "rating",
  "customer_note",
  "customer.first_name",
  "customer.last_name",
  "seller_note",
  "created_at",
  "updated_at",
]

const storeReviewQueryConfig = {
  list: {
    defaults: storeReviewFields,
    isList: true,
  },
  retrieve: {
    defaults: storeReviewFields,
    isList: false,
  },
}

async function ensureCustomerOwnsReview(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const customerId = (req as any).auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const reviewId = req.params.id

  const { data } = await query.graph({
    entity: "customer_review",
    fields: ["id"],
    filters: {
      customer_id: customerId,
      review_id: reviewId,
    },
  })

  if (!data?.length) {
    return res.status(404).json({ message: "Yorum bulunamadı." })
  }

  next()
}

export const storeReviewMiddlewares = [
  {
    method: ["GET"],
    matcher: "/store/reviews",
    middlewares: [
      validateAndTransformQuery(StoreGetReviewsParams, storeReviewQueryConfig.list),
    ],
  },
  {
    method: ["POST"],
    matcher: "/store/reviews",
    middlewares: [
      validateAndTransformQuery(StoreGetReviewsParams, storeReviewQueryConfig.retrieve),
      validateAndTransformBody(StoreCreateReview),
    ],
  },
  {
    method: ["GET"],
    matcher: "/store/reviews/:id/replies",
    middlewares: [],
  },
  {
    method: ["GET"],
    matcher: "/store/reviews/:id",
    middlewares: [
      validateAndTransformQuery(StoreGetReviewsParams, storeReviewQueryConfig.retrieve),
      ensureCustomerOwnsReview,
    ],
  },
  {
    method: ["DELETE"],
    matcher: "/store/reviews/:id",
    middlewares: [ensureCustomerOwnsReview],
  },
  {
    method: ["POST"],
    matcher: "/store/reviews/:id",
    middlewares: [
      validateAndTransformQuery(StoreGetReviewsParams, storeReviewQueryConfig.retrieve),
      validateAndTransformBody(StoreUpdateReview),
      ensureCustomerOwnsReview,
    ],
  },
]