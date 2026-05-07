import { Button, Container, Drawer, Text } from "@medusajs/ui";

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { CommissionLine } from "@custom-types/commission";

import { formatDate } from "@/lib/date";

type Props = {
  line?: CommissionLine;
  open: boolean;
  close: () => void;
};

export function CommissionLineDetail({ line, open, close }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!line) {
    return null;
  }

  return (
    <Drawer open={open} onOpenChange={close}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("commissionLines.detail.title")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="p-4">
          <fieldset>
            <legend className="mb-2">{t("commissionLines.detail.sellerName")}</legend>
            <Container>
              <div className="flex items-center justify-between">
                <Text>{line.order.seller.name}</Text>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => navigate(`/sellers/${line.order.seller.id}`)}
                >
                  {t("commissionLines.detail.viewSeller")}
                </Button>
              </div>
            </Container>
          </fieldset>
          <fieldset className="mt-2">
            <legend className="mt-4">{t("commissionLines.detail.orderNumber")}</legend>
            <Container>
              <div className="flex items-center justify-between">
                <Text>{`#${line.order.display_id}`}</Text>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => navigate(`/orders/${line.order.id}`)}
                >
                  {t("commissionLines.detail.viewOrder")}
                </Button>
              </div>
            </Container>
          </fieldset>
          <fieldset className="mt-2">
            <legend className="mt-4">{t("commissionLines.detail.calculatedValue")}</legend>
            <Container>
              <div className="flex items-center justify-between">
                <Text>{`${line.value} ${line.currency_code.toUpperCase()}`}</Text>
              </div>
            </Container>
          </fieldset>
          <fieldset className="mt-2">
            <legend className="mt-4">{t("commissionLines.detail.rateDetails")}</legend>
            <Container>
              <div className="flex flex-col gap-2">
                <Text>{t("commissionLines.detail.ruleNameValue", { name: line.rule.name })}</Text>
                <Text>{t("commissionLines.detail.referenceValue", { ref: line.rule.reference })}</Text>
                <Text>{t("commissionLines.detail.typeValue", { type: line.rule.rate.type })}</Text>
                {line.rule.rate.type === "percentage" && (
                  <>
                    <Text>{t("commissionLines.detail.rateValuePct", { value: line.rule.rate.percentage_rate })}</Text>
                    <Text>{t("commissionLines.detail.includeTaxValue", { value: line.rule.rate.include_tax ? t("general.yes") : t("general.no") })}</Text>
                  </>
                )}
                {line.rule.deleted_at !== null && (
                  <Text
                    size="large"
                    weight="plus"
                  >{t("commissionLines.detail.ruleDeletedAt", { date: formatDate(line.rule.deleted_at) })}</Text>
                )}
              </div>
            </Container>
          </fieldset>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  );
}
