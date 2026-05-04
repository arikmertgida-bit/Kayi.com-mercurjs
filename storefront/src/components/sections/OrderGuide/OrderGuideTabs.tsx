"use client"

import { useState } from "react"

const tabs = [
  {
    id: "siparis-takibi",
    label: "1. Sipariş Takibi",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Siparişinizin güncel durumunu <strong>Hesabım &gt; Siparişlerim</strong> sayfasından kontrol edebilirsiniz. Satıcı sipariş durumunu buradan güncellemektedir.
        </p>
      </div>
    ),
  },
  {
    id: "teslimat-suresi",
    label: "2. Teslimat Süresi",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Siparişler, satıcı tarafından kargoya verildikten sonra teslimat süresi, teslimat adresinin bulunduğu il/ilçe merkezine bağlı olarak genellikle <strong>1–4 iş günü</strong> içerisinde tamamlanır.
        </p>
      </div>
    ),
  },
  {
    id: "teslimat-kontrolu",
    label: "3. Teslimat Kontrolü",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Siparişinizi teslim alırken paketi kargo görevlisi yanında kontrol etmeniz önemlidir.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Hasarlı, ezilmiş veya açılmış paketlerde <strong>&quot;Hasar Tespit Tutanağı&quot;</strong> düzenlenmesini talep ederek ürünü teslim almadan iade ediniz. Tutanak tutulmadan alınan hasarlı paketlerde süreç uzayabilir.
        </p>
      </div>
    ),
  },
  {
    id: "adres-degisikligi",
    label: "4. Adres Değişikliği",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Siparişiniz <strong>&quot;Hazırlanıyor&quot;</strong> aşamasındayken adres değişikliği için destek ekibimizle iletişime geçebilirsiniz.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Kargoya teslim edilen siparişlerde güvenlik ve operasyonel nedenlerle adres değişikliği yapılamayabilir.
        </p>
      </div>
    ),
  },
  {
    id: "kargo-ucreti",
    label: "5. Kargo Ücreti",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Belirlenen sepet tutarının altındaki siparişlerde kargo ücreti yansıtılabilir. Kampanya limitini aşan siparişlerde kargo bedeli Kayı.com tarafından karşılanabilir.
        </p>
      </div>
    ),
  },
  {
    id: "buyuk-hacimli",
    label: "6. Büyük Hacimli Ürünler",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Mobilya ve büyük hacimli ürünler, özel lojistik firmaları aracılığıyla <strong>randevulu teslim</strong> edilir.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Kurulum gerektiren ürünlerde kutu açılımı ve montaj işlemlerinin yetkili servis tarafından yapılması tavsiye edilir.
        </p>
      </div>
    ),
  },
  {
    id: "adreste-bulunmama",
    label: "7. Adreste Bulunmama",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Teslimat sırasında adreste bulunmamanız durumunda kargo firması bilgilendirme yapar.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Paket, ilgili şubeden teslim alınabilir veya ikinci dağıtım talep edilebilir.
        </p>
      </div>
    ),
  },
  {
    id: "resmi-tatiller",
    label: "8. Resmî Tatiller",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Resmî tatiller ve Pazar günleri teslimat yapılmayabilir. Dağıtımlar takip eden ilk iş günü devam eder.
        </p>
      </div>
    ),
  },
  {
    id: "yurtici-hizmet",
    label: "9. Yurtiçi Hizmet Kapsamı",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kayı.com, hizmetlerini şu an için <strong>Türkiye sınırları içerisinde</strong> sunmaktadır.
        </p>
      </div>
    ),
  },
  {
    id: "uyelik-sifre",
    label: "10. Üyelik & Şifre İşlemleri",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          <strong>&quot;Üye Ol&quot;</strong> butonu üzerinden dakikalar içinde hesap oluşturabilirsiniz.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Şifrenizi unutmanız halinde <strong>&quot;Şifremi Unuttum&quot;</strong> adımıyla güvenli şekilde yeni şifre belirleyebilirsiniz.
        </p>
      </div>
    ),
  },
  {
    id: "uyesiz-siparis",
    label: "11. Üye Olmadan Sipariş",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          <strong>&quot;Üye Olmadan Devam Et&quot;</strong> seçeneği ile sipariş oluşturabilirsiniz; ancak sipariş takibi, iade işlemleri ve destek süreçlerinin daha hızlı yürütülebilmesi için üyelik önerilir.
        </p>
      </div>
    ),
  },
  {
    id: "iade-suresi",
    label: "12. İade Süresi",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Mesafeli satış mevzuatı kapsamında standart cayma süresi <strong>14 gündür</strong>. Bu sürenin dolması halinde sistem üzerinden iade başvurusu yapılamayabilir.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Ancak ürünün ayıplı veya kusurlu olması durumunda tüketicinin ilgili mevzuattan doğan hakları saklıdır.
        </p>
      </div>
    ),
  },
  {
    id: "iade-nasil",
    label: "13. İade Nasıl Başlatılır",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Hesabınızdan <strong>Siparişlerim &gt; Sipariş Detayı &gt; İade Talebi Oluştur</strong> adımlarını izleyerek iade kodu alabilir ve ürünü anlaşmalı kargo ile gönderebilirsiniz.
        </p>
      </div>
    ),
  },
  {
    id: "iade-kosullari",
    label: "14. İade Koşulları",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">İade edilecek ürünlerin:</p>
        <ul className="space-y-2 pl-4">
          {["Kullanılmamış", "Orijinal ambalajı zarar görmemiş", "Tekrar satılabilir durumda olması gerekir"].map((item) => (
            <li key={item} className="font-semibold text-base leading-relaxed flex items-start gap-2">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
              {item}
            </li>
          ))}
        </ul>
        <p className="font-semibold text-base leading-relaxed">
          Hijyen ürünleri, gıda, yazılım/dijital içerikler ve kurulumu servis dışında yapılmış beyaz eşya gibi ürünler, ilgili mevzuat kapsamındaki istisnalar dahilinde iade kapsamı dışında değerlendirilebilir.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Satın aldığınız teknolojik ürünlerin garanti kapsamında kalması ve iade süreçlerinde sorun yaşamamanız için paket açılımını yetkili servis gözetiminde yapmanız önerilir.
        </p>
      </div>
    ),
  },
  {
    id: "ucret-iadesi",
    label: "15. Ücret İadesi",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          İade edilen ürün satıcıya ulaşıp kontrol süreci tamamlandıktan sonra geri ödeme işlemi başlatılır.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Tutar, bankanızın işlem sürelerine bağlı olarak <strong>2–10 iş günü</strong> içinde hesabınıza yansıyabilir.
        </p>
      </div>
    ),
  },
  {
    id: "siparis-fatura",
    label: "16. Sipariş ve Fatura",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          İade gönderilerinde <strong>sipariş numarasının belirtilmesi</strong> süreci hızlandırır. Kurumsal alımlarda iade faturası düzenlenmesi gerekebilir.
        </p>
      </div>
    ),
  },
  {
    id: "kampanya-indirim",
    label: "17. Kampanya & İndirim",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          İade sonrası siparişte kalan ürünler kampanya koşullarını sağlamaya devam ediyorsa indirim korunur. Aksi durumda kazanılan indirim tutarı iade bedelinden düşülebilir.
        </p>
      </div>
    ),
  },
  {
    id: "hesap-guncelleme",
    label: "18. Hesap Güncelleme",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Kişisel bilgileriniz, e-posta adresiniz ve şifreniz <strong>Hesabım &gt; Kullanıcı Bilgilerim</strong> bölümünden güncellenebilir.
        </p>
      </div>
    ),
  },
  {
    id: "uyusmazlik-cozumu",
    label: "19. Uyuşmazlık Çözümü",
    content: (
      <div className="space-y-4">
        <p className="font-semibold text-base leading-relaxed">
          Yaşanan sorunlarda öncelikle Kayı.com destek ekibiyle iletişime geçilmesi önerilir.
        </p>
        <p className="font-semibold text-base leading-relaxed">
          Çözüm sağlanamaması halinde tüketiciler, başvurularını <strong>Tüketici Hakem Heyetleri</strong> ve ilgili yasal merciler aracılığıyla iletebilir.
        </p>
      </div>
    ),
  },
]

export function OrderGuideTabs() {
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
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold tracking-wide transition-colors ${
                activeTab === i
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
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
        aria-label="Sipariş, kargo ve hesap rehberi bölümleri"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            className={`text-left px-4 py-3 rounded-lg text-sm font-bold tracking-wide transition-colors relative ${
              activeTab === i
                ? "bg-gray-900 text-white"
                : "text-gray-900 hover:bg-gray-100"
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
