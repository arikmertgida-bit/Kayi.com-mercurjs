import { useState } from "react";

import { InformationCircle } from "@medusajs/icons";
import { Button, Container, Drawer, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import type { AdminSellerRequest } from "@custom-types/requests";

import { formatDate } from "@lib/date";

import { ResolveRequestPrompt } from "@routes/requests/common/components/resolve-request";

type Props = {
  request?: AdminSellerRequest;
  open: boolean;
  close: () => void;
};

export function RequestSellerDetail({ request, open, close }: Props) {
  if (!request) {
    return null;
  }
  const requestData = request.data;
  const { t } = useTranslation();

  const [promptOpen, setPromptOpen] = useState(false);
  const [requestAccept, setRequestAccept] = useState(false);

  const handlePrompt = (_: string, accept: boolean) => {
    setRequestAccept(accept);
    setPromptOpen(true);
  };

  return (
    <Drawer open={open} onOpenChange={close}>
      <ResolveRequestPrompt
        close={() => {
          setPromptOpen(false);
        }}
        open={promptOpen}
        id={request.id!}
        accept={requestAccept}
        onSuccess={() => {
          close();
        }}
      />
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("requests.sellerList.detail.title")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="p-4">
          <fieldset>
            <legend className="mb-2">{t("requests.sellerList.detail.sellerName")}</legend>
            <Container>
              <Text>{requestData?.seller?.name ?? "-"}</Text>
            </Container>
          </fieldset>
          <fieldset className="mt-2">
            <legend className="mb-2">{t("requests.sellerList.detail.member")}</legend>
            <Container>
              <Text>{requestData?.member?.name ?? "-"}</Text>
            </Container>
          </fieldset>
          <fieldset className="mt-2">
            <legend className="mb-2">{t("fields.email")}</legend>
            <Container>
              <Text>{requestData?.provider_identity_id ?? "N/A"}</Text>
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
          {request.status === "pending" && (
            <>
              <Button
                onClick={() => {
                  handlePrompt(request.id!, true);
                }}
              >
                Accept
              </Button>
              <Button
                onClick={() => {
                  handlePrompt(request.id!, false);
                }}
                variant="danger"
              >
                Reject
              </Button>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
            </>
          )}
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
