import type { Metadata } from "next"
import { OrderGuideTabs } from "@/components/sections/OrderGuide/OrderGuideTabs"

export const metadata: Metadata = {
  title: "Sipariş, Kargo ve Hesap Rehberi | Kayı.com",
  description:
    "Siparişlerinizin size sorunsuz ve zamanında ulaşabilmesi ve hesap işlemlerinizi kolayca yönetebilmeniz için gerekli bilgilendirmeler.",
}

export default function OrderGuidePage() {
  return (
    <div className="container py-10 px-4 md:px-6 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
          Sipariş, Kargo ve Hesap Rehberi
        </h1>
        <p className="mt-3 text-base md:text-lg font-semibold text-gray-500">
          Son Güncelleme: 01 Mayıs 2026
        </p>
        <p className="mt-4 text-sm md:text-base font-semibold text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Siparişlerinizin size sorunsuz ve zamanında ulaşabilmesi ve hesap işlemlerinizi kolayca yönetebilmeniz için gerekli bilgilendirmeler aşağıda yer almaktadır.
        </p>
      </div>
      <OrderGuideTabs />
    </div>
  )
}
