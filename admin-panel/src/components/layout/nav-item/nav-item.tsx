import { Kbd, Text, clx } from "@medusajs/ui"
import { Collapsible as RadixCollapsible } from "radix-ui"
import {
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { NavLink, useLocation } from "react-router-dom"
import { useGlobalShortcuts } from "../../../providers/keybind-provider/hooks"
import { ConditionalTooltip } from "../../common/conditional-tooltip"

type ItemType = "core" | "extension" | "setting"

type NestedItemProps = {
  label: string
  to: string
}

export type INavItem = {
  icon?: ReactNode
  label: string
  to: string
  items?: NestedItemProps[]
  type?: ItemType
  from?: string
  nested?: string
  badge?: number
}

const BASE_NAV_LINK_CLASSES =
  "flex items-center gap-x-2 rounded-xl py-1 pl-2 pr-2 outline-none transition-fg text-ui-fg-subtle hover:bg-ui-bg-base-hover focus-visible:shadow-borders-focus"
const ACTIVE_NAV_LINK_CLASSES =
  "bg-ui-bg-base-pressed text-ui-fg-base"
const NESTED_NAV_LINK_CLASSES = "w-full pl-[34px] pr-2 py-1 text-ui-fg-subtle"
const SETTING_NAV_LINK_CLASSES = "pl-2 py-1"

const getIsOpen = (
  to: string,
  items: NestedItemProps[] | undefined,
  pathname: string
) => {
  return [to, ...(items?.map((i) => i.to) ?? [])].some((p) =>
    pathname.startsWith(p)
  )
}

const NavItemTooltip = ({
  to,
  children,
}: PropsWithChildren<{ to: string }>) => {
  const { t } = useTranslation()
  const globalShortcuts = useGlobalShortcuts()
  const shortcut = globalShortcuts.find((s) => s.to === to)

  return (
    <ConditionalTooltip
      showTooltip={!!shortcut}
      maxWidth={9999} // Don't limit the width of the tooltip
      content={
        <div className="txt-compact-xsmall flex h-5 items-center justify-between gap-x-2 whitespace-nowrap">
          <span>{shortcut?.label}</span>
          <div className="flex items-center gap-x-1">
            {shortcut?.keys.Mac?.map((key, index) => (
              <div className="flex items-center gap-x-1" key={index}>
                <Kbd key={key}>{key}</Kbd>
                {index < (shortcut.keys.Mac?.length || 0) - 1 && (
                  <span className="text-ui-fg-muted txt-compact-xsmall">
                    {t("app.keyboardShortcuts.then")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      }
      side="right"
      delayDuration={1500}
    >
      <div className="w-full">{children}</div>
    </ConditionalTooltip>
  )
}

export const NavItem = ({
  icon,
  label,
  to,
  items,
  type = "core",
  from,
  badge,
}: INavItem) => {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(getIsOpen(to, items, pathname))

  useEffect(() => {
    setOpen(getIsOpen(to, items, pathname))
  }, [pathname, to, items])

  const navLinkClassNames = useCallback(
    ({
      to,
      isActive,
      isNested = false,
      isSetting = false,
    }: {
      to: string
      isActive: boolean
      isNested?: boolean
      isSetting?: boolean
    }) => {
      if (["core", "setting"].includes(type)) {
        isActive = pathname.startsWith(to)
      }

      return clx(BASE_NAV_LINK_CLASSES, {
        [NESTED_NAV_LINK_CLASSES]: isNested,
        [ACTIVE_NAV_LINK_CLASSES]: isActive,
        [SETTING_NAV_LINK_CLASSES]: isSetting,
      })
    },
    [type, pathname]
  )

  const isSetting = type === "setting"

  return (
    <div className="px-3">
      <NavItemTooltip to={to}>
        <NavLink
          to={to}
          end={items?.some((i) => i.to === pathname)}
          state={
            from
              ? {
                  from,
                }
              : undefined
          }
          className={({ isActive }) => {
            return clx(navLinkClassNames({ isActive, isSetting, to }), {
              "max-lg:hidden": !!items?.length,
            })
          }}
        >
          {type !== "setting" && (
            <div className="flex size-6 items-center justify-center">
              <Icon icon={icon} type={type} />
            </div>
          )}
          <Text size="small" weight="plus" leading="compact">
            {label}
          </Text>
          {badge != null && badge > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white leading-none">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </NavLink>
      </NavItemTooltip>
      {items && items.length > 0 && (
        <RadixCollapsible.Root open={open} onOpenChange={setOpen}>
          <RadixCollapsible.Trigger
            className={clx(
              "flex w-full items-center gap-x-2 rounded-xl py-1 pl-2 pr-2 outline-none transition-fg hover:bg-ui-bg-base-hover lg:hidden",
              { "pl-2": isSetting }
            )}
          >
            <div className="flex size-6 items-center justify-center">
              <Icon icon={icon} type={type} />
            </div>
            <Text size="small" weight="plus" leading="compact">
              {label}
            </Text>
          </RadixCollapsible.Trigger>
          <RadixCollapsible.Content>
            <div className="flex flex-col gap-y-0.5 pb-2 pt-0.5">
              <ul className="flex flex-col gap-y-0.5">
                <li className="flex w-full items-center gap-x-1 lg:hidden">
                  <NavItemTooltip to={to}>
                    <NavLink
                      to={to}
                      end
                      className={({ isActive }) => {
                        return clx(
                          navLinkClassNames({
                            to,
                            isActive,
                            isSetting,
                            isNested: true,
                          })
                        )
                      }}
                    >
                      <Text size="small" weight="plus" leading="compact">
                        {label}
                      </Text>
                    </NavLink>
                  </NavItemTooltip>
                </li>
                {items.map((item) => {
                  return (
                    <li key={item.to} className="flex h-7 items-center">
                      <NavItemTooltip to={item.to}>
                        <NavLink
                          to={item.to}
                          end
                          className={({ isActive }) => {
                            return clx(
                              navLinkClassNames({
                                to: item.to,
                                isActive,
                                isSetting,
                                isNested: true,
                              })
                            )
                          }}
                        >
                          <Text size="small" weight="plus" leading="compact">
                            {item.label}
                          </Text>
                        </NavLink>
                      </NavItemTooltip>
                    </li>
                  )
                })}
              </ul>
            </div>
          </RadixCollapsible.Content>
        </RadixCollapsible.Root>
      )}
    </div>
  )
}

const Icon = ({ icon, type }: { icon?: ReactNode; type: ItemType }) => {
  if (!icon) {
    return null
  }

  return type === "extension" ? (
    <div className="flex h-5 w-5 items-center justify-center rounded-[6px] bg-ui-bg-base shadow-elevation-card-rest">
      <div className="h-[15px] w-[15px] overflow-hidden rounded-sm">{icon}</div>
    </div>
  ) : (
    icon
  )
}
