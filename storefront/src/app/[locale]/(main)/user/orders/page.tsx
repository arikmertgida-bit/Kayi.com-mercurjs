import { LoginForm, ParcelAccordion } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"
import { OrdersPagination } from "@/components/sections"
import { isEmpty } from "lodash"
import { listOrders } from "@/lib/data/orders"
import { getTranslations } from "next-intl/server"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

const LIMIT = 10

export default async function UserPage({
  searchParams,
}: {
  searchParams: Promise<{ page: string }>
}) {
  const user = await retrieveCustomer()
  const t = await getTranslations('orders')

  if (!user) return <LoginForm />

  const orders = await listOrders()

  const { page } = await searchParams

  const pages = Math.ceil(orders.length / LIMIT)
  const currentPage = +page || 1
  const offset = (+currentPage - 1) * LIMIT

  const orderSetsGrouped = orders.reduce((acc, order) => {
    const orderSetId = (order as any).order_set.id
    if (!acc[orderSetId]) {
      acc[orderSetId] = []
    }
    acc[orderSetId].push(order)
    return acc
  }, {} as Record<string, typeof orders>)

  const orderSets = Object.entries(orderSetsGrouped).map(
    ([orderSetId, orders]) => {
      const firstOrder = orders[0]
      const orderSet = (firstOrder as any).order_set

      return {
        id: orderSetId,
        orders: orders,
        created_at: orderSet.created_at,
        display_id: orderSet.display_id,
        total: orders.reduce((sum, order) => sum + order.total, 0),
        currency_code: firstOrder.currency_code,
      }
    }
  )

  const processedOrders = orderSets.slice(offset, offset + LIMIT)

  return (
    <main className="container">
      <div className="mt-6 space-y-8">
          <h1 className="heading-md uppercase">{t('title')}</h1>
          {isEmpty(orders) ? (
            <div className="text-center">
              <h3 className="heading-lg text-primary uppercase">{t('noOrders')}</h3>
              <p className="text-lg text-secondary mt-2">{t('noOrdersDesc')}</p>
              <LocalizedClientLink
                href="/categories"
                className="inline-block mt-6 px-6 py-3 bg-action text-action-on-primary label-md uppercase rounded-sm"
              >
                {t('exploreShop')}
              </LocalizedClientLink>
            </div>
          ) : (
            <>
              <div className="w-full max-w-full">
                {processedOrders.map((orderSet) => (
                  <ParcelAccordion
                    key={orderSet.id}
                    orderId={orderSet.id}
                    orderDisplayId={`#${orderSet.display_id}`}
                    createdAt={orderSet.created_at}
                    total={orderSet.total}
                    orders={orderSet.orders || []}
                    currency_code={orderSet.currency_code}
                  />
                ))}
              </div>
              {/* TODO - pagination */}
              <OrdersPagination pages={pages} />
            </>
          )}
      </div>
    </main>
  )
}
