import { LoginForm, ProfileDetails } from "@/components/molecules"
import { ProfilePassword } from "@/components/molecules/ProfileDetails/ProfilePassword"
import { retrieveCustomer } from "@/lib/data/customer"
import { getTranslations } from "next-intl/server"

export default async function ReviewsPage() {
  const user = await retrieveCustomer()
  const t = await getTranslations('user')

  if (!user) return <LoginForm />

  return (
    <main className="container">
      <div className="mt-6">
        <h1 className="heading-md uppercase mb-8">{t('settings')}</h1>
        <ProfileDetails user={user} />
        <ProfilePassword user={user} />
      </div>
    </main>
  )
}
