import { CalendarMini, ShoppingCart, Tag, Users, Shopping } from "@medusajs/icons"
import { Button, Container, DatePicker, Heading, Popover, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
import { addDays, differenceInDays, format, subDays } from "date-fns"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useOrders } from "../../hooks/api/orders"
import { useProducts } from "../../hooks/api/products"
import { useCustomers } from "../../hooks/api/customers"
import { useSellers } from "../../hooks/api/sellers"
import { useAdminAnalytics } from "../../hooks/api/analytics"

// ─── Stat card (top row) ────────────────────────────────────────────────────

const StatCard = ({
  icon,
  label,
  value,
  to,
  isPending,
}: {
  icon: React.ReactNode
  label: string
  value: number | undefined
  to: string
  isPending: boolean
}) => (
  <Link to={to} className="block">
    <Container className="flex items-center gap-x-4 p-5 hover:bg-ui-bg-base-hover transition-colors cursor-pointer">
      <div className="bg-ui-bg-component flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ui-fg-subtle">
        {icon}
      </div>
      <div className="flex flex-col gap-y-0.5 min-w-0">
        <Text size="small" weight="plus" className="text-ui-fg-subtle truncate">
          {label}
        </Text>
        {isPending ? (
          <div className="bg-ui-bg-component h-6 w-16 animate-pulse rounded" />
        ) : (
          <Heading level="h2">{value?.toLocaleString() ?? "—"}</Heading>
        )}
      </div>
    </Container>
  </Link>
)

// ─── Chart tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  label?: string
  payload?: { dataKey: string; stroke: string; value: number }[]
}) => {
  const { t } = useTranslation()
  if (!active || !payload?.length) return null
  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-3 shadow-md">
      <p className="text-ui-fg-subtle text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-medium" style={{ color: p.stroke }}>
          {p.dataKey === "orders" ? t("orders.domain") : t("customers.domain")}: {p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Color map ───────────────────────────────────────────────────────────────

const lineColor = (key: string) =>
  key === "orders" ? "#2563eb" : key === "customers" ? "#60a5fa" : "#94a3b8"

// ─── Build chart data ─────────────────────────────────────────────────────────

const buildChartData = (
  rangeFrom: Date | undefined,
  rangeTo: Date | undefined,
  ordersByDay: { date: string; count: number }[],
  customersByDay: { date: string; count: number }[]
) => {
  const days =
    differenceInDays(
      rangeTo ?? addDays(new Date(), 1),
      rangeFrom ?? addDays(new Date(), -7)
    ) + 1

  return Array.from({ length: days }, (_, i) => {
    const date = format(subDays(rangeFrom ?? addDays(new Date(), i), -i), "yyyy-MM-dd")
    return {
      date,
      orders: Number(ordersByDay.find((d) => d.date === date)?.count ?? 0),
      customers: Number(customersByDay.find((d) => d.date === date)?.count ?? 0),
    }
  })
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const AdminDashboard = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Active chart lines (toggleable via sidebar buttons)
  const [activeLines, setActiveLines] = useState(["orders", "customers"])

  // Date range from URL params (defaults to last 7 days)
  const fromStr =
    searchParams.get("from") || format(addDays(new Date(), -7), "yyyy-MM-dd")
  const toStr = searchParams.get("to") || format(new Date(), "yyyy-MM-dd")
  const from = new Date(fromStr)
  const to = new Date(toStr)

  const updateDateRange = (newFrom: string, newTo: string) => {
    const p = new URLSearchParams(searchParams)
    p.set("from", format(new Date(newFrom), "yyyy-MM-dd"))
    p.set("to", format(new Date(newTo), "yyyy-MM-dd"))
    setSearchParams(p)
  }

  // ── Top-row stat hooks (moderate cache — 5 min) ──────────────────────────
  const { count: ordersCount, isPending: ordersPending } = useOrders({ limit: 1 })
  const { count: productsCount, isPending: productsPending } = useProducts({ limit: 1 })
  const { count: customersCount, isPending: customersPending } = useCustomers({ limit: 1 })
  const { count: sellersCount, isPending: sellersPending } = useSellers({ limit: 1 })

  // ── Analytics hook (24-hour cache — no real-time polling) ────────────────
  const { data: analytics, isPending: analyticsPending } = useAdminAnalytics({
    from: fromStr,
    to: toStr,
  })

  const chartData = buildChartData(
    from,
    to,
    analytics?.orders_by_day ?? [],
    analytics?.customers_by_day ?? []
  )

  const totals = chartData.reduce(
    (acc, d) => ({ orders: acc.orders + d.orders, customers: acc.customers + d.customers }),
    { orders: 0, customers: 0 }
  )

  const toggleLine = (key: string) =>
    setActiveLines((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )

  return (
    <div className="flex flex-col gap-y-3 p-6">
      {/* ── TOP: 4 stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<ShoppingCart />}
          label={t("orders.domain", "Siparişler")}
          value={ordersCount}
          to="/orders"
          isPending={ordersPending}
        />
        <StatCard
          icon={<Tag />}
          label={t("products.domain", "Ürünler")}
          value={productsCount}
          to="/products"
          isPending={productsPending}
        />
        <StatCard
          icon={<Shopping />}
          label={t("sellers.domain", "Sellers")}
          value={sellersCount}
          to="/sellers"
          isPending={sellersPending}
        />
        <StatCard
          icon={<Users />}
          label={t("customers.domain", "Müşteriler")}
          value={customersCount}
          to="/customers"
          isPending={customersPending}
        />
      </div>

      {/* ── BOTTOM: Analytics ─────────────────────────────────────────── */}
      <Container className="divide-y p-0">
        {/* Header + date picker */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>Analytics</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("dashboard.analyticsSubtitle", "See your store's progress")}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <CalendarMini className="text-ui-fg-subtle" />
            <DatePicker
              value={from}
              onChange={(d) => d && updateDateRange(format(d, "yyyy-MM-dd"), toStr)}
            />
            <span className="text-ui-fg-subtle text-sm">–</span>
            <DatePicker
              value={to}
              onChange={(d) => d && updateDateRange(fromStr, format(d, "yyyy-MM-dd"))}
            />
          </div>
        </div>

        {/* Chart + sidebar */}
        <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Line chart — fixed height prevents CLS */}
          <div className="col-span-1 lg:col-span-3 h-[200px] md:h-[300px]">
            {analyticsPending ? (
              <div className="h-full w-full bg-ui-bg-component animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <CartesianGrid stroke="#333" vertical={false} />
                  <Tooltip content={CustomTooltip as any} />
                  {activeLines.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={lineColor(key)}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Sidebar metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            {/* Siparişler — toggles chart line */}
            <Button
              variant="secondary"
              className="p-4 border rounded-lg w-full flex-col items-start"
              onClick={() => toggleLine("orders")}
            >
              <Heading level="h3">Siparişler</Heading>
              <div className="flex gap-2 items-center mt-2">
                <div
                  className="h-8 w-1 rounded"
                  style={{
                    backgroundColor: activeLines.includes("orders")
                      ? lineColor("orders")
                      : "gray",
                  }}
                />
                <Text className="text-ui-fg-subtle">
                  {analyticsPending ? "…" : totals.orders}
                </Text>
              </div>
            </Button>

            {/* Ürünler — static total (24h cache) */}
            <Button
              variant="secondary"
              className="p-4 border rounded-lg w-full flex-col items-start"
              onClick={() => {}}
            >
              <Heading level="h3">Ürünler</Heading>
              <div className="flex gap-2 items-center mt-2">
                <div className="h-8 w-1 rounded bg-ui-fg-muted" />
                <Text className="text-ui-fg-subtle">
                  {analyticsPending ? "…" : (analytics?.total_products ?? 0)}
                </Text>
              </div>
            </Button>

            {/* Sellers — only those with published products (24h cache) */}
            <Button
              variant="secondary"
              className="p-4 border rounded-lg w-full flex-col items-start"
              onClick={() => {}}
            >
              <Heading level="h3">Sellers</Heading>
              <div className="flex gap-2 items-center mt-2">
                <div className="h-8 w-1 rounded bg-ui-fg-muted" />
                <Text className="text-ui-fg-subtle">
                  {analyticsPending ? "…" : (analytics?.active_sellers ?? 0)}
                </Text>
              </div>
            </Button>

            {/* Müşteriler — toggles chart line */}
            <Button
              variant="secondary"
              className="p-4 border rounded-lg w-full flex-col items-start"
              onClick={() => toggleLine("customers")}
            >
              <Heading level="h3">Müşteriler</Heading>
              <div className="flex gap-2 items-center mt-2">
                <div
                  className="h-8 w-1 rounded"
                  style={{
                    backgroundColor: activeLines.includes("customers")
                      ? lineColor("customers")
                      : "gray",
                  }}
                />
                <Text className="text-ui-fg-subtle">
                  {analyticsPending ? "…" : totals.customers}
                </Text>
              </div>
            </Button>
          </div>
        </div>
      </Container>
    </div>
  )
}

