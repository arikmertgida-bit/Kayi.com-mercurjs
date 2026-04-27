"use client"

import { useState } from "react"

const tabs = [
  {
    id: "taraflar",
    label: "1. Taraflar ve Kabul",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          İşbu Şartlar ve Koşullar (&quot;Sözleşme&quot;), Kayı.com platformu (&quot;Platform&quot;) ile Platform&apos;a üye olan veya hizmetlerden faydalanan kullanıcı (&quot;Kullanıcı&quot;) arasında akdedilmiştir.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Kullanıcı, Platform&apos;a erişim sağlayarak, üye olarak veya alışveriş yaparak bu Sözleşme hükümlerini okuduğunu, anladığını ve kabul ettiğini beyan eder.
        </p>
      </div>
    ),
  },
  {
    id: "platform",
    label: "2. Platformun Niteliği",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com, bir elektronik pazar yeri (marketplace) olup, alıcılar ile satıcılar arasında aracılık hizmeti sunmaktadır.
        </p>
        <ul className="space-y-3 pl-4">
          {[
            "Kayı.com, Platform üzerinde listelenen ürünlerin satıcısı değildir.",
            "Ürünlerin üretimi, satışı, fiyatlandırılması, faturalanması ve teslimatı tamamen ilgili satıcının sorumluluğundadır.",
            "Kayı.com, taraflar arasındaki ticari işlemlerde doğrudan taraf değildir.",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "uyelik",
    label: "3. Üyelik ve Hesap Güvenliği",
    content: (
      <div className="space-y-4">
        <ul className="space-y-3 pl-4">
          {[
            "Kullanıcı, üyelik sırasında verdiği bilgilerin doğru ve güncel olduğunu kabul eder.",
            "Hesap bilgilerinin gizliliği tamamen kullanıcının sorumluluğundadır.",
            "Hesap üzerinden yapılan tüm işlemler kullanıcıya ait kabul edilir.",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com, aşağıdaki durumlarda kullanıcı hesabını askıya alma veya sonlandırma hakkını saklı tutar:
        </p>
        <ul className="space-y-3 pl-4">
          {[
            "Sahte veya yanıltıcı bilgi kullanımı",
            "Hukuka aykırı faaliyetler",
            "Platform kurallarının ihlali",
            "Şüpheli işlem tespiti",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "satis",
    label: "4. Satış, Sipariş ve Teslimat",
    content: (
      <div className="space-y-4">
        <ul className="space-y-3 pl-4">
          {[
            "Siparişler, ilgili satıcı tarafından hazırlanır ve gönderilir.",
            "Teslimat süreçleri, \"Kargo ve Teslimat Rehberi\" kapsamında yürütülür.",
            "Ürün mülkiyeti, ürün alıcıya teslim edilene kadar satıcıya aittir.",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com, lojistik süreçlerde yaşanabilecek gecikmelerden dolayı sorumlu tutulamaz.
        </p>
      </div>
    ),
  },
  {
    id: "odeme",
    label: "5. Ödeme ve Komisyon",
    content: (
      <div className="space-y-4">
        <ul className="space-y-3 pl-4">
          {[
            "Platform üzerinden gerçekleştirilen ödemeler, anlaşmalı ödeme altyapıları aracılığıyla yapılır.",
            "Kayı.com, satıcılar üzerinden belirli oranlarda hizmet bedeli/komisyon alma hakkına sahiptir.",
            "Ödeme süreçlerinde oluşabilecek teknik aksaklıklardan dolayı Kayı.com sorumlu tutulamaz.",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "iptal",
    label: "6. İptal, İade ve Cayma Hakkı",
    content: (
      <div className="space-y-4">
        <ul className="space-y-3 pl-4">
          {[
            "Kullanıcılar, 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında 14 gün cayma hakkına sahiptir.",
            "İade süreçleri ilgili satıcı tarafından yürütülür.",
            "İade şartları, \"İade Politikası\" metninde detaylı olarak belirtilmiştir.",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "urun-sorumluluk",
    label: "7. Ürün ve İçerik Sorumluluğu",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">Platform üzerinde yayınlanan aşağıdaki içerikler tamamen satıcılar tarafından sağlanmaktadır:</p>
        <ul className="space-y-3 pl-4">
          {["Ürün açıklamaları", "Görseller", "Fiyat bilgileri"].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-base leading-relaxed">Kayı.com:</p>
        <ul className="space-y-3 pl-4">
          {[
            "Yanıltıcı, hatalı veya eksik içeriklerden sorumlu değildir",
            "Hukuka aykırı ürünlerin tespiti halinde içeriği kaldırma hakkını saklı tutar",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "yasakli",
    label: "8. Yasaklı Faaliyetler",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">Kullanıcılar aşağıdaki faaliyetlerde bulunamaz:</p>
        <ul className="space-y-3 pl-4">
          {[
            "Hukuka aykırı ürün satışı",
            "Sahte ürün listeleme",
            "Dolandırıcılık girişimleri",
            "Sisteme zarar verecek yazılım veya işlem kullanımı",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-base leading-relaxed">
          Bu tür durumlarda Kayı.com gerekli yasal işlemleri başlatma hakkını saklı tutar.
        </p>
      </div>
    ),
  },
  {
    id: "fikri-mulkiyet",
    label: "9. Fikri Mülkiyet Hakları",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com platformu, tasarımı, logosu, yazılımı ve tüm içerikleri telif hakları kapsamında korunmaktadır.
        </p>
        <p className="font-semibold text-base leading-relaxed">İzinsiz:</p>
        <ul className="space-y-3 pl-4">
          {["Kopyalanamaz", "Çoğaltılamaz", "Ticari amaçla kullanılamaz"].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "sorumluluk",
    label: "10. Sorumluluk Sınırı",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">Kayı.com:</p>
        <ul className="space-y-3 pl-4">
          {[
            "Platformun kesintisiz çalışacağını garanti etmez",
            "Teknik arızalar, bakım çalışmaları veya altyapı sorunlarından doğan kesintilerden sorumlu değildir",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-base leading-relaxed">
          Mücbir sebepler (doğal afetler, savaş, internet kesintisi vb.) durumunda tarafların yükümlülükleri askıya alınır.
        </p>
      </div>
    ),
  },
  {
    id: "uyusmazlik",
    label: "11. Uyuşmazlıkların Çözümü",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kullanıcı ile satıcı arasında doğabilecek uyuşmazlıklarda Kayı.com aracı platform olup, doğrudan taraf değildir.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Ancak gerekli durumlarda taraflar arasında iletişim sağlanmasına destek olabilir.
        </p>
      </div>
    ),
  },
  {
    id: "kvkk",
    label: "12. Kişisel Verilerin Korunması",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kullanıcıya ait kişisel veriler, ilgili mevzuat kapsamında ve Kayı.com KVKK Politikası doğrultusunda işlenmektedir.
        </p>
      </div>
    ),
  },
  {
    id: "degisiklik",
    label: "13. Sözleşme Değişiklikleri",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com, işbu sözleşmede önceden bildirimde bulunmaksızın değişiklik yapma hakkını saklı tutar.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Güncellenen şartlar, Platform&apos;da yayınlandığı tarihten itibaren geçerli olur.
        </p>
      </div>
    ),
  },
  {
    id: "yururluk",
    label: "14. Yürürlük ve Yetki",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Bu sözleşme, kullanıcının Platform&apos;u kullanmaya başlamasıyla yürürlüğe girer.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          İşbu sözleşmeden doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri ve icra daireleri yetkilidir.
        </p>
      </div>
    ),
  },
]

export function TermsTabs() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full">
      {/* Mobile: horizontal scroll tabs */}
      <div className="lg:hidden w-full overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-2 w-max">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(i)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeTab === i
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <nav
        className="hidden lg:flex flex-col gap-1 w-72 shrink-0"
        aria-label="Şartlar ve koşullar bölümleri"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors relative ${
              activeTab === i
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {activeTab === i && (
              <span className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full" />
            )}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content area — min-h prevents CLS */}
      <div className="flex-1 min-h-[500px] bg-gray-50 rounded-2xl p-6 lg:p-8">
        <h2 className="text-xl font-bold mb-6 text-gray-900">
          {tabs[activeTab].label}
        </h2>
        <div className="text-gray-800">{tabs[activeTab].content}</div>
      </div>
    </div>
  )
}
