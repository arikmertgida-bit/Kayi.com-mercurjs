import { useEffect } from "react"
import { SingleColumnPage } from "../../../components/layout/pages"
import { useDashboardExtension } from "../../../extensions"
import { ReviewListTable } from "./components/review-list-table"

export const ReviewList = () => {
  const { getWidgets } = useDashboardExtension()

  useEffect(() => {
    localStorage.setItem("reviews_last_seen", new Date().toISOString())
  }, [])

  return (
    <SingleColumnPage
      widgets={{
        after: getWidgets("customer.list.after"),
        before: getWidgets("customer.list.before"),
      }}
    >
      <ReviewListTable />
    </SingleColumnPage>
  )
}
