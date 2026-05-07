import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { RouteModalProvider } from "../../../components/modals/route-modal-provider"
import { ReviewReportForm } from "./components/review-report-form"
import { useRequest } from "../../../hooks/api"

export const ReviewReport = () => {
  const { id } = useParams()
  const { t } = useTranslation()

  const { request, isLoading } = useRequest(id!)

  if (isLoading) return <div>{t("general.loading")}</div>

  return (
    <RouteModalProvider prev={`/reviews/${id}`}>
      <ReviewReportForm request={request} />
    </RouteModalProvider>
  )
}
