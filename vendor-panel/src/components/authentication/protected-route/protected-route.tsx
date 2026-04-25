import { Spinner } from "@medusajs/icons"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useMe } from "../../../hooks/api/users"
import { SearchProvider } from "../../../providers/search-provider"
import { SidebarProvider } from "../../../providers/sidebar-provider"
import { MessengerProvider } from "../../../providers/messenger-provider/MessengerProvider"

export const ProtectedRoute = () => {
  const { seller, isPending, error } = useMe()

  const location = useLocation()

  const hasToken = !!window.localStorage.getItem("medusa_auth_token")

  if (!hasToken) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (!seller) {
    const reason = error?.message ? `?reason=${error.message}` : ""
    return (
      <Navigate
        to={`/login${reason}`}
        state={{ from: location }}
        replace
      />
    )
  }

  return (
    <MessengerProvider sellerId={seller.id ?? null} sellerName={seller.name}>
      <SidebarProvider>
        <SearchProvider>
          <Outlet />
        </SearchProvider>
      </SidebarProvider>
    </MessengerProvider>
  )
}
