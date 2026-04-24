import { HttpTypes } from "@medusajs/types"

const getSymbol = (a: string | Date, symbol: string, b: string | Date) => {
  const dateA = new Date(a)
  const dateB = new Date(b)

  switch (symbol) {
    case "$gte":
      return dateA >= dateB
    case "$lte":
      return dateA <= dateB
    case "$gt":
      return dateA > dateB
    case "$lt":
      return dateA < dateB
    default:
      return dateA.getTime() === dateB.getTime()
  }
}

type SortField = "display_id" | "created_at" | "updated_at"
type SortDirection = "asc" | "desc"

const sortOrders = (
  orders: HttpTypes.AdminOrder[],
  sortField: SortField,
  direction: SortDirection
) => {
  return [...orders].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (sortField === "display_id") {
      return direction === "asc"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue)
    }

    // For dates
    const dateA = new Date(aValue as string)
    const dateB = new Date(bValue as string)
    return direction === "asc"
      ? dateA.getTime() - dateB.getTime()
      : dateB.getTime() - dateA.getTime()
  })
}

export const filterOrders = (
  orders?: HttpTypes.AdminOrder[],
  filters?: Record<string, any>,
  sort?: string
) => {
  if (!orders || !filters) return orders

  let filteredOrders = orders.filter((order) => {
    return Object.keys(filters).every((key: string) => {
      if (!filters[key]) return true

      if (key === "q") return true // handled separately below

      const orderValue = order[key as keyof HttpTypes.AdminOrder]

      if (key === "created_at" || key === "updated_at") {
        return Object.entries(filters[key]).every(([operator, value]) => {
          return getSymbol(orderValue as string, operator, value as string)
        })
      }

      return true
    })
  })

  const q = filters.q
  if (q && typeof q === "string" && q.length >= 2) {
    const term = q.toLowerCase()
    filteredOrders = filteredOrders.filter((order) => {
      const displayId = String(order.display_id ?? "").toLowerCase()
      const displayIdHash = `#${displayId}`
      const email = (order.email ?? "").toLowerCase()
      const customerEmail = (order.customer?.email ?? "").toLowerCase()
      const firstName = (order.customer?.first_name ?? "").toLowerCase()
      const lastName = (order.customer?.last_name ?? "").toLowerCase()
      const fullName = `${firstName} ${lastName}`.trim()
      const fullNameReverse = `${lastName} ${firstName}`.trim()
      const itemTitles = (order.items ?? [])
        .map((i) => (i.title ?? "").toLowerCase())
        .join(" ")
      return (
        displayId.includes(term) ||
        displayIdHash.includes(term) ||
        email.includes(term) ||
        customerEmail.includes(term) ||
        firstName.includes(term) ||
        lastName.includes(term) ||
        fullName.includes(term) ||
        fullNameReverse.includes(term) ||
        itemTitles.includes(term)
      )
    })
  }

  if (sort) {
    const isDescending = sort.startsWith("-")
    const field = isDescending ? sort.slice(1) : sort
    const direction = isDescending ? "desc" : "asc"

    if (["display_id", "created_at", "updated_at"].includes(field)) {
      filteredOrders = sortOrders(
        filteredOrders,
        field as SortField,
        direction as SortDirection
      )
    }
  }

  return filteredOrders
}
