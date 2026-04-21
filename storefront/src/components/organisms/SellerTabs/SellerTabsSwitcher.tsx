"use client"

import { useState } from "react"
import { TabsTrigger } from "@/components/atoms"

export const SellerTabsSwitcher = ({
  productContent,
  reviewContent,
}: {
  productContent: React.ReactNode
  reviewContent: React.ReactNode
}) => {
  const [activeTab, setActiveTab] = useState("products")

  return (
    <div className="mt-8">
      <div className="flex gap-4 w-full">
        <button onClick={() => setActiveTab("products")}>
          <TabsTrigger isActive={activeTab === "products"}>products</TabsTrigger>
        </button>
        <button onClick={() => setActiveTab("reviews")}>
          <TabsTrigger isActive={activeTab === "reviews"}>reviews</TabsTrigger>
        </button>
      </div>
      {activeTab === "products" && <div>{productContent}</div>}
      {activeTab === "reviews" && <div>{reviewContent}</div>}
    </div>
  )
}
