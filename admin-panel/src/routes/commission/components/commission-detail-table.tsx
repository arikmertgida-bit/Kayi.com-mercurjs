import { useTranslation } from "react-i18next";
import { StatusBadge, Table } from "@medusajs/ui";

import type {
  AdminCommissionAggregate,
  AdminCommissionPriceValue,
} from "@custom-types/commission";

const getFormattedPriceValue = (
  values: AdminCommissionPriceValue[] | undefined,
) => {
  if (!values) {
    return "-";
  }

  const prices = values.map(
    (p) => `${p.amount}${p.currency_code?.toUpperCase()}`,
  );

  return prices?.join("/") || "-";
};

export const CommissionDetailTable = ({
  commissionRule,
}: {
  commissionRule?: AdminCommissionAggregate;
}) => {
  const { t } = useTranslation();
  return (
    <>
      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>{t("commission.defaultCommission")}</Table.Cell>
            <Table.Cell>{commissionRule?.fee_value} </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>{t("commission.minCommission")}</Table.Cell>
            <Table.Cell>
              {getFormattedPriceValue(commissionRule?.min_price_set)}
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>{t("commission.maxCommission")}</Table.Cell>
            <Table.Cell>
              {getFormattedPriceValue(commissionRule?.max_price_set)}
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>{t("commission.includingTax")}</Table.Cell>
            <Table.Cell>
              <StatusBadge
                color={commissionRule?.include_tax ? "green" : "grey"}
              >
                {commissionRule?.include_tax ? t("fields.true") : t("fields.false")}
              </StatusBadge>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </>
  );
};
