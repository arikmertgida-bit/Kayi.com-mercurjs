
import { useState } from "react"
import { Link } from "react-router-dom"

const tabs = [
  "Platform Statüsü",
  "Mağaza & Belge",
  "Ürün Standartları",
  "Stok ve Operasyon",
  "Ödeme Sistemi",
  "İade & Uyuşmazlık",
  "KVKK & Gizlilik",
  "Sistem Güvenliği",
  "Platform İtibarı",
  "Onay ve Yürürlük",
  "Komisyon Tablosu",
]

const tabContents = [
  <div key="0" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Platform Statüsü</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Kayı.com, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında Aracı Hizmet Sağlayıcı statüsündedir.<br />
        Platform, satıcılar ile alıcılar arasında güvenli bir köprü kurar.<br />
        Listelenen ürünlerin mülkiyeti satıcıya ait olup; ürünlere ilişkin tüm hukuki, teknik ve ticari sorumluluk (garanti, faturalandırma, ayıplı mal vb.) doğrudan ilgili satıcıya aittir.
      </p>
    </div>
  </div>,
  <div key="1" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Mağaza & Belge</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Satıcılar, Türkiye Cumhuriyeti mevzuatına uygun şekilde yasal vergi mükellefi olduklarını ve ticari faaliyet yürütme yetkisine sahip olduklarını beyan ederler.<br />
        Kayı.com, üyelik aşamasında veya sonrasında satıcılardan faaliyet belgesi, imza sirküleri, vergi levhası ve gerekli yetki belgelerini talep etme hakkını saklı tutar.
      </p>
    </div>
  </div>,
  <div key="2" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Ürün Standartları</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Sahte, taklit, kaçak veya mevzuata aykırı ürün satışı kesinlikle yasaktır.<br />
        Fikri ve sınai mülkiyet haklarını ihlal eden ürünlerin tespiti halinde Kayı.com; mağazayı tek taraflı feshetme, hakedişleri bloke etme ve oluşabilecek marka itibar kaybı tazminatı için yasal yollara başvurma hakkına sahiptir.
      </p>
    </div>
  </div>,
  <div key="3" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Stok ve Operasyon</h2>
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-ui-fg-base mb-1">Stok Yönetimi:</h3>
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Satıcı, platformdaki stok bilgilerini güncel tutmakla yükümlüdür.<br />
        Geçersiz stok beyanı nedeniyle iptal edilen siparişler satıcı performans puanını etkiler.
      </p>
      <h3 className="text-base font-semibold text-ui-fg-base mb-1">Lojistik Süreçleri:</h3>
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Siparişler, mağaza panelinde taahhüt edilen yasal süreler içinde kargoya verilmelidir.<br />
        Gecikmeli gönderimler ve hatalı paketleme kaynaklı zararlar satıcının sorumluluğundadır.
      </p>
    </div>
  </div>,
  <div key="4" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Ödeme Sistemi</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Ödemeler, Kayı.com’un anlaşmalı olduğu lisanslı ödeme kuruluşları nezdindeki Güvenli Havuz Hesabı‘nda toplanır.<br />
        Teslimatın onaylanması ve yasal itiraz sürelerinin tamamlanmasının ardından, belirlenen komisyon ve hizmet bedelleri düşülerek satıcının beyan ettiği IBAN hesabına aktarılır.
      </p>
    </div>
  </div>,
  <div key="5" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">İade & Uyuşmazlık</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Satıcı, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca alıcının sahip olduğu 14 günlük cayma hakkını ve diğer tüm yasal haklarını peşinen kabul eder.<br />
        İade süreçleri, platformun belirlediği operasyonel kurallar çerçevesinde yürütülür.
      </p>
    </div>
  </div>,
  <div key="6" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">KVKK & Gizlilik</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Satıcı, kendisine iletilen alıcı verilerini “Kişisel Bilgiler: İsim, Soyisim, Adres, Telefon ve E-posta” sadece sipariş teslimatı amacıyla kullanabilir.<br />
        Bu verilerin platform dışı ticari faaliyetlerde kullanılması veya üçüncü şahıslarla paylaşılması KVKK kapsamında ağır ihlal sayılır ve sözleşmenin derhal feshine yol açar.
      </p>
    </div>
  </div>,
  <div key="7" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Sistem Güvenliği</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Satıcı, şifre güvenliğini sağlamakla yükümlüdür.<br />
        KVKK ve 6563 s. Kanun gereği veri erişim sorumluluğu satıcıya aittir.
      </p>
    </div>
  </div>,
  <div key="8" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Platform İtibarı</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Satıcı, platform içi tüm iletişiminde ve ticari faaliyetlerinde genel ahlak kurallarına ve Kayı.com iş etiği standartlarına uygun hareket etmelidir.<br />
        Platformun ticari itibarına zarar verecek eylemlerde bulunulması durumunda Kayı.com, sözleşmeyi tek taraflı olarak feshetme hakkını saklı tutar.
      </p>
    </div>
  </div>,
  <div key="9" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Onay ve Yürürlük</h2>
    <div className="space-y-4">
      <p className="text-sm text-ui-fg-subtle leading-relaxed">
        Kayı.com üzerinde mağaza kaydını başlatan ve “Satıcı İş Ortaklığı ve Kullanım Esaslarını Kabul Ediyorum” kutucuğunu işaretleyen her satıcı, yukarıda belirtilen tüm şartları, kuralları ve ek protokolleri hiçbir kısıtlama olmaksızın okumuş, anlamış ve kabul etmiş sayılır.<br />
        Bu onay, taraflar arasında dijital imza hükmünde olup kayıt anından itibaren yürürlüğe girer.
      </p>
    </div>
  </div>,
  <div key="10" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Komisyon Tablosu</h2>
    <p className="text-sm text-ui-fg-subtle">
      Aşağıdaki tablo, her ürün kategorisi için uygulanan net komisyon oranlarını ve KDV dahil toplam oranları göstermektedir. Komisyon tutarları satış bedeli üzerinden hesaplanır.
    </p>
    <div className="overflow-x-auto rounded-lg border border-ui-border-base">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-ui-bg-base border-b border-ui-border-base">
            <th className="px-4 py-3 text-left font-semibold text-ui-fg-base">Kategori</th>
            <th className="px-4 py-3 text-center font-semibold text-ui-fg-base">Net Komisyon (%)</th>
            <th className="px-4 py-3 text-center font-semibold text-ui-fg-base">KDV (%)</th>
            <th className="px-4 py-3 text-center font-semibold text-ui-fg-base">Toplam KDV Dahil (%)</th>
          </tr>
        </thead>
        <tbody>
          {[
            { category: "Kadın Moda", net: 10, kdv: 20, total: 12 },
            { category: "Erkek Moda", net: 10, kdv: 20, total: 12 },
            { category: "Elektronik", net: 10, kdv: 20, total: 12 },
            { category: "Anne & Çocuk", net: 10, kdv: 20, total: 12 },
            { category: "Ev & Yaşam", net: 10, kdv: 20, total: 12 },
            { category: "Süpermarket", net: 4, kdv: 20, total: 4.8 },
            { category: "Kozmetik", net: 10, kdv: 20, total: 12 },
            { category: "Ayakkabı & Çanta", net: 14, kdv: 20, total: 16.8 },
            { category: "Spor & Outdoor", net: 14, kdv: 20, total: 16.8 },
            { category: "Kitap & Hobi", net: 4, kdv: 20, total: 4.8 },
            { category: "Oto & Motosiklet", net: 10, kdv: 20, total: 12 },
            { category: "Özel Yaşam", net: 20, kdv: 20, total: 24 },
          ].map((row, i) => (
            <tr
              key={row.category}
              className={i % 2 === 0 ? "bg-ui-bg-subtle" : "bg-ui-bg-base"}
            >
              <td className="px-4 py-3 font-medium text-ui-fg-base">{row.category}</td>
              <td className="px-4 py-3 text-center text-ui-fg-subtle">%{row.net}</td>
              <td className="px-4 py-3 text-center text-ui-fg-subtle">%{row.kdv}</td>
              <td className="px-4 py-3 text-center font-semibold text-ui-fg-base">%{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-ui-fg-muted">
      * Komisyon oranları KDV hariç net satış bedeli üzerinden hesaplanır. Kayı.com, oranları 30 gün önceden bildirmek kaydıyla değiştirme hakkını saklı tutar. Son güncelleme: 01 Mayıs 2026.
    </p>
  </div>,
]

export const SellerAgreement = () => {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="bg-ui-bg-subtle min-h-dvh">
      <div className="px-6 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            to="/register"
            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors text-sm font-medium inline-flex items-center gap-1"
          >
            ← Kayıt Sayfasına Dön
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ui-fg-base leading-tight mb-2">
            Kayı.com Satıcı İş Ortaklığı ve Kullanım Esasları
          </h1>
          <p className="text-sm font-bold text-ui-fg-subtle">
            Son Güncelleme: 01 Mayıs 2026
          </p>
        </div>

        {/* Tab navigation */}
        <div className="overflow-x-auto mb-6">
          <div className="flex gap-1 min-w-max border-b border-ui-border-base pb-0">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={[
                  "px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors rounded-t-md",
                  activeTab === index
                    ? "bg-ui-bg-base text-ui-fg-base border border-b-0 border-ui-border-base"
                    : "text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-base/50",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-ui-bg-base rounded-lg border border-ui-border-base p-6">
          {tabContents[activeTab]}
        </div>
      </div>
    </div>
  )
}
