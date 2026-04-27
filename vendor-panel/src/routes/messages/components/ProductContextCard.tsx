import type { ProductContextData } from "../../../lib/messenger/types"
import { MEDUSA_STOREFRONT_URL } from "../../../lib/storefront"

interface ProductContextCardProps {
  product: ProductContextData
}

/**
 * Vendor Panel — context card shown at the top of the chat panel when the
 * conversation is PRODUCT_BASED. Lets the vendor instantly see which product
 * the customer is asking about, with a direct link to the storefront.
 */
export function ProductContextCard({ product }: ProductContextCardProps) {
  const productUrl = product.handle
    ? `${MEDUSA_STOREFRONT_URL}/tr/products/${product.handle}`
    : null

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-ui-bg-base border-b border-ui-border-base flex-shrink-0">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-ui-bg-subtle flex-shrink-0 border border-ui-border-base">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ui-fg-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ui-fg-muted font-medium uppercase tracking-wide mb-0.5">
          Ürün sorusu
        </p>
        {productUrl ? (
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-ui-fg-base hover:text-ui-fg-interactive hover:underline truncate block transition-colors"
          >
            {product.title}
            <span className="ml-1 text-ui-fg-muted text-xs">↗</span>
          </a>
        ) : (
          <p className="text-sm font-medium text-ui-fg-base truncate">{product.title}</p>
        )}
      </div>

      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-ui-tag-orange-bg text-ui-tag-orange-text font-medium">
        Ürün
      </span>
    </div>
  )
}
