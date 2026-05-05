import { LoginForm } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"
import { getTranslations } from "next-intl/server"

export default async function UserPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const user = await retrieveCustomer()
  const { returnTo } = await searchParams
  const t = await getTranslations('user')

  if (!user) return <LoginForm returnTo={returnTo} />

  return (
    <main className="container">
      <div className="mt-6">
        <h1 className="heading-xl uppercase">{t('welcomeTitle', { name: user.first_name })}</h1>
        <p className="label-md">{t('welcomeSubtitle')}</p>
      </div>
    </main>
  )
}
