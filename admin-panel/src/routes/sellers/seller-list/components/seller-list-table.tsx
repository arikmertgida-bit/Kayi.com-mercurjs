import { useMemo, useState } from "react";

import { PencilSquare, User } from "@medusajs/icons";
import {
  Button,
  Drawer,
  Input,
  Label,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { keepPreviousData } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";

import type { VendorSeller } from "@custom-types/seller";

import { ActionsButton } from "@components/common/actions-button";
import { _DataTable } from "@components/table/data-table";

import {
  useInviteSeller,
  useSellers,
  useUpdateSeller,
} from "@hooks/api/sellers";
import { useSellersTableColumns } from "@hooks/table/columns/use-seller-table-columns";
import { useSellersTableQuery } from "@hooks/table/query";
import { useDataTable } from "@hooks/use-data-table";

import { validateEmail } from "@lib/validate-email";

const PAGE_SIZE = 10;

type SellersProps = VendorSeller & { store_status: string };

export const SellerListTable = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { t } = useTranslation();
  const { searchParams, raw } = useSellersTableQuery({ pageSize: PAGE_SIZE });

  const { sellers, count, isLoading } = useSellers(
    {
      fields: "id,email,name,handle,created_at,store_status",
      ...searchParams,
    },
    { placeholderData: keepPreviousData },
  );

  const { mutateAsync: inviteSeller } = useInviteSeller();
  const columns = useColumns();

  const { table } = useDataTable({
    data: sellers ?? [],
    columns,
    count: count ?? 0,
    enablePagination: true,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row?.id || "",
  });

  const handleInvite = async () => {
    try {
      const isValid = validateEmail(email);
      if (!isValid) return;
      await inviteSeller({ email });
      toast.success(t("sellers.invite.success"));
      setOpen(false);
      setEmail("");
    } catch {
      toast.error(t("sellers.invite.error"));
    }
  };

  return (
    <>
      <_DataTable
        table={table}
        columns={columns}
        count={count ?? 0}
        pageSize={PAGE_SIZE}
        isLoading={isLoading}
        queryObject={raw}
        search
        pagination
        navigateTo={(row) => `/sellers/${row.original?.handle || row.id}`}
        orderBy={[
          { key: "email", label: t("sellers.fields.email") },
          { key: "name", label: t("sellers.fields.name") },
          { key: "created_at", label: t("fields.createdAt") },
        ]}
        action={
          <Drawer open={open} onOpenChange={setOpen}>
            <Drawer.Trigger asChild>
              <Button size="small">{t("sellers.invite.action")}</Button>
            </Drawer.Trigger>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>{t("sellers.invite.title")}</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("sellers.invite.description")}
                </Text>
                <div className="mt-6 flex flex-col gap-2">
                  <Label>{t("fields.email")}</Label>
                  <Input
                    placeholder={t("fields.email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="flex justify-end">
                  <Button className="mt-6" onClick={handleInvite}>
                    {t("sellers.invite.action")}
                  </Button>
                </div>
              </Drawer.Body>
            </Drawer.Content>
          </Drawer>
        }
      />
    </>
  );
};

const columnHelper = createColumnHelper<VendorSeller>();

const useColumns = () => {
  const dialog = usePrompt();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { mutateAsync: suspendSeller } = useUpdateSeller();

  const handleSuspend = async (seller: SellersProps) => {
    const res = await dialog({
      title:
        seller.store_status === "SUSPENDED"
          ? t("sellers.activate")
          : t("sellers.suspend"),
      description:
        seller.store_status === "SUSPENDED"
          ? t("sellers.activateConfirm")
          : t("sellers.suspendConfirm"),
      verificationText: seller.email || seller.name || "",
    });

    if (!res) return;

    if (seller.store_status === "SUSPENDED") {
      await suspendSeller({ id: seller.id, data: { store_status: "ACTIVE" } });
    } else {
      await suspendSeller({ id: seller.id, data: { store_status: "SUSPENDED" } });
    }
  };

  const base = useSellersTableColumns();

  const columns = useMemo(
    () => [
      ...base,
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => (
          <ActionsButton
            actions={[
              {
                label: t("actions.edit"),
                onClick: () =>
                  navigate(`/sellers/${row.original.handle || row.original.id}/edit`),
                icon: <PencilSquare />,
              },
              {
                label:
                  row.original.store_status === "SUSPENDED"
                    ? t("sellers.activate")
                    : t("sellers.suspend"),
                onClick: () => handleSuspend(row.original as SellersProps),
                icon: <User />,
              },
            ]}
          />
        ),
      }),
    ],
    [base],
  );

  return columns;
};
