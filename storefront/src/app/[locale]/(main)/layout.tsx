import { Footer, Header } from "@/components/organisms"
import { retrieveCustomer } from "@/lib/data/customer"
import { checkRegion } from "@/lib/helpers/check-region"
import { SessionWrapper } from "@/components/molecules/MessageButton/SessionWrapper"
import { redirect } from "next/navigation"

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const APP_ID = process.env.NEXT_PUBLIC_TALKJS_APP_ID
  const { locale } = await params

  // Parallelise independent server fetches — eliminates waterfall (~2 serial
  // round-trips become 1, shaving hundreds of ms from TTFB).
  const [user, regionCheck] = await Promise.all([
    retrieveCustomer(),
    checkRegion(locale),
  ])

  if (!regionCheck) {
    return redirect("/")
  }

  return (
    <>
      <Header />
      {/* TalkJS Session is now scoped only to MessageButton, not the entire
          layout. This means Header, children and Footer hydrate instantly
          without waiting for TalkJS to initialise. */}
      {user && APP_ID && <SessionWrapper appId={APP_ID} userId={user.id} />}
      {children}
      <Footer />
    </>
  )
}
