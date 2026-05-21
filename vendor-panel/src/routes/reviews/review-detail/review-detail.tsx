import { useLoaderData, useParams } from "react-router-dom"
import { TwoColumnPage } from "../../../components/layout/pages"
import { useDashboardExtension } from "../../../extensions"
import { useReview } from "../../../hooks/api/review"
import { ReviewGeneralSection } from "./components/review-general-section"
import { reviewLoader } from "./loader"
import { TwoColumnPageSkeleton } from "../../../components/common/skeleton"
import { ReviewCustomerSection } from "./components/review-customer-section"
import { ReviewProductSection } from "./components/review-product-section"
import { useRequests } from "../../../hooks/api"

const MAX_REPORT_ATTEMPTS = 3

export const ReviewDetail = () => {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof reviewLoader>
  >

  const { id } = useParams()
  const { review, isLoading, isError, error } = useReview(
    id!,
    { fields: "*customer" },
    { initialData }
  )

  const { requests, isLoading: isRequestsLoading } = useRequests({
    type: "review_remove",
  })

  type ReviewRemoveRequest = {
    data?: { review_id?: string }
    status: string
    created_at: string
  }

  // Collect all review_remove requests for this specific review
  const reviewRequests = (
    (requests as ReviewRemoveRequest[] | undefined)?.filter(
      (request) => request.data?.review_id === id
    ) ?? []
  )

  const attemptCount = reviewRequests.length

  // Find the most recent request (highest created_at)
  const latestRequest = reviewRequests.reduce(
    (latest: ReviewRemoveRequest | null, req) => {
      if (!latest) return req
      return new Date(req.created_at) > new Date(latest.created_at)
        ? req
        : latest
    },
    null
  )

  const isPending = latestRequest?.status === "pending"
  const isRejected = latestRequest?.status === "rejected"
  const isAccepted = latestRequest?.status === "accepted"
  // Can report again if: no pending/accepted request AND attempt count below limit
  const canReport = !isPending && !isAccepted && attemptCount < MAX_REPORT_ATTEMPTS

  const { getWidgets } = useDashboardExtension()
  if (isLoading || !review || isRequestsLoading) {
    return (
      <TwoColumnPageSkeleton
        mainSections={2}
        sidebarSections={3}
        showJSON
        showMetadata
      />
    )
  }

  if (isError) {
    throw error
  }

  return (
    <TwoColumnPage
      widgets={{
        after: getWidgets("campaign.details.after"),
        before: getWidgets("campaign.details.before"),
        sideAfter: getWidgets("campaign.details.side.after"),
        sideBefore: getWidgets("campaign.details.side.before"),
      }}
      data={review}
    >
      <TwoColumnPage.Main>
        <ReviewGeneralSection
          review={review}
          latestRequest={latestRequest}
          isPending={isPending}
          isRejected={isRejected}
          isAccepted={isAccepted}
          canReport={canReport}
        />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <ReviewCustomerSection customer={review.customer} />
        {review.reference !== "seller" && <ReviewProductSection />}
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  )
}
