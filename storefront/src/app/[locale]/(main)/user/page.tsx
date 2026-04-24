import { LoginForm } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"

export default async function UserPage() {
  const user = await retrieveCustomer()

  if (!user) return <LoginForm />

  return (
    <main className="container">
      <div className="mt-6">
        <h1 className="heading-xl uppercase">Welcome {user.first_name}</h1>
        <p className="label-md">Your account is ready to go!</p>
      </div>
    </main>
  )
}
