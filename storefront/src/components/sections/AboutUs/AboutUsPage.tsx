import Image from "next/image"

/* ─────────────────────────────────────────────
   Küçük yardımcı bileşenler
───────────────────────────────────────────── */

function SectionBadge({ label }: { label: string }) {
  return (
    <span className="inline-block text-xs font-bold tracking-widest uppercase text-amber-400 mb-4 border border-amber-400/40 px-3 py-1 rounded-full">
      {label}
    </span>
  )
}

function Divider({ light }: { light?: boolean }) {
  return (
    <div className={`w-16 h-1 rounded-full mx-auto mt-4 mb-6 ${light ? "bg-amber-400" : "bg-gray-900"}`} />
  )
}

/* ─────────────────────────────────────────────
   1. HERO
───────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative bg-gray-950 overflow-hidden">
      {/* Arka plan deseni */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #d97706 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1d4ed8 0%, transparent 50%)",
          }}
        />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center py-12 px-6 text-center">
        <SectionBadge label="Hakkımızda" />
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
          İLKELERİMİZ VE YOLUMUZ
        </h1>
        <div className="w-24 h-1 bg-amber-400 rounded-full my-6" />
        <p className="text-2xl md:text-3xl font-extrabold text-gray-100 max-w-2xl leading-snug">
          Kayı.com&nbsp;—&nbsp;Tam Bağımsız Yerli Pazar Yeri
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   2. BİZ KİMİZ
───────────────────────────────────────────── */
function WhoWeAreSection() {
  return (
    <section>
      {/* Tam genişlik görsel */}
      <div className="relative w-full h-[260px] md:h-[400px] overflow-hidden">
        <Image
          src="/images/about/biz-kimiz.jpeg"
          alt="Biz Kimiz ve Neden Buradayız"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        {/* Üst soluk overlay + başlık */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-gray-950/20 to-transparent flex items-end justify-center pb-10">
          <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg text-center px-4">
            Biz Kimiz ve Neden Buradayız?
          </h2>
        </div>
      </div>

      {/* Metin */}
      <div className="bg-white py-16 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-5">
          <p className="text-base md:text-lg text-gray-700 font-medium leading-relaxed">
            Kayı.com, köklerinden güç alan; <strong className="text-gray-900">güven, adalet ve sorumluluk</strong> temelli bir anlayışla kurulmuş yerli bir pazaryeridir.
          </p>
          <p className="text-base md:text-lg text-gray-700 font-medium leading-relaxed">
            Bizim için ticaret yalnızca ürün alışverişi değil; emeğe saygı, verilen sözün tutulması ve karşılıklı güvenin korunmasıdır.
          </p>
          <p className="text-base md:text-lg text-gray-700 font-medium leading-relaxed">
            Dijital dünyanın hızını, geleneksel ticaretin sağlam dürüstlük ilkeleriyle birleştirerek alıcı ile satıcıyı yalnızca bir platformda değil, <strong className="text-gray-900">adil bir zeminde</strong> buluşturuyoruz.
          </p>

          <div className="pt-6">
            <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-4">Amacımız</p>
            <ul className="space-y-3">
              {[
                "Satıcının emeğinin değersizleşmediği,",
                "Alıcının muhatapsız kalmadığı,",
                "Şeffaf ve hakkaniyetli bir ticaret ekosistemi kurmak.",
              ].map((item) => (
                <li key={item} className="flex items-start justify-center gap-3 text-gray-800 font-semibold text-base">
                  <span className="mt-2 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   3. NEDEN KAYI.COM
───────────────────────────────────────────── */
const nedenItems = [
  {
    title: "Bağımsız Sermaye, Yerli Gelecek",
    body: "Kayı.com, sermaye yapısı ve vizyonu itibarıyla yerli bir girişimdir. Platformda oluşan ekonomik değer, bu toprakların ticari hayatına katkı sağlamayı hedefler.",
  },
  {
    title: "Değer Burada Üretilir, Burada Büyür",
    body: "Bu platformda gerçekleşen her alışveriş; yerli girişimcinin emeğini büyütür, ülke ekonomisine katkı sağlar. Bizimle yürümek, adil ve bağımsız ticaret anlayışını desteklemektir.",
  },
  {
    title: "Sorumluluk Odaklı Yapı",
    body: "Kayı.com kısa vadeli kazanç hedefiyle değil, uzun vadeli güven inşası amacıyla yapılandırılmıştır. Büyüme anlayışımızın merkezinde sürdürülebilirlik ve kurumsal sorumluluk bulunur.",
  },
  {
    title: "Söylem Değil, Duruş",
    body: "Yerel üreticiyi ve girişimciyi desteklemek bir pazarlama dili değil; platformun kuruluş felsefesidir.",
  },
]

function WhySection() {
  return (
    <section className="bg-gray-950 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <SectionBadge label="Neden Biz" />
          <h2 className="text-3xl md:text-4xl font-black text-white">Neden Kayı.com?</h2>
          <Divider light />
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-center">
          {/* Görsel */}
          <div className="w-full lg:w-2/5 shrink-0">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ aspectRatio: "4/3" }}>
              <Image
                src="/images/about/neden-kayi.jpeg"
                alt="Neden Kayı.com"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
            {nedenItems.map((item) => (
              <div
                key={item.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-1 bg-amber-400 rounded-full mb-4" />
                <h3 className="text-white font-bold text-base mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   4. TEMEL DEĞERLERİMİZ
───────────────────────────────────────────── */
const values = [
  {
    icon: "🤝",
    title: "Güven",
    body: "Ticaretin özü güvendir. Kullanıcılarımız platformda her zaman ulaşılabilir ve sorumluluk sahibi bir yapı ile karşılaşır.",
  },
  {
    icon: "⚖️",
    title: "Adalet",
    body: "Büyüklüğe değil, haklı olana göre hareket eden bir sistem anlayışını benimsiyoruz.",
  },
  {
    icon: "🇹🇷",
    title: "Yerlilik ve Aidiyet",
    body: "Kayı.com bu topraklara aittir; ekonomik ve toplumsal sorumluluğunu burada taşır.",
  },
  {
    icon: "🔍",
    title: "Şeffaflık",
    body: "Belirsiz süreçler, gizli şartlar ve anlaşılmaz uygulamalar platform anlayışımıza aykırıdır.",
  },
  {
    icon: "🛡️",
    title: "Sorumluluk",
    body: "Sunduğumuz hizmetin güvenli ve dengeli işlemesi için sistemsel sorumluluk üstleniriz.",
  },
  {
    icon: "🌱",
    title: "Sürdürülebilirlik",
    body: "Hızlı büyüme yerine sağlam ve kalıcı bir yapı kurmayı tercih ederiz.",
  },
]

function ValuesSection() {
  return (
    <section className="bg-gray-950 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 items-center mb-14">
          {/* Görsel */}
          <div className="w-full lg:w-2/5 shrink-0">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ aspectRatio: "4/3" }}>
              <Image
                src="/images/about/temel-degerlerimiz.jpeg"
                alt="Temel Değerlerimiz"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </div>
          {/* Başlık + açıklama */}
          <div className="flex-1 text-center lg:text-left">
            <SectionBadge label="Değerlerimiz" />
            <h2 className="text-3xl md:text-4xl font-black text-white">Temel Değerlerimiz</h2>
            <Divider light />
            <p className="text-gray-400 text-base leading-relaxed font-medium">
              Kayı.com'un her kararının ve her uygulamasının arkında duran altı temel değer, platformun kuruluşundan bu yana değişmeden varlığını sürdürmektedir.
            </p>
          </div>
        </div>
      </div>

      {/* Kartlar */}
      <div className="pb-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {values.map((v) => (
            <div
              key={v.title}
              className="bg-white/5 border border-white/10 rounded-2xl p-7 hover:bg-white/10 hover:-translate-y-1 transition-all"
            >
              <span className="text-3xl mb-4 block">{v.icon}</span>
              <h3 className="text-white font-extrabold text-lg mb-2">{v.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   5. MİSYONUMUZ
───────────────────────────────────────────── */
function MissionSection() {
  return (
    <section className="bg-gray-950 py-20 px-6">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-12 items-center">
        {/* Metin */}
        <div className="flex-1 text-center lg:text-left">
          <SectionBadge label="Misyon" />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Misyonumuz</h2>
          <div className="w-16 h-1 bg-amber-400 rounded-full mb-8 mx-auto lg:mx-0" />
          <div className="space-y-4 text-gray-300 text-base leading-relaxed font-medium">
            <p>
              Kayı.com&apos;un misyonu; dijital ticarette güveni soyut bir kavram olmaktan çıkarıp, her işlemde hissedilen <strong className="text-white">somut bir ilke</strong> haline getirmektir.
            </p>
            <p>
              Satıcının emeğini koruyan, alıcının hakkını savunan ve uyuşmazlıklarda adil süreçler işleten bir sistem kurmak temel görevimizdir.
            </p>
            <div className="pt-4 border-t border-white/10 space-y-2">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-400 mb-3">Biz;</p>
              {[
                "Hız uğruna adaletten,",
                "Kazanç uğruna güvenilirlikten,",
                "Büyüme uğruna ilkelerden taviz vermemeyi tercih ederiz.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Görsel */}
        <div className="w-full lg:w-2/5 shrink-0">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10" style={{ aspectRatio: "4/3" }}>
            <Image
              src="/images/about/misyonumuz.jpeg"
              alt="Misyonumuz"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   6. VİZYONUMUZ
───────────────────────────────────────────── */
function VisionSection() {
  return (
    <section className="bg-white py-20 px-6">
      <div className="max-w-6xl mx-auto flex flex-col-reverse lg:flex-row gap-12 items-center">
        {/* Görsel */}
        <div className="w-full lg:w-2/5 shrink-0">
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-100" style={{ aspectRatio: "4/3" }}>
            <Image
              src="/images/about/vizyonumuz.jpeg"
              alt="Vizyonumuz"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
        </div>

        {/* Metin */}
        <div className="flex-1 text-center lg:text-left">
          <SectionBadge label="Vizyon" />
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">Vizyonumuz</h2>
          <div className="w-16 h-1 bg-gray-900 rounded-full mb-8 mx-auto lg:mx-0" />
          <div className="space-y-4 text-gray-700 text-base leading-relaxed font-medium">
            <p>
              Kayı.com&apos;un vizyonu; dijital ticarette güveni bir ayrıcalık olmaktan çıkarıp <strong className="text-gray-900">standart haline getirmektir.</strong>
            </p>
            <p>
              Hukuka uygunluğun kural olduğu, şeffaflığın temel ilke sayıldığı ve kullanıcıların hak arama konusunda kendini güvende hissettiği bir dijital ticaret düzeni inşa etmeyi hedefliyoruz.
            </p>
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <p className="text-sm font-bold uppercase tracking-widest text-amber-600 mb-3">Uzun Vadeli Hedefimiz</p>
              {[
                "\"En büyük\" platform olmak değil,",
                "En güvenilen ve sözüne itibar edilen platform olarak anılmaktır.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   7. HİKAYE — Kurucudan Mesaj
───────────────────────────────────────────── */
function StorySection() {
  return (
    <section className="bg-gray-950 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <SectionBadge label="Hikayemiz" />
          <h2 className="text-3xl md:text-4xl font-black text-white">Kayı.com&apos;un Hikayesi</h2>
          <Divider light />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Ahmet Arıkmert */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/8 transition-colors">
            <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-amber-400/60 mb-6 shrink-0">
              <Image
                src="/images/about/ahmet-arikmert.jpeg"
                alt="Ahmet Arıkmert"
                fill
                className="object-cover object-top"
                sizes="128px"
              />
            </div>
            <div className="text-amber-400 text-4xl leading-none mb-4">&ldquo;</div>
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-medium">
              Dijital ticaretin giderek mekanikleştiği bir dönemde, biz insanı, emeği ve ticaret ahlakını merkeze alarak yola çıktık. Kayı.com, yalnızca bir ticaret platformu değil; güven, şeffaflık ve sorumluluk üzerine kurulmuş yerli bir pazaryeridir. Amacımız kısa vadeli kazançlar değil, uzun vadeli güven ve itibardır.
            </p>
            <div className="mt-auto pt-6 border-t border-white/10 w-full">
              <p className="text-white font-extrabold text-base">Ahmet ARIKMERT</p>
              <p className="text-amber-400 text-xs font-semibold mt-1 uppercase tracking-widest">
                Kayı.com Kurucusu ve Yönetim Kurulu Başkanı
              </p>
            </div>
          </div>

          {/* H. Enes Arıkmert */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/8 transition-colors">
            <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-amber-400/60 mb-6 shrink-0">
              <Image
                src="/images/about/henes-arikmert.jpeg"
                alt="Halit Enes Arıkmert"
                fill
                className="object-cover object-top"
                sizes="128px"
              />
            </div>
            <div className="text-amber-400 text-4xl leading-none mb-4">&ldquo;</div>
            <p className="text-gray-300 text-sm leading-relaxed mb-6 font-medium">
              Kayı.com yalnızca bir ticari girişim değil; aile emeği, sorumluluk ve değer aktarımı üzerine kurulan bir yapıdır. Yazılım alanında eğitimine devam eden genç üyelerimizle birlikte, yerli teknoloji gücünü geleceğe taşımayı hedefliyoruz. Kayı.com, bugünün projesi değil; yarınlara devredilecek bir itibar mirasıdır.
            </p>
            <div className="mt-auto pt-6 border-t border-white/10 w-full">
              <p className="text-white font-extrabold text-base">Halit Enes ARIKMERT</p>
              <p className="text-amber-400 text-xs font-semibold mt-1 uppercase tracking-widest">
                Genç Kuşak Vizyonu — Strateji ve Teknoloji Temsilcisi
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   ANA BİLEŞEN
───────────────────────────────────────────── */
export function AboutUsPage() {
  return (
    <>
      <HeroSection />
      <WhoWeAreSection />
      <WhySection />
      <ValuesSection />
      <MissionSection />
      <VisionSection />
      <StorySection />
    </>
  )
}
