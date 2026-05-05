import { useParams } from "react-router-dom";

import type { VendorSeller } from "@custom-types/seller";

import { RouteDrawer } from "@components/modals";

import { useSeller, useSellerByHandle } from "@hooks/api/sellers";

import { SellerDetails } from "@routes/sellers/seller-details/components/seller-details";
import { SellerEditForm } from "@routes/sellers/seller-edit/components/seller-edit-form";
import { useTranslation } from "react-i18next";

export const SellerEdit = () => {
  const { t } = useTranslation();
  const { id: routeParam } = useParams();

  // Route param can be either a seller ID (sel_xxx) or a handle (e.g. "aeneshal-gmail-com")
  const isId = routeParam?.startsWith("sel_");
  const id = isId ? routeParam : undefined;
  const handle = isId ? undefined : routeParam;

  const { seller: sellerByHandle, isLoading: handleLoading } = useSellerByHandle(handle);
  const resolvedId = id ?? sellerByHandle?.id ?? "";

  const { data, isLoading } = useSeller(resolvedId);

  if (handleLoading || isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <SellerDetails />
      <RouteDrawer>
        <RouteDrawer.Header>
          <RouteDrawer.Title>{t("sellers.edit.header")}</RouteDrawer.Title>
        </RouteDrawer.Header>
        {data?.seller && (
          <SellerEditForm seller={data?.seller as unknown as VendorSeller} />
        )}
      </RouteDrawer>
    </>
  );
};
