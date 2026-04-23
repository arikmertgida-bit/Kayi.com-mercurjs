import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useOnboarding, useOrders } from "../../hooks/api"
import { DashboardCharts } from "./components/dashboard-charts"
import { DashboardOnboarding } from "./components/dashboard-onboarding"
import { ChartSkeleton } from "./components/chart-skeleton"
import { useReviews } from "../../hooks/api/review"

export const Dashboard = () => {
  const navigate = useNavigate()

  const { onboarding, isError, error, isPending } = useOnboarding()
  const { orders, isPending: isPendingOrders } = useOrders()
  const { reviews, isPending: isPendingReviews } = useReviews()

  const isAuthError = (() => {
    if (!isError) return false
    const errStatus = (error as any)?.status ?? (error as any)?.statusCode
    const errMsg = (error as any)?.message ?? ""
    return errStatus === 401 || errMsg.toLowerCase().includes("unauthorized")
  })()

  useEffect(() => {
    if (isAuthError) {
      navigate("/login", { replace: true })
    }
  }, [isAuthError, navigate])

  const notFulfilledOrders =
    orders?.filter((order) => order.fulfillment_status === "not_fulfilled")
      .length || 0
  const fulfilledOrders =
    orders?.filter((order) => order.fulfillment_status === "fulfilled")
      .length || 0
  const reviewsToReply =
    reviews?.filter((review: any) => !review?.seller_note).length || 0

  if (isPending || isPendingOrders || isPendingReviews) {
    return (
      <div>
        <ChartSkeleton />
      </div>
    )
  }

  if (isAuthError) {
    return null
  }

  if (isError) {
    console.error("Dashboard onboarding error:", error)
  }

  if (
    !onboarding?.products ||
    !onboarding?.locations_shipping ||
    !onboarding?.store_information
    // !onboarding?.stripe_connect
  )
    return (
      <DashboardOnboarding
        products={onboarding?.products}
        locations_shipping={onboarding?.locations_shipping}
        store_information={onboarding?.store_information}
        stripe_connect={onboarding?.stripe_connect}
      />
    )

  return (
    <DashboardCharts
      notFulfilledOrders={notFulfilledOrders}
      fulfilledOrders={fulfilledOrders}
      reviewsToReply={reviewsToReply}
    />
  )
}
