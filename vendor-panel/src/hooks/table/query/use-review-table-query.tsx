import { useQueryParams } from "../../use-query-params"

type UseReviewTableQueryProps = {
  prefix?: string
  pageSize?: number
}

export const useReviewTableQuery = ({
  prefix,
  pageSize = 20,
}: UseReviewTableQueryProps) => {
  const queryObject = useQueryParams(
    [
      "offset",
      "q",
      "seller_note",
      "order",
    ],
    prefix
  )

  const { offset, q, order } = queryObject

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    order,
  }

  return {
    searchParams,
    raw: queryObject,
    clientQ: q,
  }
}
