import { LoginForm } from "@/components/molecules"
import { ReviewsToWrite } from "@/components/organisms"
import { retrieveCustomer } from "@/lib/data/customer"
import { listOrders } from "@/lib/data/orders"

export default async function Page() {
  const user = await retrieveCustomer()

  if (!user) return <LoginForm />

  const orders = await listOrders()

  if (!orders) return null

  return (
    <main className="container">
      <ReviewsToWrite
        orders={orders.filter((order) => order.reviews.length === 0)}
      />
    </main>
  )
}
