import { Button, Card } from "@/components/atoms"
import { StarIcon } from "@/icons"
import { Review } from "@/lib/data/reviews"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"

// Pre-built star arrays for ratings 0-5, avoiding repeated array allocation per render
const STAR_ARRAYS: readonly number[][] = [[], [0], [0, 1], [0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4]]

export const ReviewCard = ({ review }: { review: Review }) => {
  return (
    <Card
      className="flex flex-col gap-6 lg:grid lg:grid-cols-6 px-4"
      key={review.id}
    >
      <div className="flex gap-2 max-lg:items-center lg:flex-col">
        {review.seller.photo ? (
          <Image
            alt="Seller photo"
            src={review.seller.photo}
            width={32}
            height={32}
            className="size-8 border border-base-primary rounded-xs"
          />
        ) : null}
        <p className="label-md text-primary">{review.seller.name}</p>
      </div>
      <div className="col-span-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
        <div
          className={cn(
            "flex flex-col gap-2 px-4",
            review?.seller ? "col-span-5" : "col-span-6"
          )}
        >
          <div className="flex gap-3 items-center">
            <div className="flex gap-0.5">
              {(STAR_ARRAYS[review.rating] ?? STAR_ARRAYS[5]).map((index) => (
                <StarIcon className="size-3.5" key={`${review.id}-${index}`} />
              ))}
            </div>
            <div className="h-2.5 w-px bg-action" />
            <p className="text-md text-primary">
              {formatDistanceToNow(new Date(review.updated_at), { addSuffix: true, locale: tr })}
            </p>
          </div>
          <div className="col-span-5 flex flex-col lg:flex-row justify-between lg:items-center gap-4">
            <p className="text-md text-primary">{review.customer_note}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
