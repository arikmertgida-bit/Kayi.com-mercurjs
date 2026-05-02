import { Footer, Header } from "@/components/organisms"
import { retrieveCustomer } from "@/lib/data/customer"
import { checkRegion } from "@/lib/helpers/check-region"
import { redirect } from "next/navigation"
import { WishlistProvider } from "@/providers/WishlistProvider"
import { MessengerProvider } from "@/providers/MessengerProvider"
import { getAuthToken } from "@/lib/data/cookies"

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  // Parallelise independent server fetches — eliminates waterfall (~2 serial
  // round-trips become 1, shaving hundreds of ms from TTFB).
  const [user, regionCheck, authToken] = await Promise.all([
    retrieveCustomer(),
    checkRegion(locale),
    getAuthToken(),
  ])

  if (!regionCheck) {
    return redirect("/")
  }

  const userName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email || null
    : null

  return (
    <WishlistProvider user={user}>
      <MessengerProvider userId={user?.id ?? null} authToken={authToken} userName={userName}>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </MessengerProvider>
    </WishlistProvider>
  )
}
