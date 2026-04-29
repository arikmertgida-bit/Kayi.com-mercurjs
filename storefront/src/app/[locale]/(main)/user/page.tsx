import { LoginForm } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"

export default async function UserPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const user = await retrieveCustomer()
  const { returnTo } = await searchParams

  if (!user) return <LoginForm returnTo={returnTo} />

  return (
    <main className="container">
      <div className="mt-6">
        <h1 className="heading-xl uppercase">Welcome {user.first_name}</h1>
        <p className="label-md">Your account is ready to go!</p>
      </div>
    </main>
  )
}
