import { redirect } from "next/navigation"
import Link from "next/link"
import { UserNavigation } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"
import { getFollowedSellers } from "@/lib/data/seller"
import { SellerCard } from "@/components/organisms/SellerCard/SellerCard"

const PAGE_SIZE = 20

export default async function FollowingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const user = await retrieveCustomer()
  if (!user) redirect("/user")

  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || "1", 10))

  const { sellers, count } = await getFollowedSellers(page)
  const totalPages = Math.ceil(count / PAGE_SIZE) || 1

  return (
    <main className="container">
      <div className="grid grid-cols-1 md:grid-cols-4 mt-6 gap-5 md:gap-8">
        <UserNavigation />
        <div className="md:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <h1 className="heading-xl uppercase">Takip Edilen Satıcılar</h1>
            <span className="text-sm text-secondary">{count} satıcı</span>
          </div>

          {sellers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-primary mb-2">Henüz kimseyi takip etmiyorsunuz</p>
              <p className="text-secondary text-sm">Mağaza sayfalarından satıcıları takip edebilirsiniz.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sellers.map((seller) => (
                  <SellerCard
                    key={seller.id}
                    id={seller.id}
                    name={seller.name}
                    handle={seller.handle}
                    photo={seller.photo}
                    locale={locale}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`?page=${p}`}
                      className={`border w-10 h-10 rounded-sm text-sm flex items-center justify-center hover:bg-gray-100 transition-colors ${
                        p === page ? "border-gray-900 font-semibold" : "border-gray-300"
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
