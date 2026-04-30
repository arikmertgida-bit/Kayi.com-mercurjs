/**
 * Messenger UI string constants for the storefront.
 * Site language is Turkish only (next-intl is not active).
 * All user-facing messenger strings are centralized here.
 */

export const MSG = {
  // Header / navigation
  MESSAGES_TITLE: "Mesajlar",

  // Search
  SEARCH_PLACEHOLDER: "Mesajlarda ara",

  // Conversation list
  NO_SEARCH_RESULTS: "Sonuç bulunamadı",
  NO_MESSAGES_EMPTY: "Henüz mesajınız yok",
  UNKNOWN_USER: "Bilinmiyor",

  // Last message preview
  IMAGE_MESSAGE: "📷 Fotoğraf",
  NO_MESSAGE_YET: "Henüz mesaj yok",

  // Chat area — empty state
  INBOX_TITLE: "Mesajlarınız",
  INBOX_DESCRIPTION: "Satıcılarla özel mesajlaşmak için soldaki bir konuşmayı seçin.",

  // Time labels used by formatRelativeTime
  TIME_JUST_NOW: "Az önce",
  TIME_MINUTES: "dk",
  TIME_HOURS: "sa",
  TIME_DAYS: "g",

  // Actions / accessibility
  CLOSE: "Kapat",
  SEND: "Gönder",

  // Message deletion
  DELETE_FOR_ME: "Sil",
  DELETE_FOR_ALL: "Herkesten Sil",
  MESSAGE_DELETED: "[Bu mesaj silindi]",
  CONFIRM_DELETE: "Seçenekler",
  DELETE_CANCEL: "Kapat",

  // Seller fallback name (PDP chat modal)
  SELLER_FALLBACK: "Satıcı",
} as const
