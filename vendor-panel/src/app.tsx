import { useRef } from "react"
import { DashboardExtensionManager } from "./extensions"
import { Providers } from "./providers/providers"
import { RouterProvider } from "./providers/router-provider"

import displayModule from "virtual:medusa/displays"
import formModule from "virtual:medusa/forms"
import menuItemModule from "virtual:medusa/menu-items"
import widgetModule from "virtual:medusa/widgets"

import "./index.css"

function App() {
  const managerRef = useRef<DashboardExtensionManager | null>(null)
  if (!managerRef.current) {
    managerRef.current = new DashboardExtensionManager({
      displayModule,
      formModule,
      menuItemModule,
      widgetModule,
    })
  }
  return (
    <Providers api={managerRef.current.api}>
      <RouterProvider />
    </Providers>
  )
}

export default App
