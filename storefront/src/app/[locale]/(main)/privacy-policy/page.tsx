import type { Metadata } from "next"
import { PrivacyTabs } from "@/components/sections/PrivacyPolicy/PrivacyTabs"

export const metadata: Metadata = {
  title: "Gizlilik & KVKK Politikası | Kayı.com",
  description:
    "Kayı.com Gizlilik ve KVKK Politikası. Kişisel verilerinizin nasıl işlendiğini, korunduğunu ve haklarınızı öğrenin.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container py-10 px-4 md:px-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
          Gizlilik &amp; KVKK Politikası
        </h1>
        <p className="mt-3 text-base md:text-lg font-semibold text-gray-500">
          Son Güncelleme: 01 Mayıs 2026
        </p>
      </div>

      {/* Tabs */}
      <PrivacyTabs />
    </div>
  )
}
