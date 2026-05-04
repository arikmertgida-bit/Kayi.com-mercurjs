import { Suspense } from "react"
import { LoginForm } from "@/components/molecules"
import { retrieveCustomer } from "@/lib/data/customer"
import { UserReviewsList } from "@/components/organisms/UserReviews/UserReviewsList"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await retrieveCustomer()

  if (!user) return <LoginForm />

  return (
    <main className="container">
      <div className="mt-6">
        <h1 className="heading-md uppercase mb-8">Değerlendirmelerim</h1>
        <Suspense
          fallback={
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-sm bg-white h-20 animate-pulse" />
              ))}
            </div>
          }
        >
          <UserReviewsList />
        </Suspense>
      </div>
    </main>
  )
}
