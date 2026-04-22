import { retrieveCustomer } from "@/lib/data/customer"
import { CustomerProfileHeader } from "@/components/sections"

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await retrieveCustomer()

  return (
    <div>
      {user && <CustomerProfileHeader user={user} />}
      <div className="mt-4">{children}</div>
    </div>
  )
}
