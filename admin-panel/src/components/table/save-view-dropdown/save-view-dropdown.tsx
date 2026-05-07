import React from "react"
import {
  DropdownMenu,
  Button,
  usePrompt,
} from "@medusajs/ui"
import {
  CloudArrowUp,
} from "@medusajs/icons"
import { useTranslation } from "react-i18next"

interface SaveViewDropdownProps {
  isDefaultView: boolean
  currentViewId?: string | null
  currentViewName?: string | null
  onSaveAsDefault?: () => void
  onUpdateExisting?: () => void
  onSaveAsNew?: () => void
}

export const SaveViewDropdown: React.FC<SaveViewDropdownProps> = ({
  isDefaultView,
  currentViewId,
  currentViewName,
  onSaveAsDefault,
  onUpdateExisting,
  onSaveAsNew,
}) => {
  const prompt = usePrompt()
  const { t } = useTranslation()

  const handleSaveAsDefault = async () => {
    const result = await prompt({
      title: t("views.saveAsSystemDefault"),
      description: t("views.saveAsSystemDefaultDesc"),
      confirmText: t("views.saveAsDefaultBtn"),
      cancelText: t("actions.cancel"),
    })

    if (result && onSaveAsDefault) {
      onSaveAsDefault()
    }
  }

  const handleUpdateExisting = async () => {
    const result = await prompt({
      title: t("views.updateExistingView"),
      description: t("views.updateExistingViewDesc", { name: currentViewName }),
      confirmText: t("views.update"),
      cancelText: t("actions.cancel"),
    })

    if (result && onUpdateExisting) {
      onUpdateExisting()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button variant="secondary" size="small">
          {t("actions.save")}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {isDefaultView && onSaveAsDefault && (
          <DropdownMenu.Item onClick={handleSaveAsDefault}>
            <CloudArrowUp className="h-4 w-4" />
            {t("views.saveAsSystemDefault")}
          </DropdownMenu.Item>
        )}
        {!isDefaultView && currentViewId && onUpdateExisting && (
          <DropdownMenu.Item onClick={handleUpdateExisting}>
            <CloudArrowUp className="h-4 w-4" />
            {t("views.update")} "{currentViewName}"
          </DropdownMenu.Item>
        )}
        {onSaveAsNew && (
          <DropdownMenu.Item onClick={onSaveAsNew}>
            <CloudArrowUp className="h-4 w-4" />
            {t("views.saveAsNew")}
          </DropdownMenu.Item>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}