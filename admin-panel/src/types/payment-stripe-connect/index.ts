// import Stripe from 'stripe'
// TODO: PayTR entegrasyonu tamamlandığında Stripe tipleri PayTR tipleriyle değiştirilecek

export const PaymentProviderKeys = {
  CARD: 'card'
}

// TODO: PayTR entegrasyonunda PayTR'a özgü intent parametreleriyle güncellenecek
export type PaymentIntentOptions = Record<string, unknown>

export const ErrorCodes = {
  PAYMENT_INTENT_UNEXPECTED_STATE: 'payment_intent_unexpected_state'
}

export const ErrorIntentStatus = {
  SUCCEEDED: 'succeeded',
  CANCELED: 'canceled'
}
