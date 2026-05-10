import { useTranslation } from "react-i18next"
import type { MessageContext } from "../../../lib/messenger/types"

interface ChatHeaderProps {
  context: MessageContext | null
  otherName: string
  otherParticipantType: string
  participantCount: number
  customerAvatarUrl: string | null
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
  customerAvatarUrl,
  onBack,
  onClose,
}: ChatHeaderProps) {
  const { t } = useTranslation()
  const isProduct = context?.type === "PRODUCT"
  const isVendor = context?.type === "VENDOR"

  const contextLabel = isProduct
    ? t("messages.productQuestion")
    : isVendor
    ? t("messages.storeQuestion")
    : otherParticipantType

  return (
    <div className="p-3 border-b border-ui-border-base bg-ui-bg-base flex items-center gap-2 flex-shrink-0">
      {/* Mobile back */}
      <button
        onClick={onBack}
        className="md:hidden w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted hover:text-ui-fg-subtle transition-colors flex-shrink-0"
        aria-label={t("messages.back")}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Customer / participant avatar — always shown except for ADMIN */}
      {otherParticipantType === "ADMIN" ? (
        <img
          src="/logo.png"
          alt="Kayı.com"
          className="w-8 h-8 rounded-full object-cover aspect-square flex-shrink-0"
        />
      ) : (
        <img
          src={customerAvatarUrl ?? "/images/customer-default-avatar.jpg"}
          alt={otherName}
          className="w-8 h-8 rounded-full object-cover aspect-square flex-shrink-0"
        />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ui-fg-base truncate">{otherName}</p>
        <p className="text-xs text-ui-fg-muted">
          {otherParticipantType === "ADMIN" ? "Yönetim" : (
            <>{contextLabel}{" · "}{participantCount} {t("messages.participant")}</>
          )}
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-ui-bg-base-hover text-ui-fg-muted hover:text-ui-fg-subtle transition-colors flex-shrink-0"
        aria-label={t("messages.close")}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
