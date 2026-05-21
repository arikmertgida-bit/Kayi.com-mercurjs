/**
 * Kurumsal Storefront Logger
 *
 * Production: Yalnızca .error() seviyesi aktif — debug/info/warn yutulur.
 * Development: Tüm seviyeler (error, warn, info, debug) terminalde ayırt edilebilir şekilde aktif.
 *
 * Sıfır dış bağımlılık. Gelecekte Sentry / DataDog vb. entegrasyon için
 * sadece bu dosyayı güncelle — tüketici dosyalara dokunma.
 */

const isDev = process.env.NODE_ENV !== "production"

function error(message: string, ...args: unknown[]): void {
  // error seviyesi her ortamda aktiftir (critical path)
  console.error(`[ERROR] ${message}`, ...args)
}

function warn(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.warn(`[WARN] ${message}`, ...args)
  }
}

function info(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.info(`[INFO] ${message}`, ...args)
  }
}

function debug(message: string, ...args: unknown[]): void {
  if (isDev) {
    console.debug(`[DEBUG] ${message}`, ...args)
  }
}

export const logger = { error, warn, info, debug }
