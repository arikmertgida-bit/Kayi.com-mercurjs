import { ShoppingCart, Tag, Users, Shopping } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { useOrders } from "../../hooks/api/orders"
import { useProducts } from "../../hooks/api/products"
import { useCustomers } from "../../hooks/api/customers"
import { useSellers } from "../../hooks/api/sellers"

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
}) => {
  return (
    <Link to={to} className="block">
      <Container className="flex items-center gap-x-4 p-5 hover:bg-ui-bg-base-hover transition-colors cursor-pointer">
        <div className="bg-ui-bg-component flex h-10 w-10 items-center justify-center rounded-lg text-ui-fg-subtle">
          {icon}
        </div>
        <div className="flex flex-col gap-y-0.5">
          <Text size="small" weight="plus" className="text-ui-fg-subtle">
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
}

export const AdminDashboard = () => {
  const { t } = useTranslation()

  const { orders, count: ordersCount, isPending: ordersPending } = useOrders({ limit: 1 })
  const { products, count: productsCount, isPending: productsPending } = useProducts({ limit: 1 })
  const { customers, count: customersCount, isPending: customersPending } = useCustomers({ limit: 1 })
  const { sellers, count: sellersCount, isPending: sellersPending } = useSellers({ limit: 1 })

  return (
    <div className="flex flex-col gap-y-6 p-6 max-w-4xl">
      <div className="flex flex-col gap-y-1">
        <Heading level="h1">{t("dashboard.domain", "Dashboard")}</Heading>
        <Text className="text-ui-fg-subtle">{t("dashboard.subtitle", "Overview of your store")}</Text>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          icon={<ShoppingCart />}
          label={t("orders.domain", "Orders")}
          value={ordersCount}
          to="/orders"
          isPending={ordersPending}
        />
        <StatCard
          icon={<Tag />}
          label={t("products.domain", "Products")}
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
          label={t("customers.domain", "Customers")}
          value={customersCount}
          to="/customers"
          isPending={customersPending}
        />
      </div>
    </div>
  )
}
