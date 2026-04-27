/**
 * Vendor Panel — context card shown at the top of the chat panel when the
 * conversation is VENDOR_BASED (general store question, not product-specific).
 * Informs the vendor that the customer has a general inquiry.
 */
export function VendorContextCard() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-ui-bg-subtle border-b border-ui-border-base flex-shrink-0">
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-ui-tag-green-bg flex items-center justify-center flex-shrink-0">
        <svg
          className="w-4 h-4 text-ui-tag-green-text"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-ui-fg-base">Genel mağaza sorusu</p>
        <p className="text-[10px] text-ui-fg-muted mt-0.5">
          Müşteri belirli bir ürün için değil, mağazanız hakkında yazıyor.
        </p>
      </div>

      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-ui-tag-green-bg text-ui-tag-green-text font-medium">
        Mağaza
      </span>
    </div>
  )
}
