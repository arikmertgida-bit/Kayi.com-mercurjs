import type { Metadata } from "next"
import { TermsTabs } from "@/components/sections/TermsConditions/TermsTabs"

export const metadata: Metadata = {
  title: "Şartlar ve Koşullar | Kayı.com",
  description:
    "Kayı.com platformunu kullanırken geçerli olan şartlar ve koşullar, kullanıcı yükümlülükleri ve platform politikalarını buradan inceleyebilirsiniz.",
}

export default function TermsAndConditionsPage() {
  return (
    <div className="container py-10 px-4 md:px-6 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight uppercase">
          Şartlar ve Koşullar
        </h1>
        <p className="mt-3 text-base md:text-lg font-semibold text-gray-500">
          Son Güncelleme: 01 Mayıs 2026
        </p>
      </div>
      <TermsTabs />
    </div>
  )
}
