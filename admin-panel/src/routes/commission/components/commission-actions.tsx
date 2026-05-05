import { EllipsisHorizontal, PencilSquare, Trash } from "@medusajs/icons";
import { DropdownMenu, toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import {
  useDeleteCommisionRule,
  useUpdateCommisionRule,
} from "@hooks/api/commission";

export function CommissionActionMenu({
  id,
  is_active,
  onSuccess,
}: {
  id: string;
  is_active: boolean;
  onSuccess?: () => void;
}) {
  const { mutateAsync: deleteCommissionRule } = useDeleteCommisionRule({});
  const { mutateAsync: updateCommissionRule } = useUpdateCommisionRule({});
  const { t } = useTranslation();

  const onDeleteClick = async () => {
    try {
      await deleteCommissionRule({ id });
      toast.success(t("commission.deleted"));
      onSuccess?.();
    } catch {
      toast.error(t("commission.error"));
    }
  };

  const onSwitchEnableClick = async () => {
    try {
      await updateCommissionRule({ id, is_active: !is_active });
      toast.success(t("commission.updated"));
      onSuccess?.();
    } catch {
      toast.error(t("commission.error"));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <EllipsisHorizontal />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item className="gap-x-2" onClick={onSwitchEnableClick}>
          <PencilSquare className="text-ui-fg-subtle" />
            {is_active ? t("commission.disable") : t("commission.enable")}
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item className="gap-x-2" onClick={onDeleteClick}>
          <Trash className="text-ui-fg-subtle" />
          {t("commission.delete")}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
