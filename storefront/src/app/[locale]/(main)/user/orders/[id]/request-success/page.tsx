import { Button } from "@/components/atoms/Button/Button"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

export default async function RequestSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="container">
      <div className="mt-6 text-center">
        <h1 className="heading-md uppercase">İade talebiniz alındı</h1>
          <p className="label-md text-secondary w-96 mx-auto my-8">
            İade talebiniz iletildi. Satıcı onayladıktan sonra size bir onay e-postası gönderilecektir.
          </p>
          <LocalizedClientLink href={`/user/returns${id && `?return=${id}`}`}>
            <Button className="label-md uppercase px-12 py-3">
              İade detayları
            </Button>
          </LocalizedClientLink>
      </div>
    </main>
  )
}
