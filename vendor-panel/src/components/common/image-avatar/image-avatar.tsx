import { clx } from "@medusajs/ui"
import imagesConverter from "../../../utils/images-conventer"

const sizeClasses: Record<number, string> = {
  4: "w-4 h-4",
  5: "w-5 h-5",
  6: "w-6 h-6",
  7: "w-7 h-7",
  8: "w-8 h-8",
  9: "w-9 h-9",
  10: "w-10 h-10",
  12: "w-12 h-12",
  16: "w-16 h-16",
}

export default function ImageAvatar({
  src,
  size = 6,
  rounded = false,
}: {
  src: string
  size?: number
  rounded?: boolean
}) {
  const formattedSrc = imagesConverter(src)

  return (
    <img
      src={formattedSrc}
      alt="avatar"
      className={clx(
        sizeClasses[size] ?? `w-${size} h-${size}`,
        "border rounded-md",
        rounded && "rounded-full"
      )}
    />
  )
}
