import { enUS, tr } from "date-fns/locale"
import { Language } from "./types"

export const languages: Language[] = [
  {
    code: "tr",
    display_name: "Türkçe",
    ltr: true,
    date_locale: tr,
  },
  {
    code: "en",
    display_name: "English",
    ltr: true,
    date_locale: enUS,
  },
]
