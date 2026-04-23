"use client"

import Image from "next/image"
import { Button } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { BaseHit, Hit } from "instantsearch.js"
import clsx from "clsx"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { getProductPrice } from "@/lib/helpers/get-product-price"
import { WishlistButton } from "@/components/cells/WishlistButton/WishlistButton"
import { useAgeVerification } from "@/providers/AgeVerificationProvider"

export const ProductCard = ({
  product,
  api_product,
  isEager = false,
  sliderCard = false,
}: {
  product: Hit<HttpTypes.StoreProduct> | Partial<Hit<BaseHit>>
  api_product?: HttpTypes.StoreProduct | null
  isEager?: boolean
  sliderCard?: boolean
}) => {
  const { isVerified } = useAgeVerification()

  if (!api_product) {
    return null
  }

  const { cheapestPrice } = getProductPrice({
    product: api_product! as HttpTypes.StoreProduct,
  })

  const productName = String(product.title || "Product")
  const isAdult = (api_product as any).categories?.some(
    (c: any) => c.metadata?.is_adult
  )
  const showBlur = isAdult && !isVerified

  return (
    <div
      className={clsx(
        "relative group border rounded-sm flex flex-col justify-between p-1",
        sliderCard
          ? "w-full"
          : "w-full lg:w-[calc(25%-1rem)] min-w-[250px]"
      )}
    >
      <div className="relative w-full bg-primary aspect-square">
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton productId={api_product.id} />
        </div>
        {/* +18 rozeti — position:absolute, layout'u etkilemez (CLS=0) */}
        {isAdult && (
          <span
            className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded pointer-events-none select-none"
            aria-hidden="true"
          >
            +18
          </span>
        )}
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          aria-label={`View ${productName}`}
          title={`View ${productName}`}
        >
          <div className="overflow-hidden rounded-sm w-full h-full flex justify-center align-center ">
            {product.thumbnail ? (
              <Image
                priority={isEager}
                fetchPriority={isEager ? "high" : "auto"}
                loading={isEager ? "eager" : "lazy"}
                src={decodeURIComponent(product.thumbnail)}
                alt={`${productName} image`}
                width={100}
                height={100}
                sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                className={clsx(
                  "object-cover aspect-square w-full object-center h-full lg:group-hover:-mt-14 transition-all duration-300 rounded-xs",
                  showBlur && "blur-[12px] grayscale opacity-70"
                )}
                style={{ transition: "filter 0.3s ease, opacity 0.3s ease, margin-top 0.3s" }}
              />
            ) : (
              <Image
                priority={isEager}
                fetchPriority={isEager ? "high" : "auto"}
                loading={isEager ? "eager" : "lazy"}
                src="/images/placeholder.svg"
                alt={`${productName} image placeholder`}
                width={100}
                height={100}
                sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                className={clsx(showBlur && "blur-[12px] grayscale opacity-70")}
                style={{ transition: "filter 0.3s ease, opacity 0.3s ease" }}
              />
            )}
          </div>
        </LocalizedClientLink>
        <LocalizedClientLink
          href={`/products/${product.handle}`}
          aria-label={`See more about ${productName}`}
          title={`See more about ${productName}`}
        >
          <Button className="absolute rounded-sm bg-action text-action-on-primary h-auto lg:h-[48px] lg:group-hover:block hidden w-full uppercase bottom-1 z-10">
            See More
          </Button>
        </LocalizedClientLink>
      </div>
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        aria-label={`Go to ${productName} page`}
        title={`Go to ${productName} page`}
      >
        <div className="flex justify-between p-4">
          <div className="w-full">
            <h3 className="heading-sm truncate">{product.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <p className="font-medium">{cheapestPrice?.calculated_price}</p>
              {cheapestPrice?.calculated_price !==
                cheapestPrice?.original_price && (
                <p className="text-sm text-gray-500 line-through">
                  {cheapestPrice?.original_price}
                </p>
              )}
            </div>
          </div>
        </div>
      </LocalizedClientLink>
    </div>
  )
}

