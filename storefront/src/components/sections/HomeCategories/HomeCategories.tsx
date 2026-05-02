import { listMegaMenuCategories } from "@/lib/data/categories"
import { HomeCategoriesCarousel } from "./HomeCategoriesCarousel"

export const HomeCategories = async () => {
  const raw = await listMegaMenuCategories().catch(() => [])

  if (!raw?.length) return null

  // thumbnail, MedusaJS'de metadata.thumbnail olarak saklanıyor
  const categories = raw.map((cat) => ({
    id: cat.id,
    name: cat.name,
    handle: cat.handle ?? "",
    thumbnail:
      (cat.metadata as Record<string, unknown> | null)?.thumbnail as
        | string
        | null
        | undefined,
  }))

  return (
    <section className="py-4 w-full px-4 lg:px-6 min-h-[9rem] sm:min-h-[11rem] md:min-h-[13rem]">
      <HomeCategoriesCarousel categories={categories} />
    </section>
  )
}
