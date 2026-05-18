import { useCallback, useMemo } from "react"
import { Checkbox, Input } from "@medusajs/ui"
import { getLocaleAmount } from "../../lib/money-amount-helpers"

export interface ApprovedItem {
  line_item_id: string
  quantity: number
}

export interface ReturnLineItemOption {
  line_item_id: string
  product_title: string
  thumbnail: string | null
  requested_quantity: number
  unit_price: number
  currency_code: string
}

interface Props {
  lineItems: ReturnLineItemOption[]
  value: ApprovedItem[]
  onChange: (items: ApprovedItem[]) => void
  disabled?: boolean
}

export function LineItemsReturnSelector({ lineItems, value, onChange, disabled }: Props) {
  const approvedMap = useMemo(
    () => new Map(value.map((item) => [item.line_item_id, item.quantity])),
    [value]
  )

  const handleCheck = useCallback(
    (lineItemId: string, checked: boolean, maxQty: number) => {
      if (checked) {
        onChange([...value.filter((i) => i.line_item_id !== lineItemId), { line_item_id: lineItemId, quantity: maxQty }])
      } else {
        onChange(value.filter((i) => i.line_item_id !== lineItemId))
      }
    },
    [value, onChange]
  )

  const handleQuantityChange = useCallback(
    (lineItemId: string, rawValue: string, maxQty: number) => {
      const parsed = parseInt(rawValue, 10)
      const qty = isNaN(parsed) ? 1 : Math.max(1, Math.min(parsed, maxQty))
      onChange(value.map((i) => (i.line_item_id === lineItemId ? { ...i, quantity: qty } : i)))
    },
    [value, onChange]
  )

  return (
    <div className="space-y-3">
      {lineItems.map((item) => {
        const isChecked = approvedMap.has(item.line_item_id)
        const currentQty = approvedMap.get(item.line_item_id) ?? item.requested_quantity

        return (
          <div
            key={item.line_item_id}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors"
            style={{ minHeight: "72px" }}
          >
            <Checkbox
              checked={isChecked}
              onCheckedChange={(checked) =>
                handleCheck(item.line_item_id, !!checked, item.requested_quantity)
              }
              disabled={disabled}
            />
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={item.product_title}
                width={48}
                height={48}
                className="rounded object-cover flex-shrink-0 h-12 w-12"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.product_title}</p>
              <p className="text-xs text-neutral-500">
                {getLocaleAmount(item.unit_price, item.currency_code)}
                {" · "}
                Talep: {item.requested_quantity} adet
              </p>
            </div>
            <Input
              type="number"
              min={1}
              max={item.requested_quantity}
              value={isChecked ? currentQty : ""}
              disabled={!isChecked || disabled}
              onChange={(e) => handleQuantityChange(item.line_item_id, e.target.value, item.requested_quantity)}
              className="w-16 text-center"
            />
          </div>
        )
      })}
    </div>
  )
}
