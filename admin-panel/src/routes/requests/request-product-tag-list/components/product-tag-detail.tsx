import { useState } from "react";

import { InformationCircle } from "@medusajs/icons";
import type { ProductTagDTO } from "@medusajs/types";
import { Button, Container, Drawer, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { formatDate } from "@lib/date";

import type { AdminRequest } from "@custom-types/requests";

import { ResolveRequestPrompt } from "@routes/requests/common/components/resolve-request";

type Props = {
  request?: AdminRequest;
  open: boolean;
  close: () => void;
};

export function ProductTagRequestDetail({ request, open, close }: Props) {
  if (!request) {
    return null;
  }
  const requestData = request.data as ProductTagDTO;
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
          <Drawer.Title>{t("requests.productTagList.detail.title")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="p-4">
          <fieldset>
            <legend className="mb-2">{t("requests.productTagList.detail.productTagValue")}</legend>
            <Container>
              <Text>{requestData.value}</Text>
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
