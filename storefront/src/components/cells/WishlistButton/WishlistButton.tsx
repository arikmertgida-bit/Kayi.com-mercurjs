"use client"

import { Button } from "@/components/atoms"
import { HeartFilledIcon, HeartIcon } from "@/icons"
import { Modal } from "@/components/molecules/Modal/Modal"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { useWishlistContext } from "@/providers/WishlistProvider"
import { useEffect, useState } from "react"

export const WishlistButton = ({
  productId,
  onRemove,
}: {
  productId: string
  onRemove?: () => void
}) => {
  const { user, isProductWishlisted, addToWishlist, removeFromWishlist } =
    useWishlistContext()

  const [isWishlistAdding, setIsWishlistAdding] = useState(false)
  const [isWishlisted, setIsWishlisted] = useState(
    isProductWishlisted(productId)
  )
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  useEffect(() => {
    setIsWishlisted(isProductWishlisted(productId))
  }, [productId, isProductWishlisted])

  const handleClick = async () => {
    if (!user) {
      setIsLoginModalOpen(true)
      return
    }

    try {
      setIsWishlistAdding(true)
      if (isWishlisted) {
        setIsWishlisted(false)
        await removeFromWishlist(productId)
        onRemove?.()
      } else {
        setIsWishlisted(true)
        await addToWishlist(productId)
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsWishlisted((prev) => !prev)
      console.error(error)
    } finally {
      setIsWishlistAdding(false)
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        variant="tonal"
        className="w-10 h-10 p-0 flex items-center justify-center"
        loading={isWishlistAdding}
        disabled={isWishlistAdding}
      >
        {isWishlisted ? <HeartFilledIcon size={20} /> : <HeartIcon size={20} />}
      </Button>

      {isLoginModalOpen && (
        <Modal
          heading="Giriş Yapın"
          onClose={() => setIsLoginModalOpen(false)}
          className="bg-[#fbfbfb] max-w-[480px]"
        >
          <div className="px-4 pb-4 flex flex-col gap-6">
            <p className="text-secondary text-center">
              İstek listesine ekleyebilmeniz için giriş yapmanız gerekmektedir.
            </p>
            <div className="flex flex-col gap-3">
              <LocalizedClientLink href="/user">
                <Button
                  className="w-full"
                  onClick={() => setIsLoginModalOpen(false)}
                >
                  Giriş Yap
                </Button>
              </LocalizedClientLink>
              <LocalizedClientLink href="/user/register">
                <Button
                  variant="tonal"
                  className="w-full"
                  onClick={() => setIsLoginModalOpen(false)}
                >
                  Kayıt Ol
                </Button>
              </LocalizedClientLink>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
