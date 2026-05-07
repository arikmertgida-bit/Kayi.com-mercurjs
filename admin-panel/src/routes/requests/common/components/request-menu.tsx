import { EllipsisHorizontal, Eye } from "@medusajs/icons";
import { DropdownMenu } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import type { AdminRequest } from "@custom-types/requests";

type Props = {
  handleDetail: (request: AdminRequest) => void;
  request: AdminRequest;
};

export function RequestMenu({ handleDetail, request }: Props) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <EllipsisHorizontal />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item
          className="gap-x-2"
          onClick={() => {
            handleDetail(request);
          }}
        >
          <Eye className="text-ui-fg-subtle" />
          {t("actions.viewDetails")}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
