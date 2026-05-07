import { InformationCircle } from "@medusajs/icons";
import type { ProductDTO } from "@medusajs/types";
import { Button, Container, Drawer, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { formatDate } from "@lib/date";
import { useNavigate } from "react-router-dom";

import type { AdminRequest } from "@custom-types/requests";

type Props = {
  request?: AdminRequest;
  open: boolean;
  close: () => void;
};

export function ProductSummaryDetail({ request, open, close }: Props) {
  if (!request) {
    return null;
  }

  const { t } = useTranslation();
  const product_id = (request.data as Record<string, unknown>).product_id || "";
  const navigate = useNavigate();
  const requestData = request.data as ProductDTO;

  return (
    <Drawer open={open} onOpenChange={close}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("requests.productList.detail.title")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="p-4">
          <fieldset>
            <legend className="mb-2">{t("requests.productList.detail.productTitle")}</legend>
            <Container>
              <Text>{requestData.title}</Text>
            </Container>
          </fieldset>
          <fieldset className="mt-2">
            <legend className="mb-2">{t("fields.handle")}</legend>
            <Container>
              <Text>{`/${requestData.handle}`}</Text>
            </Container>
          </fieldset>
          <fieldset className="mt-2">
            <legend className="mb-2">{t("requests.detail.submittedBy")}</legend>
            <Container>
              <Text>{request.seller?.name}</Text>
            </Container>
          </fieldset>
          <Container className="mt-4">
            <div className="flex items-center gap-2">
              <InformationCircle />
              <Text className="font-semibold">{t("requests.detail.requestInformation")}</Text>
            </div>
            <Text>{t("requests.detail.submittedOn", { date: formatDate(request.created_at) })}</Text>
            {request.reviewer_id && (
              <Text>{t("requests.detail.reviewedOn", { date: formatDate(request.updated_at) })}</Text>
            )}
            {request.reviewer_note && (
              <Text>{t("requests.detail.reviewerNote", { note: request.reviewer_note })}</Text>
            )}
          </Container>
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            onClick={() => {
              navigate(`/products/${product_id}`);
            }}
          >
            {t("requests.productList.detail.seeFullProduct")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
