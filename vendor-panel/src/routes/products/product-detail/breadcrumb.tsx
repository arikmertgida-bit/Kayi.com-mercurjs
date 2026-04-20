import { UIMatch } from "react-router-dom"
import { ExtendedAdminProductResponse } from "../../../types/products"

type ProductDetailBreadcrumbProps = UIMatch<ExtendedAdminProductResponse>

export const ProductDetailBreadcrumb = (
  props: ProductDetailBreadcrumbProps
) => {
  const title = props.data?.product?.title

  if (!title) {
    return null
  }

  return <span>{title}</span>
}
