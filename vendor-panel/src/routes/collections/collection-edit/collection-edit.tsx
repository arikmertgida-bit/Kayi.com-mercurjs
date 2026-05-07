import { Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { RouteDrawer } from "../../../components/modals"
import { EditCollectionForm } from "./components/edit-collection-form"
import { useRequest } from "../../../hooks/api"

export const CollectionEdit = () => {
  const { id } = useParams()
  const { request, isPending, isError, error } = useRequest(id!)
  const { t } = useTranslation()

  const ready = !isPending && !!request

  if (isError) {
    throw error
  }
  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("collections.editCollectionRequest")}</Heading>
      </RouteDrawer.Header>
      {ready && (
        <EditCollectionForm collection={request.data} requestId={id!} />
      )}
    </RouteDrawer>
  )
}
