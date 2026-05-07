import { InformationCircleSolid } from "@medusajs/icons";
import { Tooltip } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

export type RuleType =
  | "global_product_catalog"
  | "require_product_approval"
  | "product_request_enabled"
  | "product_import_enabled";

export const ConfigurationRuleTooltip = ({ type }: { type: RuleType }) => {
  const { t } = useTranslation();
  const content = t(`configuration.tooltip.${type}`);
  return (
    <Tooltip content={content}>
      <InformationCircleSolid />
    </Tooltip>
  );
};
