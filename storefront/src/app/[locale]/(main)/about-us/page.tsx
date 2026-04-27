import type { Metadata } from "next"
import { AboutUsPage } from "@/components/sections/AboutUs/AboutUsPage"

export const metadata: Metadata = {
  title: "Hakkımızda | Kayı.com",
  description:
    "Kayı.com'un kuruluş felsefesi, temel değerleri, misyonu ve vizyonu hakkında bilgi edinin. Tam bağımsız yerli pazaryeri.",
}

export default function AboutPage() {
  return <AboutUsPage />
}
