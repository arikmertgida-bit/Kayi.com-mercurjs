import { HttpTypes } from "@medusajs/types"
import { keepPreviousData } from "@tanstack/react-query"
import { createTableAdapter, TableAdapter } from "../../../../../lib/table/table-adapters"
import { useOrders } from "../../../../../hooks/api/orders"
import { useOrderTableFilters } from "./use-order-table-filters"
import { orderColumnAdapter } from "../../../../../lib/table/entity-adapters"

/**
 * Create the order table adapter with all order-specific logic
 */
export function createOrderTableAdapter(): TableAdapter<HttpTypes.AdminOrder> {
  return createTableAdapter<HttpTypes.AdminOrder>({
    entity: "orders",
    queryPrefix: "o",
    pageSize: 20,
    columnAdapter: orderColumnAdapter,

    useData: (fields, params) => {
      const { orders, count, isError, error, isLoading } = useOrders(
        {
          fields,
          ...params,
        },
        {
          placeholderData: keepPreviousData,
        }
      )

      return {
        data: orders,
        count,
        isLoading,
        isError,
        error,
      }
    },

    getRowHref: (row) => `/orders/${row.id}`,

    emptyState: {
      empty: {
        heading: "No orders found",
      }
    }
  })
}

/**
 * Hook to get the order table adapter with filters
 */
export function useOrderTableAdapter(): TableAdapter<HttpTypes.AdminOrder> {
  const filters = useOrderTableFilters()
  const adapter = createOrderTableAdapter()

  // Add dynamic filters to the adapter
  return {
    ...adapter,
    filters,
  }
}
