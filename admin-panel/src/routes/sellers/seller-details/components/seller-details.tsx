import type { AdminProductListResponse } from "@medusajs/types";

import { useParams } from "react-router-dom";

import type { AdminCustomerGroupListResponse } from "@custom-types/customer-group";
import type { AdminOrderListResponse } from "@custom-types/order";
import type { VendorSeller } from "@custom-types/seller";

import {
  useSeller,
  useSellerByHandle,
  useSellerCustomerGroups,
  useSellerOrders,
  useSellerProducts,
} from "@hooks/api/sellers";
import { useSellerOrdersTableQuery } from "@hooks/table/query";

import { SellerCustomerGroupsSection } from "@routes/sellers/common/components/seller-customer-groups-section";
import { SellerGeneralSection } from "@routes/sellers/common/components/seller-general-section";
import { SellerOrdersSection } from "@routes/sellers/common/components/seller-orders-section";
import { SellerProductsSection } from "@routes/sellers/common/components/seller-products-section";
import { SellerStockLocationsSection } from "@routes/sellers/common/components/seller-stock-locations-section";

const PAGE_SIZE = 10;
const ORDER_PREFIX = "so";
const PRODUCT_PREFIX = "sp";
const CUSTOMER_GROUP_PREFIX = "scg";

export const SellerDetails = () => {
  const { id: routeParam } = useParams();

  // Detect whether the route param is a seller ID (sel_ prefix) or a handle
  const isId = routeParam?.startsWith("sel_");
  const id = isId ? routeParam : undefined;
  const handle = isId ? undefined : routeParam;

  // Fetch by handle when needed, then redirect to keep canonical URL as handle
  const { seller: sellerByHandle, isLoading: handleLoading } =
    useSellerByHandle(handle);

  // Once we resolve handle → ID, use that ID for the rest of the queries
  const resolvedId = id ?? sellerByHandle?.id ?? "";

  const { searchParams: orderSearchParams } = useSellerOrdersTableQuery({
    pageSize: PAGE_SIZE,
    offset: 0,
    prefix: ORDER_PREFIX,
  });

  const { searchParams: productSearchParams } = useSellerOrdersTableQuery({
    pageSize: PAGE_SIZE,
    offset: 0,
    prefix: PRODUCT_PREFIX,
  });

  const { searchParams: customerGroupSearchParams } = useSellerOrdersTableQuery(
    {
      pageSize: PAGE_SIZE,
      offset: 0,
      prefix: CUSTOMER_GROUP_PREFIX,
    },
  );

  const { data, isLoading } = useSeller(resolvedId);

  const { data: orders, isLoading: ordersLoading } = useSellerOrders(
    resolvedId,
    {
      fields:
        "id,display_id,created_at,updated_at,*customer,currency_code,total,fulfillment_status,payment_status,status,region_id,sales_channel_id",
    },
    orderSearchParams,
  );

  const {
    data: products,
    isLoading: productsLoading,
    refetch: productsRefetch,
  } = useSellerProducts(
    resolvedId,
    {
      fields:
        "*collection,+type_id,+tag_id,+sales_channel_id,+status,+created_at,+updated_at",
    },
    productSearchParams,
  );

  const {
    data: customerGroups,
    isLoading: customerGroupsLoading,
    refetch: customerGroupsRefetch,
  } = useSellerCustomerGroups(
    resolvedId,
    {
      fields: "id,name,description,created_at,updated_at,*customers",
    },
    customerGroupSearchParams,
  );

  // While handle is being resolved
  if (handleLoading) {
    return <div>Loading...</div>;
  }

  // Handle given but no seller found with that handle
  if (handle && !resolvedId) {
    return <div>Seller not found</div>;
  }

  // Data loading
  if (isLoading || ordersLoading || productsLoading || customerGroupsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <SellerGeneralSection seller={data?.seller as VendorSeller} />
      <SellerOrdersSection seller_orders={orders as AdminOrderListResponse} />
      <SellerProductsSection
        seller_products={products as AdminProductListResponse}
        refetch={productsRefetch}
      />
      <SellerCustomerGroupsSection
        seller_customer_groups={
          customerGroups as AdminCustomerGroupListResponse
        }
        refetch={customerGroupsRefetch}
      />
      <SellerStockLocationsSection sellerId={resolvedId} />
    </>
  );
};
