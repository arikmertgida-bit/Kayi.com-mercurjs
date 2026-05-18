import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import {
  useOrderReturnRequest,
  useUpdateOrderReturnRequest,
  useReturnShipment,
  useApproveReturnRequest,
  useMarkShippedBack,
  useMarkReturnReceived,
  type ReturnShipment,
  type OrderReturnRequest,
  type ApprovedItem,
} from "../../../hooks/api/requests"
import { RouteDrawer } from "../../../components/modals"
import { Button, Select, Textarea, toast, Badge, Input } from "@medusajs/ui"
import { useForm, useController } from "react-hook-form"
import { Form } from "../../../components/common/form"
import { useStockLocations } from "../../../hooks/api"
import { useMemo } from "react"
import {
  LineItemsReturnSelector,
  type ReturnLineItemOption,
} from "../../../components/return-items/LineItemsReturnSelector"

const STATUS_OPTIONS = ["refunded", "escalated"]

function PhaseActions({
  returnRequestId,
  shipment,
  orderReturnRequest,
}: {
  returnRequestId: string
  shipment: ReturnShipment | undefined
  orderReturnRequest: OrderReturnRequest
}) {
  const { t } = useTranslation()
  const approveForm = useForm<{ carrier?: string; approved_items: ApprovedItem[] }>({
    defaultValues: { carrier: "", approved_items: [] },
  })
  const shippedForm = useForm<{ tracking_number?: string }>({ defaultValues: { tracking_number: "" } })

  const { field: approvedItemsField } = useController({
    control: approveForm.control,
    name: "approved_items",
  })

  const lineItemOptions = useMemo((): ReturnLineItemOption[] => {
    if (!orderReturnRequest?.line_items) return []
    return orderReturnRequest.line_items.map((li) => {
      const orderItem = orderReturnRequest.order?.items?.find(
        (oi) => oi.id === li.line_item_id
      )
      return {
        line_item_id: li.line_item_id,
        product_title: orderItem?.product_title ?? li.line_item_id,
        thumbnail: orderItem?.thumbnail ?? null,
        requested_quantity: li.quantity,
        unit_price: orderItem?.unit_price ?? 0,
        currency_code: orderReturnRequest.order?.currency_code ?? "try",
      }
    })
  }, [orderReturnRequest])

  const { mutate: approve, isPending: approving } = useApproveReturnRequest(returnRequestId)
  const { mutate: markShipped, isPending: markingShipped } = useMarkShippedBack(returnRequestId)
  const { mutate: markReceived, isPending: markingReceived } = useMarkReturnReceived(returnRequestId)

  if (!shipment) {
    return (
      <div className="mt-6 border rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium">{t("returns.shipment.approveSection")}</h3>
        <Form {...approveForm}>
          <form
            onSubmit={approveForm.handleSubmit((data) =>
              approve(
                {
                  carrier: data.carrier || undefined,
                  approved_items: data.approved_items.length > 0 ? data.approved_items : undefined,
                },
                {
                  onSuccess: () => toast.success(t("returns.shipment.approveSuccess")),
                  onError: (err) => toast.error(err.message),
                }
              )
            )}
          >
            <Form.Field
              control={approveForm.control}
              name="carrier"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("returns.shipment.carrier")}</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder={t("returns.shipment.carrierPlaceholder")} />
                  </Form.Control>
                </Form.Item>
              )}
            />
            {lineItemOptions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">{t("returns.selector.title")}</h4>
                <LineItemsReturnSelector
                  lineItems={lineItemOptions}
                  value={approvedItemsField.value}
                  onChange={approvedItemsField.onChange}
                  disabled={approving}
                />
              </div>
            )}
            <div className="flex justify-end mt-4">
              <Button type="submit" isLoading={approving}>
                {t("returns.shipment.approve")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    )
  }

  const phaseBadgeColor =
    shipment.phase === "awaiting_shipment"
      ? "blue"
      : shipment.phase === "in_transit"
      ? "orange"
      : "green"

  return (
    <div className="mt-6 border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t("returns.shipment.title")}</h3>
        <Badge color={phaseBadgeColor}>
          {t(`returns.shipment.phases.${shipment.phase}`)}
        </Badge>
      </div>

      {shipment.tracking_number && (
        <p className="text-sm text-neutral-500">
          {t("returns.shipment.trackingNumber")}: <span className="font-mono">{shipment.tracking_number}</span>
        </p>
      )}

      {shipment.phase === "awaiting_shipment" && (
        <Form {...shippedForm}>
          <form
            onSubmit={shippedForm.handleSubmit((data) =>
              markShipped(
                { tracking_number: data.tracking_number || undefined },
                {
                  onSuccess: () => toast.success(t("returns.shipment.shippedSuccess")),
                  onError: (err) => toast.error(err.message),
                }
              )
            )}
          >
            <Form.Field
              control={shippedForm.control}
              name="tracking_number"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("returns.shipment.trackingNumber")}</Form.Label>
                  <Form.Control>
                    <Input {...field} placeholder={t("returns.shipment.trackingPlaceholder")} />
                  </Form.Control>
                </Form.Item>
              )}
            />
            <div className="flex justify-end mt-4">
              <Button type="submit" isLoading={markingShipped}>
                {t("returns.shipment.markShipped")}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {shipment.phase === "in_transit" && (
        <div className="flex justify-end">
          <Button
            isLoading={markingReceived}
            onClick={() =>
              markReceived(undefined, {
                onSuccess: () => toast.success(t("returns.shipment.receivedSuccess")),
                onError: (err) => toast.error(err.message),
              })
            }
          >
            {t("returns.shipment.markReceived")}
          </Button>
        </div>
      )}

      {shipment.phase === "received" && (
        <p className="text-sm text-green-600">{t("returns.shipment.allDone")}</p>
      )}
    </div>
  )
}

export function RequestOrderReturn() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { order_return_request, isLoading } = useOrderReturnRequest(id!)
  const { return_shipment, isLoading: shipmentLoading } = useReturnShipment(id!, {
    retry: false,
  })

  const { stock_locations, isLoading: isStockLocationsLoading } =
    useStockLocations()

  const form = useForm({
    defaultValues: {
      status: STATUS_OPTIONS[0],
      vendor_reviewer_note: order_return_request?.vendor_reviewer_note || "",
      location_id: undefined,
    },
  })

  const { mutate: updateOrderReturnRequest } = useUpdateOrderReturnRequest(id!)

  const handleUpdateOrderReturnRequest = async (payload: any) => {
    updateOrderReturnRequest(payload, {
      onSuccess: () => {
        navigate("/requests/orders", { replace: true })
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })
  }

  if (isLoading || isStockLocationsLoading) {
    return <div>{t("labels.loading")}</div>
  }

  return (
    <RouteDrawer prev="/requests/orders">
      <RouteDrawer.Header>
        <RouteDrawer.Title>
          {t("requests.orderReturns.drawerTitle", { orderId: order_return_request.order.display_id })}
        </RouteDrawer.Title>
      </RouteDrawer.Header>
      <RouteDrawer.Body>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdateOrderReturnRequest)}>
            <Form.Field
              control={form.control}
              name="status"
              render={({ field: { onChange, value, ...field } }) => {
                return (
                  <Form.Item>
                    <Form.Label>{t("requests.detail.status")}</Form.Label>
                    <Form.Control>
                      <Select
                        {...field}
                        onValueChange={onChange}
                        defaultValue={STATUS_OPTIONS[0]}
                      >
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          {STATUS_OPTIONS.map((reason, index) => (
                            <Select.Item
                              key={`select-option-${index}`}
                              value={reason}
                            >
                              {t(`requests.statuses.${reason}`, { defaultValue: reason })}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </Form.Control>
                  </Form.Item>
                )
              }}
            />
            {form.watch("status") === "refunded" &&
              (stock_locations || []).length > 0 && (
                <Form.Field
                  control={form.control}
                  name="location_id"
                  render={({ field: { onChange, value, ...field } }) => (
                    <Form.Item className="mt-4">
                      <Form.Label>{t("requests.detail.location")}</Form.Label>
                      <Form.Control>
                        <Select {...field} onValueChange={onChange}>
                          <Select.Trigger>
                            <Select.Value />
                          </Select.Trigger>
                          <Select.Content>
                            {stock_locations?.map((sl, index) => (
                              <Select.Item
                                key={`select-sl-${index}`}
                                value={sl.id}
                              >
                                {sl.name}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </Form.Control>
                    </Form.Item>
                  )}
                />
              )}
            <Form.Field
              control={form.control}
              name="vendor_reviewer_note"
              render={({ field }) => {
                return (
                  <Form.Item className="mt-4">
                    <Form.Label>{t("requests.detail.vendorNote")}</Form.Label>
                    <Form.Control>
                      <Textarea {...field} rows={4} />
                    </Form.Control>
                  </Form.Item>
                )
              }}
            />
            <div className="flex justify-end mt-8">
              <Button type="submit">{t("requests.detail.submit")}</Button>
            </div>
          </form>
        </Form>

        {!shipmentLoading && (
          <PhaseActions
            returnRequestId={id!}
            shipment={return_shipment}
            orderReturnRequest={order_return_request}
          />
        )}
      </RouteDrawer.Body>
    </RouteDrawer>
  )
}

