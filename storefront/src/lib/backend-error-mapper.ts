const BACKEND_ERROR_PATTERNS = [
  ["unauthorized", ["unauthorized", "missing or invalid authorization header", "invalid or expired token"]],
  ["forbidden", ["forbidden"]],
  ["authenticationRequired", ["authentication required"]],
  ["accessDenied", ["access denied"]],
  ["internalServerError", ["internal server error"]],
  ["sellerNotFound", ["seller not found"]],
  ["customerNotFound", ["customer not found"]],
  ["reviewNotFound", ["review not found"]],
  ["replyNotFound", ["reply not found"]],
  ["reportNotFound", ["report not found"]],
  ["imageNotFound", ["image not found"]],
  ["orderNotFound", ["order not found"]],
  ["jobNotFound", ["job not found"]],
  ["adminAccessRequired", ["forbidden: admin access required"]],
  ["reviewIdRequired", ["review_id is required"]],
  ["productIdRequired", ["product_id is required"]],
  ["noFileUploaded", ["no file was uploaded", "no file uploaded"]],
  ["noFilesUploaded", ["no files were uploaded", "no files uploaded"]],
  ["actionMustBeHideOrPublish", ["action must be 'hide' or 'publish'", "action must be \"hide\" or \"publish\""]],
  ["stockLocationAlreadyLinked", ["stock location already linked to this seller"]],
  ["promotionShippingNotSupported", ["promotions targeting shipping methods are not supported for vendors"]],
  ["invalidIndexType", ["invalid index type"]],
  ["geliverCreateShipmentFailed", ["geliver createShipment failed"]],
  ["geliverCancelShipmentFailed", ["geliver cancelShipment failed"]],
  ["geliverCreateReturnShipmentFailed", ["geliver createReturnShipment failed"]],
  ["imageFetchFailed", ["failed to fetch image"]],
  ["campaignNotOwned", ["this campaign does not belong to you"]],
  ["promotionNotOwned", ["this promotion does not belong to you"]],
  ["startDatePast", ["start date cannot be in the past"]],
  ["promotionIdsEmpty", ["promotion_ids must not be empty"]],
  ["promoCodesInvalid", ["promo_codes array is required and must not be empty"]],
  ["duplicateSellerReport", ["you have already reported this seller"]],
  ["duplicateProductReport", ["you have already reported this product"]],
  ["duplicateOrderReview", ["you have already reviewed this order"]],
  ["duplicateProductReview", ["you have already reviewed this product"]],
  ["orderSelectRequired", ["please select the order you want to review"]],
  ["onlyOwnOrderReview", ["you can only review your own orders"]],
  ["orderNotDelivered", ["you can only review delivered orders"]],
  ["concurrentCampaignLock", ["concurrent campaign creation request detected. please try again shortly"]],
  ["messageCannotBeEmpty", ["message cannot be empty"]],
  ["messageTooLong", ["message too long", "message too long (max 10,000 characters)"]],
  ["invalidMessageContent", ["invalid message content"]],
  ["onlySenderDeleteAll", ["only the sender can delete for all"]],
  ["notParticipant", ["not_participant", "not a participant of this conversation"]],
  ["unknownErrorOccurred", ["an unknown error occurred"]],
  ["tooManyUploads", ["too many uploads"]],
  ["invalidEmailOrPassword", ["invalid email or password"]],
  ["invalidPromotionTypeForBudget", ["invalid request: expected literal: standard for field 'type', but got: 'budget'"]],
  ["requiredField", ["required field"]],
  ["applicationMethodPercentageRange", [
    "application methot value should be a percentage number between 0 and 100",
    "application method value should be a percentage number between 0 and 100",
  ]],
  ["sellerShippingMethodNotFound", ["seller shipping method not found"]],
  ["duplicateReview", ["review already exists"]],
  ["duplicateCommissionRule", ["rule already exists"]],
  ["duplicatePaymentAccount", ["payment account already exists for seller"]],
  ["duplicateReturnRequest", ["order return request already exists"]],
  ["payoutNotFound", ["payout not found"]],
] as const

type StaticBackendErrorKey = (typeof BACKEND_ERROR_PATTERNS)[number][0]

const DYNAMIC_ERROR_KEYS = [
  "duplicateHandle",
  "duplicateEmail",
  "duplicateSku",
  "duplicateCode",
  "duplicateValue",
  "entityNotFoundById",
  "nullValueInField",
  "payoutAlreadyExistsForOrder",
  "attributeValueAlreadyExists",
  "entityWithFieldNotFound",
] as const

type DynamicBackendErrorKey = (typeof DYNAMIC_ERROR_KEYS)[number]

export type BackendErrorKey = StaticBackendErrorKey | DynamicBackendErrorKey

type DynamicPattern = {
  key: DynamicBackendErrorKey
  regex: RegExp
  extractParams: (match: RegExpMatchArray) => Record<string, string>
}

const DYNAMIC_ERROR_PATTERNS: DynamicPattern[] = [
  {
    key: "duplicateHandle",
    regex: /with handle:?\s*(.+?),?\s*already exists/i,
    extractParams: (m) => ({ value: m[1].trim() }),
  },
  {
    key: "duplicateEmail",
    regex: /with email:?\s*(.+?),?\s*already exists/i,
    extractParams: (m) => ({ value: m[1].trim() }),
  },
  {
    key: "duplicateSku",
    regex: /with sku:?\s*(.+?),?\s*already exists/i,
    extractParams: (m) => ({ value: m[1].trim() }),
  },
  {
    key: "duplicateCode",
    regex: /with code:?\s*(.+?),?\s*already exists/i,
    extractParams: (m) => ({ value: m[1].trim() }),
  },
  {
    key: "duplicateValue",
    regex: /\bwith \w+:?\s*(.+?),?\s*already exists/i,
    extractParams: (m) => ({ value: m[1].trim() }),
  },
  {
    key: "entityNotFoundById",
    regex: /with id[: ]+['"]?([^'"]+?)['"]? (?:was )?not found/i,
    extractParams: (m) => ({ id: m[1] }),
  },
  {
    key: "nullValueInField",
    regex: /null value in (?:field|column) (\w+)/i,
    extractParams: (m) => ({ field: m[1] }),
  },
  {
    key: "payoutAlreadyExistsForOrder",
    regex: /^Payout already exists for order: (.+)$/i,
    extractParams: (m) => ({ id: m[1] }),
  },
  {
    key: "attributeValueAlreadyExists",
    regex: /^Attribute value (.+?) for attribute .+ already exists/i,
    extractParams: (m) => ({ value: m[1] }),
  },
  {
    key: "entityWithFieldNotFound",
    regex: /^.+ with \w+: .+ not found$/i,
    extractParams: () => ({}),
  },
]

type MatchResult = { key: BackendErrorKey; params: Record<string, string> }

type ErrorRecord = Record<string, unknown>

export type BackendErrorTranslator = (key: BackendErrorKey, params?: Record<string, string>) => string

const isRecord = (value: unknown): value is ErrorRecord => {
  return typeof value === "object" && value !== null
}

const getString = (record: ErrorRecord, key: string): string | undefined => {
  const value = record[key]
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const normalize = (value: string): string => value.trim().toLowerCase()

const findBackendError = (message: string): MatchResult | null => {
  const normalizedMessage = normalize(message)

  for (const [backendErrorKey, patterns] of BACKEND_ERROR_PATTERNS) {
    for (const pattern of patterns) {
      const normalizedPattern = normalize(pattern)
      if (
        normalizedMessage === normalizedPattern
        || normalizedMessage.includes(normalizedPattern)
      ) {
        return { key: backendErrorKey, params: {} }
      }
    }
  }

  for (const { key, regex, extractParams } of DYNAMIC_ERROR_PATTERNS) {
    const match = message.match(regex)
    if (match) {
      return { key, params: extractParams(match) }
    }
  }

  return null
}

export const mapBackendErrorMessage = (
  message: string,
  translate: BackendErrorTranslator
): string => {
  const result = findBackendError(message)
  if (!result) {
    return message
  }

  return translate(result.key, result.params)
}

export const extractErrorMessage = (error: unknown): string | null => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  if (!isRecord(error)) {
    return null
  }

  const topLevelMessage = getString(error, "message")
  if (topLevelMessage) {
    return topLevelMessage
  }

  const topLevelError = getString(error, "error")
  if (topLevelError) {
    return topLevelError
  }

  const response = error.response
  if (!isRecord(response)) {
    return null
  }

  const responseData = response.data
  if (!isRecord(responseData)) {
    return null
  }

  return getString(responseData, "message") ?? getString(responseData, "error") ?? null
}

export const mapUnknownBackendError = (
  error: unknown,
  translate: BackendErrorTranslator,
  fallbackMessage: string
): string => {
  const extractedMessage = extractErrorMessage(error)
  if (!extractedMessage) {
    return fallbackMessage
  }

  return mapBackendErrorMessage(extractedMessage, translate)
}
