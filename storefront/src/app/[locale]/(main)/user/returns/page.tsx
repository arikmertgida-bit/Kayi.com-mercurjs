import { OrderReturnRequests } from "@/components/sections/OrderReturnRequests/OrderReturnRequests"
import { retrieveCustomer } from "@/lib/data/customer"
import { getReturns, retrieveReturnReasons } from "@/lib/data/orders"
import { getTranslations } from "next-intl/server"

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ page: string; return: string }>
}) {
  const { order_return_requests } = await getReturns()
  const returnReasons = await retrieveReturnReasons()
  const user = await retrieveCustomer()
  const t = await getTranslations('returns')
  const { page, return: returnId } = await searchParams

  return (
    <main className="container">
      <div className="mt-6">
        <h1 className="heading-md uppercase">{t('title')}</h1>
          <OrderReturnRequests
            returns={order_return_requests.sort((a, b) => {
              return (
                new Date(b.line_items[0].created_at).getTime() -
                new Date(a.line_items[0].created_at).getTime()
              )
            })}
            user={user}
            page={page}
            currentReturn={returnId || ""}
            returnReasons={returnReasons}
          />
      </div>
    </main>
  )
}
