"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { followSeller, unfollowSeller } from "@/lib/data/seller"

interface FollowButtonProps {
  handle: string
  initialFollowing: boolean
  initialCount: number
  isLoggedIn: boolean
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}B`
  return String(n)
}

export function FollowButton({
  handle,
  initialFollowing,
  initialCount,
  isLoggedIn,
}: FollowButtonProps) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    if (!isLoggedIn) {
      router.push("/user")
      return
    }

    startTransition(async () => {
      try {
        const result = following
          ? await unfollowSeller(handle)
          : await followSeller(handle)
        setFollowing(result.following)
        setCount(result.followers_count)
      } catch {
        // silently ignore
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-700 text-sm font-medium whitespace-nowrap">
        {formatCount(count)} Takipçi
      </span>
      <button
        onClick={handleClick}
        disabled={isPending}
        style={{
          backgroundColor: following ? "#e30a17" : "#000000",
          color: "#fcfcfc",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = following ? "#000000" : "#e30a17"
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = following ? "#e30a17" : "#000000"
        }}
        className="px-6 py-2 rounded-sm text-sm font-semibold transition-colors duration-200 min-w-[120px] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "..." : following ? "Takibi Bırak" : "Takip Et"}
      </button>
    </div>
  )
}
