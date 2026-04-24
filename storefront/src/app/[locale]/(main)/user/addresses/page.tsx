import { retrieveCustomer } from "@/lib/data/customer"
import { redirect } from "next/navigation"
import { Addresses } from "@/components/organisms"
import { listRegions } from "@/lib/data/regions"

export default async function Page() {
  const user = await retrieveCustomer()
  const regions = await listRegions()

  if (!user) {
    redirect("/user")
  }

  return (
    <main className="container">
      <Addresses {...{ user, regions }} />
    </main>
  )
}
