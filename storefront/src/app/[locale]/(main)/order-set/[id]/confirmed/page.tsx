import { retrieveOrderSet } from "@/lib/data/orders"
import { convertToLocale } from "@/lib/helpers/money"
import { Heading, Text } from "@medusajs/ui"
import { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import Link from "next/link"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export const metadata: Metadata = {
  title: "Siparişleriniz Alındı | Kayı.com",
  description: "Satın alma işleminiz başarıyla tamamlandı.",
}

type OrderSetOrder = {
  id: string
  display_id: number
  total: number
  currency_code: string
  items?: Array<{
    product?: {
      seller?: {
        name?: string
      }
    }
  }>
}

type OrderSetData = {
  id: string
  orders: OrderSetOrder[]
}

export default async function OrderSetConfirmedPage(props: Props) {
  const params = await props.params
  const orderSet = (await retrieveOrderSet(params.id).catch(() => null)) as OrderSetData | null

  if (!orderSet) {
    return notFound()
  }

  const t = await getTranslations("orderConfirmed")
  const orders = orderSet.orders ?? []

  return (
    <main className="container">
      <div className="py-6">
        <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl h-full w-full mx-auto">
          <div
            className="flex flex-col gap-4 max-w-4xl h-full bg-white w-full py-10"
            data-testid="order-complete-container"
          >
            <div className="text-center w-full mb-6">
              <Heading
                level="h1"
                className="flex flex-col gap-y-3 text-ui-fg-base text-3xl mb-4"
              >
                <span>{t("thanks")}</span>
                <span>{t("successMessage")}</span>
              </Heading>
              <Text className="text-ui-fg-subtle">
                {orders.length} ayrı siparişiniz başarıyla oluşturuldu.
              </Text>
            </div>

            <div className="flex flex-col gap-4">
              {orders.map((order) => {
                const sellerName =
                  order.items?.[0]?.product?.seller?.name ?? "Satıcı"
                return (
                  <Link
                    key={order.id}
                    href={`/${params.locale}/order/${order.id}`}
                    className="border rounded-md p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <Text className="font-medium">
                          Sipariş #{order.display_id}
                        </Text>
                        <Text className="text-ui-fg-subtle text-sm">
                          {sellerName}
                        </Text>
                      </div>
                      <Text className="font-semibold">
                        {convertToLocale({
                          amount: order.total,
                          currency_code: order.currency_code,
                        })}
                      </Text>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
