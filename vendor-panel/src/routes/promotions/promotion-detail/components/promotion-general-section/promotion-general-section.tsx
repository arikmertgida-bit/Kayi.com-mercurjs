import { PencilSquare, Trash } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Alert, Badge, Container, Copy, Heading, Text, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { useDeletePromotion } from "../../../../../hooks/api/promotions"
import { formatCurrency } from "../../../../../lib/format-currency"
import { formatPercentage } from "../../../../../lib/percentage-helpers"
import { StatusCell } from "../../../../../components/table/table-cells/promotion/status-cell"

/** HttpTypes.AdminPromotion lacks a metadata field — extend for runtime approval_status check. */
type PromotionWithMeta = HttpTypes.AdminPromotion & {
  metadata?: Record<string, unknown> | null
}

type PromotionGeneralSectionProps = {
  promotion: HttpTypes.AdminPromotion
}

function getDisplayValue(promotion: HttpTypes.AdminPromotion) {
  const value = promotion.application_method?.value

  if (!value) {
    return null
  }

  if (promotion.application_method?.type === "fixed") {
    const currency = promotion.application_method?.currency_code

    if (!currency) {
      return null
    }

    return formatCurrency(value, currency)
  } else if (promotion.application_method?.type === "percentage") {
    return formatPercentage(value)
  }

  return null
}

export const PromotionGeneralSection = ({
  promotion,
}: PromotionGeneralSectionProps) => {
  const { t } = useTranslation()
  const tStr = t as unknown as (key: string, options?: object) => string
  const prompt = usePrompt()
  const navigate = useNavigate()
  const { mutateAsync } = useDeletePromotion(promotion.id)

  const handleDelete = async () => {
    const confirm = await prompt({
      title: t("general.areYouSure"),
      description: t("promotions.deleteWarning", {
        code: promotion.code,
      }),
      verificationInstruction: t("general.typeToConfirm"),
      verificationText: promotion.code,
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!confirm) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        navigate("/promotions", { replace: true })
      },
    })
  }

  const displayValue = getDisplayValue(promotion)
  const isPendingApproval =
    (promotion as PromotionWithMeta).metadata?.seller_id !== undefined &&
    (promotion as PromotionWithMeta).metadata?.approval_status === "pending"

  return (
    <Container className="divide-y p-0">
      {isPendingApproval && (
        <Alert variant="warning" className="mx-6 my-4">
          {t("promotions.pendingApprovalBanner")}
        </Alert>
      )}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading>{promotion.code}</Heading>
        </div>

        <div className="flex items-center gap-x-2">
          <StatusCell promotion={promotion} />
          <ActionMenu
            groups={[
              {
                actions: [
                  ...(!isPendingApproval
                    ? [
                        {
                          icon: <PencilSquare />,
                          label: t("actions.edit"),
                          to: `/promotions/${promotion.id}/edit`,
                        },
                      ]
                    : []),
                ],
              },
              {
                actions: [
                  {
                    icon: <Trash />,
                    label: t("actions.delete"),
                    onClick: handleDelete,
                  },
                ],
              },
            ]}
          />
        </div>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" weight="plus" leading="compact">
          {t("promotions.fields.campaign")}
        </Text>

        <Text size="small" leading="compact" className="text-pretty">
          {promotion.is_automatic
            ? t("promotions.form.method.automatic.title")
            : t("promotions.form.method.code.title")}
        </Text>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" weight="plus" leading="compact">
          {t("fields.code")}
        </Text>

        <Copy
          content={promotion.code!}
          className="text-ui-tag-neutral-text"
          asChild
        >
          <Badge
            size="2xsmall"
            rounded="full"
            className="cursor-pointer text-pretty"
          >
            {promotion.code}
          </Badge>
        </Copy>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" weight="plus" leading="compact">
          {t("promotions.fields.type")}
        </Text>

        <Text size="small" leading="compact" className="text-pretty">
          {tStr(`promotions.form.type.${promotion.type}.title`, { defaultValue: promotion.type ?? "" })}
        </Text>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" weight="plus" leading="compact">
          {t("promotions.fields.value")}
        </Text>

        <div className="flex items-center gap-x-2">
          <Text className="inline" size="small" leading="compact">
            {displayValue || "-"}
          </Text>
          {promotion?.application_method?.type === "fixed" && (
            <Badge size="2xsmall" rounded="full">
              {promotion?.application_method?.currency_code?.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
        <Text size="small" weight="plus" leading="compact">
          {t("promotions.fields.allocation")}
        </Text>

        <Text size="small" leading="compact" className="text-pretty">
          {tStr(`promotions.form.allocation.${promotion.application_method?.allocation}.title`, { defaultValue: promotion.application_method?.allocation ?? "" })}
        </Text>
      </div>

      {(promotion as PromotionWithMeta).metadata?.broadcast_recipient_count != null && (
        <div className="text-ui-fg-subtle grid grid-cols-2 items-start px-6 py-4">
          <Text size="small" weight="plus" leading="compact">
            {t("promotions.fields.broadcastRecipients")}
          </Text>

          <Text size="small" leading="compact" className="text-pretty">
            {tStr("promotions.broadcastRecipientsCount", {
              count: (promotion as PromotionWithMeta).metadata?.broadcast_recipient_count as number,
              defaultValue: `${(promotion as PromotionWithMeta).metadata?.broadcast_recipient_count} müşteri`,
            })}
          </Text>
        </div>
      )}
    </Container>
  )
}
