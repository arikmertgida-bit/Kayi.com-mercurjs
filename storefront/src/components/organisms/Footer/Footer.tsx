import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { getTranslations } from "next-intl/server"

export async function Footer() {
  const t = await getTranslations('footer')
  return (
    <footer className="bg-primary container">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Customer Services Column */}
        <div className="p-6 border rounded-sm">
          <h2 className="heading-sm text-primary mb-3 uppercase">
            {t('customerServices')}
          </h2>
          <nav className="space-y-3" aria-label="Customer services navigation">
            <LocalizedClientLink href="/order-guide" className="block label-md">{t('orderGuide')}</LocalizedClientLink>
            <LocalizedClientLink href="#" className="block label-md">{t('trackOrder')}</LocalizedClientLink>
            <LocalizedClientLink href="#" className="block label-md">{t('returns')}</LocalizedClientLink>
            <LocalizedClientLink href="#" className="block label-md">{t('delivery')}</LocalizedClientLink>
            <LocalizedClientLink href="#" className="block label-md">{t('payment')}</LocalizedClientLink>
          </nav>
        </div>

        {/* About Column */}
        <div className="p-6 border rounded-sm">
          <h2 className="heading-sm text-primary mb-3 uppercase">{t('about')}</h2>
          <nav className="space-y-3" aria-label="About navigation">
            <LocalizedClientLink href="/about-us" className="block label-md">{t('aboutUs')}</LocalizedClientLink>
            <LocalizedClientLink href="#" className="block label-md">{t('blog')}</LocalizedClientLink>
            <LocalizedClientLink href="/privacy-policy" className="block label-md">{t('privacyPolicy')}</LocalizedClientLink>
            <LocalizedClientLink href="/terms-and-conditions" className="block label-md">{t('termsConditions')}</LocalizedClientLink>
          </nav>
        </div>

        {/* Connect Column */}
        <div className="p-6 border rounded-sm">
          <h2 className="heading-sm text-primary mb-3 uppercase">{t('connect')}</h2>
          <nav className="space-y-3" aria-label="Social media navigation">
            <a aria-label="Go to Facebook page" title="Go to Facebook page" href="https://www.facebook.com/ahmet.arikmert2" className="block label-md" target="_blank" rel="noopener noreferrer">{t('facebook')}</a>
            <a aria-label="Go to Instagram page" title="Go to Instagram page" href="https://www.instagram.com/kayi_platform/" className="block label-md" target="_blank" rel="noopener noreferrer">{t('instagram')}</a>
            <a aria-label="Go to YouTube page" title="Go to YouTube page" href="https://www.youtube.com/channel/UC9DT5jOBgOOvrmrJE_-ThTQ" className="block label-md" target="_blank" rel="noopener noreferrer">{t('youtube')}</a>
          </nav>
        </div>
      </div>

      <div className="py-6 border rounded-sm ">
        <p className="text-md text-secondary text-center ">{t('copyright')}</p>
      </div>
    </footer>
  )
}
