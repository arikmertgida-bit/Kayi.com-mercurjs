import { useState } from "react"
import { Link } from "react-router-dom"

const tabs = [
  "Platform Statüsü ve Onay",
  "Mağaza ve Belge Gereklilikleri",
  "Ürün Standartları ve Yasaklar",
  "Stok ve Operasyon",
  "Ödeme Sistemi",
  "İade ve Uyuşmazlık Yönetimi",
  "KVKK ve Gizlilik",
  "Sistem Güvenliği",
  "Platform İtibarı ve Yaptırımlar",
  "Onay ve Yürürlük",
  "Komisyon Tablosu",
]

const tabContents: React.ReactNode[] = [
  // 0 - Platform Statüsü ve Onay
  <div key="0" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Platform Statüsü ve Onay Süreci</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">1.1 Satıcı Başvurusu</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Kayı.com platformunda satıcı olabilmek için iş ortaklığı başvurusunun eksiksiz ve doğru bilgilerle doldurulması gerekmektedir. Eksik veya yanıltıcı bilgi içeren başvurular değerlendirmeye alınmaz ve reddedilebilir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">1.2 Onay Süreci</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Başvurunuz Kayı.com ekibi tarafından incelenir. Bu süreçte başvuru sahibinden ek belge veya bilgi talep edilebilir. Başvuruların değerlendirilme süresi 3-7 iş günüdür. Kayı.com, başvuruyu onaylama veya reddetme konusunda münhasır hak sahibidir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">1.3 Deneme Süreci</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Onaylanan satıcılar, ilk 90 gün boyunca deneme statüsünde faaliyet gösterir. Bu süreçte satıcı performansı, müşteri memnuniyeti ve platform kurallarına uyum değerlendirilir. Deneme sürecinde belirlenen kriterleri karşılamayan satıcıların üyeliği sonlandırılabilir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">1.4 Platform Statüsünün Sona Ermesi</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcının kendi isteğiyle platformdan ayrılması, platform kurallarının ihlal edilmesi veya Kayı.com'un platformun işleyişini değiştirmesi durumlarında satıcı statüsü sona erdirilir. Statü sona ermesinden önce açık siparişlerin tamamlanması zorunludur.
        </p>
      </div>
    </div>
  </div>,

  // 1 - Mağaza ve Belge Gereklilikleri
  <div key="1" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Mağaza ve Belge Gereklilikleri</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">2.1 Zorunlu Belgeler</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Tüm satıcıların platforma kaydolurken geçerli ticaret sicil kaydı, vergi levhası, imza sirküleri ve banka hesap bilgilerini sunması zorunludur. Bireysel satıcılar için kimlik belgesi ve vergi kimlik numarası gereklidir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">2.2 Mağaza Profili</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, mağaza adını, logosunu ve açıklamasını eksiksiz ve doğru biçimde doldurmalıdır. Yanıltıcı veya başkasına ait marka unsurlarını taklit eden mağaza profilleri derhal kaldırılır. Mağaza görselleri en az 400×400 piksel çözünürlüğünde olmalıdır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">2.3 Belge Güncelleme</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Belgelerde değişiklik olması durumunda (adres değişikliği, unvan değişikliği vb.) satıcı, değişiklikten itibaren 15 iş günü içinde güncelleme yapmakla yükümlüdür. Güncel tutulmayan belgeler nedeniyle yaşanan ödemeler ve hizmetler gibi aksaklıkların sorumluluğu satıcıya aittir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">2.4 Belge Doğrulaması</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Kayı.com, sunulan belgelerin doğruluğunu üçüncü taraf hizmetler veya resmi kurumlar aracılığıyla doğrulama hakkını saklı tutar. Sahte belge sunulması kesinlikle yasak olup tespit edilmesi durumunda üyelik derhal sonlandırılır ve yasal yollara başvurulur.
        </p>
      </div>
    </div>
  </div>,

  // 2 - Ürün Standartları ve Yasaklar
  <div key="2" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Ürün Standartları ve Yasaklar</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">3.1 Ürün Listesi Gereklilikleri</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Tüm ürünler, gerçeği yansıtan yüksek çözünürlüklü görseller (minimum 800×800 px), tam ve doğru ürün açıklamaları, fiyat, stok durumu ve kargo bilgilerini içermelidir. Yanıltıcı başlık veya açıklama içeren ürünler kaldırılır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">3.2 Yasaklı Ürünler</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Türk hukukuna göre satışı yasak olan ürünler, sahte veya kopyası ürünler, lisanssız ilaç ve tıbbi ürünler, ateşli silah ve aksesuarları, tehlikeli kimyasallar, açık yetişkin içerikleri ve hayvan hakları ihlali içeren ürünler platformda satışa sunamaz.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">3.3 Telif Hakkı ve Marka</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar yalnızca kendi mülkiyetinde olan ya da lisanslı oldukları ürünleri satabilir. Telif hakkı ihlali tespitinde söz konusu ürün derhal yayından kaldırılır, satıcıya uyarı verilir ve tekrarında üyelik askıya alınır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">3.4 Ürün Güvenliği</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satışa sunulan tüm ürünler, Türk Standartları Enstitüsü (TSE) ve ilgili AB direktiflerine uygun olmalıdır. Güvenlik belgesi gerektiren ürünler (oyuncak, elektronik, gıda vb.) için ilgili belgeler sisteme yüklenmelidir.
        </p>
      </div>
    </div>
  </div>,

  // 3 - Stok ve Operasyon
  <div key="3" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Stok ve Operasyon</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">4.1 Stok Yönetimi</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, platformda listelenen ürünlerin gerçek zamanlı stok durumunu yönetmekten sorumludur. Stokta olmayan ürünlerin 24 saat içinde yayından kaldırılması veya deaktif edilmesi gerekmektedir. Tekrarlayan stok tutarsızlıkları hesap askıya alınmasına yol açabilir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">4.2 Sipariş Karşılama Süreleri</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Tüm siparişler onaylanmasından itibaren en geç 2 iş günü içinde kargoya verilmelidir. Kargoya verme bilgisinin (takip numarası) sisteme girilmesi zorunludur. Bu sürenin sistematik olarak aşılması, satıcı puanını olumsuz etkiler ve hesap kısıtlamasına yol açabilir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">4.3 Paketleme Standartları</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Ürünler, hasarsız ve hijyenik biçimde paketlenerek kargoya verilmelidir. Kırılabilir ürünler için uygun koruyucu ambalaj kullanılması zorunludur. Kötü ambalaj nedeniyle hasarlı ulaşan ürünlerin iade masrafları satıcıya yansıtılır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">4.4 Müşteri İletişimi</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, müşterilerden gelen mesajlara 24 saat içinde yanıt vermekle yükümlüdür. Platform üzerinden gerçekleştirilen tüm iletişimler kayıt altına alınır. Müşteri şikayetlerinin 48 saat içinde çözüme kavuşturulması beklenmektedir.
        </p>
      </div>
    </div>
  </div>,

  // 4 - Ödeme Sistemi
  <div key="4" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Ödeme Sistemi</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">5.1 Ödeme Takvimine</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcı ödemeleri, teslim onayından itibaren 7 iş günü içinde iade/uyuşmazlık süresi geçmişse gerçekleştirilir. Ödemeler, kayıt sırasında bildirilen IBAN numarasına yapılır. Hatalı IBAN girişinden doğan ödeme sorunlarının sorumluluğu satıcıya aittir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">5.2 Komisyon Kesintileri</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Her satıştan, ürünün bağlı olduğu kategoriye göre belirlenen komisyon oranı KDV dahil olarak kesilir. Komisyon oranları Komisyon Tablosu sekmesinde detaylı şekilde belirtilmiştir. Kayı.com, komisyon oranlarını 30 gün önceden bildirmek koşuluyla değiştirme hakkını saklı tutar.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">5.3 Platform Dışı Satış Yasağı</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, Kayı.com üzerinden tanışılan müşterileri platform dışına yönlendirerek satış yapmaktan kaçınmalıdır. Bu tür işlemler tespit edildiğinde önce uyarı, ardından üyelik askıya alma ve son olarak üyelik sonlandırma yaptırımı uygulanır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">5.4 Fatura ve Vergi Yükümlülüğü</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Her satış için yasal ödeme belgesi (fatura, e-fatura veya e-arşiv fatura) düzenlemek satıcının sorumluluğundadır. KDV ve diğer yasal yükümlülüklerin yerine getirilmesinden satıcı münhasıran sorumludur.
        </p>
      </div>
    </div>
  </div>,

  // 5 - İade ve Uyuşmazlık Yönetimi
  <div key="5" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">İade ve Uyuşmazlık Yönetimi</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">6.1 İade Politikası</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, teslimattan itibaren 14 günlük yasal iade hakkını tüm ürünlerde kabul etmekle yükümlüdür. İade sürecinin başlatılmasından itibaren 5 iş günü içinde müşteriye geri ödeme yapılması gerekmektedir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">6.2 Hasarlı veya Hatalı Ürün</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Hasarlı, hatalı veya tanımlanandan farklı ulaşan ürünlerin iade ve değişim masrafları satıcıya aittir. Müşteri, hasarlı ürünü fotoğraflayarak 3 gün içinde bildirmelidir. Satıcı, bildirimi aldıktan sonra 24 saat içinde çözüm sunmalıdır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">6.3 Uyuşmazlık Süreci</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcı ile alıcı arasında çözülemeyen uyuşmazlıklarda Kayı.com arabuluculuk rolü üstlenir. Her iki tarafın kanıtlarını inceledikten sonra Kayı.com kararı bağlayıcıdır. Yanlış bulunan tarafın ödeme veya iadesinden Kayı.com sorumlu tutulamaz.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">6.4 Sahte Uyuşmazlık</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Haksız kazanç amacıyla açılan sahte uyuşmazlıklar platform güvenlik sistemleri tarafından izlenir. Bu tür davranışların tespitinde hem alıcı hem de satıcı hesabı incelemeye alınır ve gerektiğinde kapatılır.
        </p>
      </div>
    </div>
  </div>,

  // 6 - KVKK ve Gizlilik
  <div key="6" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">KVKK ve Gizlilik</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">7.1 Kişisel Veri Sorumluluğu</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, Kayı.com aracılığıyla edindikleri müşteri kişisel verilerini (ad, adres, telefon, e-posta vb.) yalnızca ilgili siparişin işlenmesi amacıyla kullanabilir. Bu verilerin üçüncü taraflarla paylaşımı, ticari amaçla kullanımı veya Kayı.com sistemi dışında depolanması kesinlikle yasaktır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">7.2 6698 Sayılı Kanun Uyumu</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, 6698 Sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamındaki tüm yükümlülüklere uymakla sorumludur. KVKK ihlali nedeniyle doğan idari para cezaları ve hukuki sorumluluklar münhasıran satıcıya aittir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">7.3 Veri Güvenliği</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, hesap erişim bilgilerini (kullanıcı adı, şifre, API anahtarı vb.) güvenli biçimde saklamak ve üçüncü kişilerle paylaşmamakla yükümlüdür. Hesap bilgilerinin izinsiz kullanımı durumunda hemen Kayı.com'a bildirim yapılmalıdır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">7.4 Çerez ve İzleme</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Kayı.com, platform üzerindeki satıcı ve alıcı davranışlarını yasal sınırlar içinde izleyebilir ve analitik amaçlarla kullanabilir. Bu veriler; platform iyileştirmeleri, dolandırıcılık tespiti ve müşteri deneyiminin geliştirilmesi amacıyla işlenir.
        </p>
      </div>
    </div>
  </div>,

  // 7 - Sistem Güvenliği
  <div key="7" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Sistem Güvenliği</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">8.1 Hesap Güvenliği</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar, hesaplarını güçlü ve benzersiz şifreler kullanarak korumalıdır. İki faktörlü kimlik doğrulama (2FA) kullanımı şiddetle tavsiye edilir. Hesabın başka kişilere devredilmesi veya paylaşılması yasaktır; bu durumda hesap askıya alınır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">8.2 Kötüye Kullanım Yasağı</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Platforma zarar verebilecek botlar, otomatik araçlar veya kötü amaçlı yazılım kullanmak yasaktır. Stok ve fiyat bilgilerinin izinsiz toplu olarak çekilmesi (scraping) dahil her türlü sistem istismarı hesabın derhal kapatılmasına yol açar.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">8.3 API Kullanımı</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Kayı.com API'lerine erişim yalnızca onaylı entegrasyon amaçlarıyla gerçekleştirilebilir. API anahtarları başkalarıyla paylaşılamaz. API kullanım limitleri aşıldığında sistem otomatik olarak erişimi kısıtlar. Kasıtlı aşım girişimleri üyelik feshiyle sonuçlanır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">8.4 Güvenlik İhlali Bildirimi</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Hesap güvenliğinin tehlikeye girdiğini fark eden satıcılar, bu durumu derhal destek ekibine bildirmelidir. Zamanında bildirim yapılmamasından kaynaklanacak kayıplar satıcının sorumluluğunda kabul edilir.
        </p>
      </div>
    </div>
  </div>,

  // 8 - Platform İtibarı ve Yaptırımlar
  <div key="8" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Platform İtibarı ve Yaptırımlar</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">9.1 Satıcı Puanlama Sistemi</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Satıcılar; zamanında kargo, müşteri memnuniyeti, iade oranı ve yanıt hızı gibi kriterlerle otomatik olarak puanlanır. Performans puanı belirli bir seviyenin altına düşen satıcılara uyarı gönderilir. Süregelen düşük performans hesap kısıtlamasına yol açar.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">9.2 Yorum ve Değerlendirme Manipülasyonu</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Sahte yorum yazmak, olumsuz yorumları silmeye zorlamak veya yapay değerlendirme artırmak kesinlikle yasaktır. Bu ihlallerin tespitinde satıcının tüm yorumları kaldırılabilir ve hesap kalıcı olarak kapatılabilir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">9.3 Yaptırım Kademeleri</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Kural ihlalleri için uygulanacak yaptırımlar şu şekilde kademelenir: (1) Yazılı uyarı, (2) Ürün yayından kaldırma, (3) Hesap geçici askıya alma, (4) Hesap kalıcı kapatma. Ağır ihlaller (dolandırıcılık, KVKK ihlali vb.) doğrudan hesap kapatma ile sonuçlanır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">9.4 İtiraz Hakkı</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Yaptırım kararlarına karşı itiraz süreci 5 iş günü içinde başlatılmalıdır. İtirazlar, destek kanalı üzerinden yazılı olarak iletilir. Kayı.com itirazı inceleyerek 10 iş günü içinde sonuçlandırır ve sonuç satıcıya yazılı olarak bildirilir.
        </p>
      </div>
    </div>
  </div>,

  // 9 - Onay ve Yürürlük
  <div key="9" className="space-y-6">
    <h2 className="text-2xl font-bold text-ui-fg-base">Onay ve Yürürlük</h2>
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">10.1 Sözleşmenin Kabulü</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Kayı.com Satıcı İş Ortaklığı ve Kullanım Esasları belgesi, kayıt formundaki ilgili kutucuk işaretlenerek dijital olarak imzalanır. Bu kabul, sözleşmenin tüm maddeleriyle bağlayıcı olduğu anlamına gelir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">10.2 Sözleşme Güncellemeleri</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Kayı.com, bu sözleşmeyi 30 gün önceden satıcılara e-posta ve platform bildirimi aracılığıyla duyurmak koşuluyla güncelleme hakkını saklı tutar. Güncelleme tarihinden sonra platforma devam eden satıcı, yeni sözleşme koşullarını kabul etmiş sayılır.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">10.3 Yetkili Mahkeme ve Hukuk</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Bu sözleşmeden doğacak uyuşmazlıklarda Türk Hukuku uygulanır ve İstanbul (Çağlayan) Mahkemeleri ile İcra Daireleri yetkilidir. Satıcı, bu yetki ve hukuk seçimine peşinen rıza göstermektedir.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-ui-fg-base mb-1">10.4 Yürürlük Tarihi</h3>
        <p className="text-sm text-ui-fg-subtle leading-relaxed">
          Bu sözleşme 01 Mayıs 2026 tarihinde yürürlüğe girmiştir ve bu tarihten itibaren yapılacak tüm kayıtlar için geçerlidir. Önceki sözleşme versiyonları, bu tarihten itibaren hükümsüz sayılır.
        </p>
      </div>
    </div>
  </div>,

  // 10 - Komisyon Tablosu
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
                  "px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors rounded-t-md",
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
