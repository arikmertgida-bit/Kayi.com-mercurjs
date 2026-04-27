import type { MessageContext } from "../../../lib/messenger/types"

interface ChatHeaderProps {
  context: MessageContext | null
  otherName: string
  otherParticipantType: string
  participantCount: number
  onBack: () => void
  onClose: () => void
}

/**
 * Vendor Panel chat header. Shows product title (PRODUCT context) or
 * "Mağaza sorusu" label (VENDOR context) so the vendor instantly
 * knows the nature of the inquiry. Raw IDs are never shown.
 */
export function ChatHeader({
  context,
  otherName,
  otherParticipantType,
  participantCount,
  onBack,
  onClose,
}: ChatHeaderProps) {
  const isProduct = context?.type === "PRODUCT"
  const isVendor = context?.type === "VENDOR"

  const contextLabel = isProduct
    ? "Ürün sorusu"
    : isVendor
    ? "Genel mağaza sorusu"
    : otherParticipantType

  return (
    <div className="p-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-2 flex-shrink-0">
      {/* Mobile back */}
      <button
        onClick={onBack}
        className="md:hidden w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted hover:text-ui-fg-subtle transition-colors flex-shrink-0"
        aria-label="Geri"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Context icon */}
      {isProduct ? (
        <div className="w-8 h-8 rounded-lg bg-ui-tag-orange-bg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-ui-tag-orange-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
      ) : isVendor ? (
        <div className="w-8 h-8 rounded-lg bg-ui-tag-green-bg flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-ui-tag-green-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-ui-tag-blue-bg flex items-center justify-center text-xs font-medium text-ui-tag-blue-text flex-shrink-0">
          {(otherName[0] ?? "?").toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ui-fg-base truncate">{otherName}</p>
        <p className="text-xs text-ui-fg-muted">
          {contextLabel}
          {" · "}
          {participantCount} katılımcı
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted hover:text-ui-fg-subtle transition-colors flex-shrink-0"
        aria-label="Kapat"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
