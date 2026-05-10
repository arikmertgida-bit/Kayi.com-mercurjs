"use client"

import { Button } from "@/components/atoms"
import Link from "next/link"

export const OrderReturn = ({ order }: { order: any }) => {
  return (
    <div className="md:flex justify-between items-center">
      <div className="mb-4 md:mb-0">
        <h2 className="text-primary label-lg uppercase">Siparişi İade Et</h2>
        <p className="text-secondary label-md max-w-sm">
          Siparişinizi teslim aldıktan sonra 14 gün içinde iade edebilirsiniz.
          <Link href="/returns" className="underline">
            İade ve geri ödeme
          </Link>{" "}
          hakkında daha fazla bilgi edinin.
        </p>
      </div>
      <Link href={`/user/orders/${order.id}/return`}>
        <Button variant="tonal" className="uppercase" onClick={() => null}>
          İade Et
        </Button>
      </Link>
    </div>
  )
}
