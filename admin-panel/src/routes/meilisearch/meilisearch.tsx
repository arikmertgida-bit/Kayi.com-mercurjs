import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui";

import { useMeilisearch, useSyncMeilisearch } from "@hooks/api/meilisearch";

export const Meilisearch = () => {
  const { data: meilisearch } = useMeilisearch();
  const { mutateAsync: triggerSynchronization } = useSyncMeilisearch();

  const handleTriggerSynchronization = async () => {
    try {
      await triggerSynchronization();
      toast.success("Synchronization triggered!");
    } catch {
      toast.error("Error!");
    }
  };

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Meilisearch</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Check Meilisearch status
          </Text>
        </div>
        <Button onClick={handleTriggerSynchronization}>
          Trigger Synchronization
        </Button>
      </div>

      <Table>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Host</Table.Cell>
            <Table.Cell>{meilisearch?.appId}</Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>Product Index</Table.Cell>
            <Table.Cell>
              {meilisearch?.productIndex ? (
                <StatusBadge color="green">Exists</StatusBadge>
              ) : (
                <StatusBadge color="red">Doesn&apos;t exist</StatusBadge>
              )}
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
    </Container>
  );
};
