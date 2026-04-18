import { useRef } from "react"
import { DashboardApp } from "./dashboard-app"
import { DashboardPlugin } from "./dashboard-app/types"

import displayModule from "virtual:medusa/displays"
import formModule from "virtual:medusa/forms"
import menuItemModule from "virtual:medusa/menu-items"
import routeModule from "virtual:medusa/routes"
import widgetModule from "virtual:medusa/widgets"

import "./index.css"

const localPlugin = {
  widgetModule,
  routeModule,
  displayModule,
  formModule,
  menuItemModule,
}

interface AppProps {
  plugins?: DashboardPlugin[]
}

function App({ plugins = [] }: AppProps) {
  const appRef = useRef<DashboardApp | null>(null)
  if (!appRef.current) {
    appRef.current = new DashboardApp({
      plugins: [localPlugin, ...plugins],
    })
  }

  return <div>{appRef.current.render()}</div>
}

export default App
