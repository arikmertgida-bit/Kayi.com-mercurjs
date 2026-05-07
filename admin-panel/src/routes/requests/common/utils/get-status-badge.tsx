import { t } from "i18next";
import { StatusBadge } from "@medusajs/ui";

export const getRequestStatusBadge = (status: string) => {
  let color: "grey" | "orange" | "green" | "red" = "grey";
  if (status === "pending") {
    color = "orange";
  }

  if (status === "accepted") {
    color = "green";
  }

  if (status === "rejected") {
    color = "red";
  }

  const label = String(t(`requests.status.${status}` as never, { defaultValue: status }));

  return <StatusBadge color={color}>{label}</StatusBadge>;
};
