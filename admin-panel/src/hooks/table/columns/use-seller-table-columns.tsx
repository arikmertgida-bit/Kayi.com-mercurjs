import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { formatDate } from "../../../lib/date";
import { VendorSeller } from "../../../types";
import { SellerStatusBadge } from "../../../components/common/seller-status-badge";

const columnHelper = createColumnHelper<VendorSeller>();

export const useSellersTableColumns = () => {
  const { t } = useTranslation();
  return useMemo(
    () => [
      columnHelper.display({
        id: "email",
        header: t("sellers.fields.email"),
        cell: ({ row }) => row.original.email,
      }),
      columnHelper.display({
        id: "name",
        header: t("sellers.fields.name"),
        cell: ({ row }) => row.original.name,
      }),
      columnHelper.display({
        id: "store_status",
        header: t("sellers.fields.account_status"),
        cell: ({ row }) => (
          <SellerStatusBadge status={row.original.store_status || "-"} />
        ),
      }),
      columnHelper.display({
        id: "created_at",
        header: t("fields.createdAt"),
        cell: ({ row }) => formatDate(row.original.created_at),
      }),
    ],
    [t]
  );
};
