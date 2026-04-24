import { LoginForm } from "@/components/molecules/LoginForm/LoginForm"

import { UserMessagesSection } from "@/components/sections/UserMessagesSection/UserMessagesSection"
import { retrieveCustomer } from "@/lib/data/customer"

export default async function MessagesPage() {
  const user = await retrieveCustomer()

  if (!user) return <LoginForm />

  return (
    <main className="container">
      <div className="mt-6 space-y-8">
        <UserMessagesSection />
      </div>
    </main>
  )
}
