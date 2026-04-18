import { Navigate, Outlet, useLocation } from "react-router-dom"

export const Settings = () => {
  const location = useLocation()

  if (location.pathname === "/settings") {
    return <Navigate to="/settings/store" replace />
  }

  return <Outlet />
}
