import DOMPurify from "isomorphic-dompurify"
import { ProductPageAccordion } from "@/components/molecules"

export const ProductPageDetails = ({ details }: { details: string }) => {
  if (!details) return null

  const sanitizedDetails = DOMPurify.sanitize(details, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "a", "span", "h1", "h2", "h3", "h4", "h5", "h6"],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
  })

  return (
    <ProductPageAccordion heading="Product details" defaultOpen={false}>
      <div
        className="product-details"
        dangerouslySetInnerHTML={{
          __html: sanitizedDetails,
        }}
      />
    </ProductPageAccordion>
  )
}
