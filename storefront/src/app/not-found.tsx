import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { ArrowUpIcon } from "@/icons"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center py-24">
      <h1 className="text-2xl-semi text-ui-fg-base">Sayfa Bulunamadı</h1>
      <p className="text-small-regular text-ui-fg-base">
        Erişmeye çalıştığınız sayfa mevcut değil.
      </p>
      <LocalizedClientLink className="flex gap-x-1 items-center group" href="/">
        Ana Sayfaya Dön
        <ArrowUpIcon
          className="group-hover:rotate-45 ease-in-out duration-150"
          color="var(--fg-interactive)"
        />
      </LocalizedClientLink>
    </div>
  )
}
