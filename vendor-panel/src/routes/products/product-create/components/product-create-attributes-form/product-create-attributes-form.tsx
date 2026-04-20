import { Heading, Input, Switch, Textarea, Text, Badge } from "@medusajs/ui"
import { InformationCircleSolid } from "@medusajs/icons"
import { Tooltip } from "@medusajs/ui"
import { UseFormReturn, useController } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useAllAttributes } from "../../../../../hooks/api/products"
import { ProductAttribute } from "../../../../../types/products"
import { z } from "zod"
import { ProductCreateSchema } from "../../constants"

type ProductCreateFormValues = z.infer<typeof ProductCreateSchema>

type Props = {
  form: UseFormReturn<ProductCreateFormValues>
}

const AttributeField = ({
  attribute,
  form,
}: {
  attribute: ProductAttribute
  form: UseFormReturn<ProductCreateFormValues>
}) => {
  const fieldName = `attribute_values.${attribute.id}` as any
  const { field } = useController({ control: form.control, name: fieldName, defaultValue: "" })

  const { ui_component, possible_values } = attribute

  const renderInput = () => {
    if (ui_component === "select") {
      return (
        <select
          {...field}
          className="bg-ui-bg-field border border-ui-border-base rounded-md px-3 py-2 text-sm text-black w-full focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
        >
          <option value="" className="text-black">-- Seçiniz --</option>
          {possible_values?.map((pv) => (
            <option key={pv.id} value={pv.value} className="text-black">
              {pv.value}
            </option>
          ))}
        </select>
      )
    }

    if (ui_component === "toggle") {
      return (
        <Switch
          {...field}
          onCheckedChange={(checked) => field.onChange(String(checked))}
          checked={field.value === "true" || field.value === true}
        />
      )
    }

    if (ui_component === "text_area") {
      return <Textarea {...field} rows={3} className="w-full" />
    }

    if (ui_component === "unit") {
      return <Input type="number" {...field} className="w-full" />
    }

    return <Input {...field} className="w-full" />
  }

  return (
    <div className="flex flex-col gap-y-1.5">
      <div className="flex items-center gap-x-1.5">
        <Text size="small" weight="plus" className="text-ui-fg-base">
          {attribute.name}
        </Text>
        {attribute.description && (
          <Tooltip content={attribute.description}>
            <InformationCircleSolid className="text-ui-fg-muted w-4 h-4 cursor-help" />
          </Tooltip>
        )}
      </div>
      {renderInput()}
    </div>
  )
}

export const ProductCreateAttributesForm = ({ form }: Props) => {
  const { t } = useTranslation()
  const { attributes, isLoading } = useAllAttributes()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Text size="small" className="text-ui-fg-subtle">
          {t("general.loading", "Yükleniyor...")}
        </Text>
      </div>
    )
  }

  if (!attributes || attributes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-y-2">
        <Text size="small" className="text-ui-fg-subtle">
          {t("products.create.attributes.empty", "Henüz bir özellik tanımlanmamış.")}
        </Text>
      </div>
    )
  }

  // Kategoriye bağlı ve global attribute'ları ayır
  const globalAttrs = attributes.filter(
    (a) => !a.product_categories || a.product_categories.length === 0
  )
  const categoryAttrs = attributes.filter(
    (a) => a.product_categories && a.product_categories.length > 0
  )

  return (
    <div className="flex flex-col gap-y-8 p-8">
      <div className="flex flex-col gap-y-1">
        <Heading level="h2">
          {t("products.create.attributes.heading", "Ürün Özellikleri")}
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t(
            "products.create.attributes.description",
            "Ürünün Marka, Renk, Cinsiyet gibi özelliklerini belirtin. Bu bilgiler filtreleme ve arama için kullanılır."
          )}
        </Text>
      </div>

      {globalAttrs.length > 0 && (
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center gap-x-2">
            <Text size="small" weight="plus" className="text-ui-fg-subtle uppercase tracking-wider">
              {t("products.create.attributes.global", "Genel Özellikler")}
            </Text>
            <Badge size="xsmall" color="grey">{globalAttrs.length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {globalAttrs.map((attr) => (
              <AttributeField key={attr.id} attribute={attr} form={form} />
            ))}
          </div>
        </div>
      )}

      {categoryAttrs.length > 0 && (
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center gap-x-2">
            <Text size="small" weight="plus" className="text-ui-fg-subtle uppercase tracking-wider">
              {t("products.create.attributes.category", "Kategori Özellikleri")}
            </Text>
            <Badge size="xsmall" color="blue">{categoryAttrs.length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {categoryAttrs.map((attr) => (
              <AttributeField key={attr.id} attribute={attr} form={form} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
