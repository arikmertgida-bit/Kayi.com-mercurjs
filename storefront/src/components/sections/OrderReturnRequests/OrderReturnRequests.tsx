import { OrdersPagination } from "@/components/organisms/OrdersPagination/OrdersPagination"
import { SingleOrderReturn } from "@/components/organisms/SingleOrderReturn/SingleOrderReturn"
import { Heading } from "@medusajs/ui"
import { isEmpty } from "lodash"
import { getTranslations } from "next-intl/server"

const LIMIT = 10

export const OrderReturnRequests = async ({
  returns = [],
  user,
  page,
  currentReturn,
  returnReasons,
}: {
  returns: any[]
  user: any
  page: string
  currentReturn: string
  returnReasons: any[]
}) => {
  const t = await getTranslations('returns')
  const pages = Math.ceil(returns.length / LIMIT)
  const currentPage = +page || 1
  const offset = (+currentPage - 1) * LIMIT

  const processedReturns = returns.slice(offset, offset + LIMIT)

  if (isEmpty(processedReturns)) {
    return (
      <div className="mt-8">
        <Heading level="h2" className="uppercase text-center heading-lg">
          {t('noReturns')}
        </Heading>
        <p className="text-center text-secondary w-96 mt-8 mx-auto">
          {t('noReturnsDesc')}
        </p>
      </div>
    )
  }

  return (
    <div>
      {processedReturns.map((item) => (
        <SingleOrderReturn
          key={item.id}
          item={item}
          user={user}
          defaultOpen={currentReturn === item.id}
          returnReason={returnReasons}
        />
      ))}
      <div className="mt-8 flex justify-center">
        <OrdersPagination pages={pages} />
      </div>
    </div>
  )
}
