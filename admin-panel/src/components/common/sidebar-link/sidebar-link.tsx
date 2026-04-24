import { ReactNode } from "react"
import { Link } from "react-router-dom"

import { TriangleRightMini } from "@medusajs/icons"
import { Text } from "@medusajs/ui"
import { IconAvatar } from "../icon-avatar"

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
        <div className="rounded-[18px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,248,251,0.96),_rgba(255,241,232,0.98))] px-4 py-3 shadow-[0_12px_24px_rgba(221,42,123,0.10)] transition-fg group-focus-visible:shadow-borders-interactive-with-active hover:bg-[linear-gradient(180deg,_rgba(255,243,248,1),_rgba(255,236,227,1))]">
          <div className="flex items-center gap-4">
            <IconAvatar>{icon}</IconAvatar>
            <div className="flex flex-1 flex-col">
              <Text size="small" leading="compact" weight="plus">
                {labelKey}
              </Text>
              <Text size="small" leading="compact" className="text-[#8a1d54]/70">
                {descriptionKey}
              </Text>
            </div>
            <div className="flex size-7 items-center justify-center">
              <TriangleRightMini className="text-ui-fg-muted rtl:rotate-180" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
