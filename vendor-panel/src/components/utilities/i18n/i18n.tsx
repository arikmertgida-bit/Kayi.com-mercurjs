import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import * as z from "zod"

import { defaultI18nOptions } from "../../../i18n/config"

export const I18n = () => {
  if (i18n.isInitialized) {
    return null
  }

  i18n
    .use(
      new LanguageDetector(null, {
        lookupCookie: "lng",
        lookupLocalStorage: "lng",
      })
    )
    .use(initReactI18next)
    .init(defaultI18nOptions)

  z.setErrorMap((issue, ctx) => {
    if (issue.code === z.ZodIssueCode.too_small) {
      if (issue.type === "string") {
        if (issue.minimum === 1) {
          return { message: "Bu alan zorunludur." }
        }
        return { message: `En az ${issue.minimum} karakter girilmelidir.` }
      }
      if (issue.type === "array") {
        return { message: `En az ${issue.minimum} öğe seçilmelidir.` }
      }
    }
    if (issue.code === z.ZodIssueCode.too_big) {
      if (issue.type === "string") {
        return { message: `En fazla ${issue.maximum} karakter girilebilir.` }
      }
    }
    if (issue.code === z.ZodIssueCode.invalid_string) {
      if (issue.validation === "email") {
        return { message: "Geçersiz e-posta adresi." }
      }
      if (issue.validation === "url") {
        return { message: "Geçersiz URL adresi." }
      }
    }
    if (issue.code === z.ZodIssueCode.invalid_type) {
      if (issue.received === "undefined" || issue.received === "null") {
        return { message: "Bu alan zorunludur." }
      }
    }
    return { message: ctx.defaultError }
  })

  return null
}

export { i18n }
