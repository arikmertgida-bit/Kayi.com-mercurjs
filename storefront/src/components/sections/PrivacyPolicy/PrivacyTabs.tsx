"use client"

import { useState } from "react"

const tabs = [
  {
    id: "vizyon",
    label: "Vizyon ve Veri Egemenliği",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com, kullanıcı verilerini ticari bir meta değil; dijital bir emanet ve milli bir değer olarak kabul eder.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Platformumuz, verinin toplanmasından saklanmasına kadar tüm süreçlerde &quot;Veri Egemenliği&quot; ilkesiyle hareket eder. Bu kapsamda, hiçbir yabancı servis sağlayıcısına bağımlı kalmadan, tamamen bağımsız ve yerli bir ekosistem sunmayı taahhüt eder.
        </p>
      </div>
    ),
  },
  {
    id: "stratejik",
    label: "Stratejik Veri Yerelliği",
    content: (
      <div className="space-y-5">
        <div>
          <h3 className="font-bold text-base mb-2">Yerli Altyapı:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Kayı.com bünyesinde işlenen tüm veriler, yalnızca Türkiye Cumhuriyeti sınırları içerisinde bulunan, yüksek güvenlik standartlarına sahip (Tier 3+) veri merkezlerinde barındırılır.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-base mb-2">Sınır Ötesi İzolasyonu:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Kullanıcı verileri; yabancı analiz şirketleri, reklam ağları veya yurt dışı bulut sistemleri ile paylaşılmaz. Tüm analiz ve işleme faaliyetleri, Kayı.com&apos;un kendi altyapısı ve yerli sistemleri ile gerçekleştirilir.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "veri-turleri",
    label: "İşlenen Veri Türleri ve Amaçları",
    content: (
      <div className="space-y-5">
        <p className="font-semibold text-base leading-relaxed">
          Kişisel veriler, 6698 sayılı KVKK kapsamında ve yalnızca hizmetin doğru, güvenli ve hızlı sunulması amacıyla işlenir:
        </p>
        <div>
          <h3 className="font-bold text-base mb-2">Kimlik Verileri:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Ad, soyad ve gerekli durumlarda T.C. kimlik numarası; faturalandırma, sözleşme kurulumu ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenir.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-base mb-2">İletişim ve Adres Bilgileri:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Telefon numarası, e-posta ve teslimat adresi; sipariş süreçlerinin yürütülmesi, bilgilendirme yapılması ve müşteri destek hizmetleri için kullanılır.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-base mb-2">İşlem Güvenliği Verileri:</h3>
          <p className="font-semibold text-base leading-relaxed">
            IP adresi, cihaz bilgileri ve giriş kayıtları; sistem güvenliğini sağlamak ve olası suistimalleri önlemek amacıyla işlenir.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-base mb-2">Ödeme Bilgileri:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Kart ve ödeme verileri Kayı.com sistemlerinde saklanmaz. Tüm işlemler, PCI-DSS uyumlu lisanslı ödeme kuruluşları aracılığıyla, uçtan uca şifrelenmiş şekilde gerçekleştirilir.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "paylasim",
    label: "Veri Paylaşımı ve Sorumluluk",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kişisel veriler, yalnızca hizmetin gerektirdiği ölçüde ve ilgili taraflarla sınırlı olmak üzere paylaşılır:
        </p>
        <ul className="space-y-2 pl-4">
          <li className="font-semibold text-base leading-relaxed flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
            Lojistik firmaları (teslimat süreçleri)
          </li>
          <li className="font-semibold text-base leading-relaxed flex items-start gap-2">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
            Satıcılar (siparişin tamamlanması amacıyla)
          </li>
        </ul>
        <p className="font-semibold text-base leading-relaxed">
          Pazaryerinde faaliyet gösteren satıcılar, kullanıcı verilerini yalnızca sipariş süreçleri ve yasal yükümlülükler kapsamında kullanabilir. Bu kapsam dışındaki kullanımlar KVKK ihlali sayılır ve gerekli yaptırımlar uygulanır.
        </p>
      </div>
    ),
  },
  {
    id: "guvenlik",
    label: "Teknik ve İdari Güvenlik Önlemleri",
    content: (
      <div className="space-y-5">
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com, veri güvenliğini sağlamak için hem teknik hem idari tedbirler uygular:
        </p>
        <div>
          <h3 className="font-bold text-base mb-2">Erişim Kontrolü:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Verilere erişim, &quot;minimum yetki&quot; prensibine göre sınırlandırılmıştır ve tüm erişimler kayıt altına alınır.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-base mb-2">Şifreleme Teknolojileri:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Veri iletimi ve depolama süreçlerinde AES-256 ve SSL gibi modern kriptografik yöntemler kullanılır.
          </p>
        </div>
        <div>
          <h3 className="font-bold text-base mb-2">Sistem Güvenliği:</h3>
          <p className="font-semibold text-base leading-relaxed">
            Tüm işlem ve sipariş süreçleri, güvenli altyapılar üzerinden yürütülür ve sürekli olarak izlenir.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "cerez",
    label: "Çerez (Cookie) Kullanımı",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Platformda; kullanıcı deneyimini iyileştirmek, performans analizi yapmak ve güvenliği sağlamak amacıyla çerezler kullanılır. Kullanıcılar, tarayıcı ayarları üzerinden çerez tercihlerini diledikleri zaman yönetebilir.
        </p>
      </div>
    ),
  },
  {
    id: "ileti",
    label: "Ticari Elektronik İleti",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kampanya, duyuru ve bilgilendirme içerikleri yalnızca kullanıcının açık rızası doğrultusunda gönderilir. Kullanıcılar, iletilerde yer alan çıkış bağlantısı üzerinden ileti tercihlerini istedikleri zaman değiştirebilir.
        </p>
      </div>
    ),
  },
  {
    id: "sozlesme",
    label: "Sözleşme ve Kayıtların Saklanması",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Ön bilgilendirme formu, mesafeli satış sözleşmesi ve ilgili işlem kayıtları; yasal yükümlülükler kapsamında güvenli dijital ortamlarda saklanır.
        </p>
      </div>
    ),
  },
  {
    id: "haklar",
    label: "Veri Sahibi Hakları",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kullanıcılar, KVKK&apos;nın 11. maddesi kapsamında aşağıdaki haklara sahiptir:
        </p>
        <ul className="space-y-3 pl-4">
          {[
            "Kişisel verilerinin işlenip işlenmediğini öğrenme",
            "İşlenen verilere ilişkin bilgi talep etme",
            "Verilerin düzeltilmesini veya silinmesini isteme",
            "İşleme faaliyetlerine itiraz etme",
          ].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-base leading-relaxed">
          Tüm başvurular, Kayı.com tarafından en geç 30 gün içinde sonuçlandırılır.
        </p>
      </div>
    ),
  },
]

export function PrivacyTabs() {
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
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold font-bold transition-colors ${
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
        aria-label="Politika bölümleri"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`text-left px-4 py-3 rounded-lg text-sm font-semibold font-bold transition-colors relative ${
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
