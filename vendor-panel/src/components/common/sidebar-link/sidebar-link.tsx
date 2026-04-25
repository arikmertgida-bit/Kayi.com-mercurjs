import { ReactNode } from "react"
import { Link } from "react-router-dom"

import { IconAvatar } from "../icon-avatar"
import { Text } from "@medusajs/ui"
import { TriangleRightMini } from "@medusajs/icons"

export interface SidebarLinkProps {
  to: string
  labelKey: string
  descriptionKey: string
  icon: ReactNode
}

export const SidebarLink = ({
  to,
  labelKey,
  descriptionKey,
  icon,
}: SidebarLinkProps) => {
  return (
    <Link to={to} className="group outline-none">
      <div className="flex flex-col gap-2 px-2 pb-2">
        <div className="rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-3 shadow-elevation-card-rest transition-fg group-focus-visible:shadow-borders-interactive-with-active hover:bg-ui-bg-base-hover">
          <div className="flex items-center gap-4">
            <IconAvatar>{icon}</IconAvatar>
            <div className="flex flex-1 flex-col">
              <Text size="small" leading="compact" weight="plus">
                {labelKey}
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {descriptionKey}
              </Text>
            </div>
            <div className="flex size-7 items-center justify-center">
              <TriangleRightMini className="text-ui-fg-muted" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
