import { Badge, Button, Container, Heading } from "@medusajs/ui"
import { format } from "date-fns"
import { StarsRating } from "../../../../components/common/stars-rating/stars-rating"
import { StatusCell } from "../../../../components/table/table-cells/review/status-cell"
import { ActionMenu } from "../../../../components/common/action-menu"
import { ExclamationCircle } from "@medusajs/icons"
import { Link } from "react-router-dom"
import { useReviewReplies } from "../../../../hooks/api/review"

export const ReviewGeneralSection = ({
  review,
  isRequested = false,
}: {
  review: any
  isRequested?: boolean
}) => {
  const { replies } = useReviewReplies(review.id)
  const firstSellerReply = replies.find((r: any) => r.is_seller_reply)
  const displayedReply = firstSellerReply?.content || review.seller_note || null
  const hasReplied = !!displayedReply

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Review</Heading>
        <div className="flex items-center gap-4">
          <Badge>
            <StatusCell status={hasReplied ? displayedReply : null} />
          </Badge>
          {isRequested ? (
            <Badge className="flex items-center gap-2">
              <ExclamationCircle />
              Requested to remove
            </Badge>
          ) : (
            <ActionMenu
              groups={[
                {
                  actions: [
                    {
                      label: "Report review",
                      to: `/reviews/${review.id}/report`,
                      icon: <ExclamationCircle />,
                      disabled: isRequested,
                    },
                  ],
                },
              ]}
            />
          )}
        </div>
      </div>
      <div className="px-6 py-4 grid grid-cols-2">
        <div>Stars</div>
        <div>
          <StarsRating rate={review.rating} />
        </div>
      </div>
      <div className="px-6 py-4 grid grid-cols-2">
        <div>Review</div>
        <div className="whitespace-pre-line break-words">
          {review.customer_note}
        </div>
      </div>
      <div className="px-6 py-4 grid grid-cols-2">
        <div>Reply</div>
        <div className="whitespace-pre-line break-words">{displayedReply || "-"}</div>
      </div>
      <div className="px-6 py-4 grid grid-cols-2">
        <div>Added</div>
        <div>{format(review.created_at, "dd MMM yyyy")}</div>
      </div>
      <div className="px-6 py-4 flex justify-end">
        <Link to={`/reviews/${review.id}/reply`}>
          <Button className="px-6">
            {hasReplied ? "Edit Reply" : "Reply"}
          </Button>
        </Link>
      </div>
    </Container>
  )
}
