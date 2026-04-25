import { LoginForm } from "@/components/molecules/LoginForm/LoginForm"

import { UserMessagesSection } from "@/components/sections/UserMessagesSection/UserMessagesSection"
import { retrieveCustomer } from "@/lib/data/customer"

export default async function MessagesPage() {
  const user = await retrieveCustomer()

  if (!user) return <LoginForm />

  const currentUserName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
    user.email ||
    "Ben"

  return (
    <main className="container">
      <div className="mt-6 space-y-8">
        <UserMessagesSection currentUserId={user.id} currentUserName={currentUserName} />
      </div>
    </main>
  )
}
