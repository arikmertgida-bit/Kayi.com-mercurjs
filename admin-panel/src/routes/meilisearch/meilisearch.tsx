import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { useMeilisearch, useSyncMeilisearch } from "@hooks/api/meilisearch";

export const Meilisearch = () => {
  const { data: meilisearch } = useMeilisearch();
  const { mutateAsync: triggerSynchronization } = useSyncMeilisearch();
  const { t } = useTranslation();

  const handleTriggerSynchronization = async () => {
    try {
      await triggerSynchronization();
      toast.success(t("meilisearch.syncSuccess"));
    } catch {
      toast.error(t("meilisearch.error"));
    }
  };

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Meilisearch</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("meilisearch.checkStatus")}
          </Text>
        </div>
        <Button onClick={handleTriggerSynchronization}>
          Trigger Synchronization
        </Button>
      </div>

      <Table>
        <Table.Body>
          <Table.Row>
              <Table.Cell>{t("meilisearch.host")}</Table.Cell>
            <Table.Cell>{meilisearch?.appId}</Table.Cell>
          </Table.Row>
          <Table.Row>
              <Table.Cell>{t("meilisearch.productIndex")}</Table.Cell>
            <Table.Cell>
              {meilisearch?.productIndex ? (
                <StatusBadge color="green">{t("meilisearch.exists")}</StatusBadge>
              ) : (
                <StatusBadge color="red">{t("meilisearch.doesNotExist")}</StatusBadge>
              )}
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </Container>
  );
};
