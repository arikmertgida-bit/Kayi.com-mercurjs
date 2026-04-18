import { useState } from "react";
import { BuildingStorefront, Plus, Trash } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text, toast, usePrompt } from "@medusajs/ui";

import {
  useAssignSellerStockLocation,
  useRemoveSellerStockLocation,
  useSellerStockLocations,
} from "@hooks/api/sellers";
import { useStockLocations } from "@hooks/api/stock-locations";

type Props = {
  sellerId: string;
};

export const SellerStockLocationsSection = ({ sellerId }: Props) => {
  const prompt = usePrompt();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState("");

  const { data: assigned, isLoading } = useSellerStockLocations(sellerId);
  const { stock_locations: allLocations = [] } = useStockLocations();
  const { mutateAsync: assign, isPending: isAssigning } =
    useAssignSellerStockLocation(sellerId);
  const { mutateAsync: remove } = useRemoveSellerStockLocation(sellerId);

  const assignedLocations = assigned?.stock_locations ?? [];
  const assignedIds = new Set(assignedLocations.map((l: any) => l.id));
  const unassigned = allLocations.filter((l) => !assignedIds.has(l.id));

  const handleAdd = async () => {
    if (!selectedToAdd) return;
    try {
      await assign(selectedToAdd);
      toast.success("Stock location assigned");
      setIsAdding(false);
      setSelectedToAdd("");
    } catch {
      toast.error("Failed to assign stock location");
    }
  };

  const handleRemove = async (locationId: string, locationName: string) => {
    const confirmed = await prompt({
      title: "Remove stock location",
      description: `Remove "${locationName}" from this seller? The seller will no longer be able to manage stock at this location.`,
      verificationText: locationName,
    });
    if (!confirmed) return;
    try {
      await remove(locationId);
      toast.success("Stock location removed");
    } catch {
      toast.error("Failed to remove stock location");
    }
  };

  return (
    <Container className="mt-2 px-0">
      <div className="flex items-center justify-between px-8 pb-4">
        <Heading>Stock Locations</Heading>
        {unassigned.length > 0 && !isAdding && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="mr-1" />
            Assign
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="border-t px-8 py-4">
          <div className="flex items-center gap-3">
            <select
              className="bg-ui-bg-field border-ui-border-base text-ui-fg-base h-9 flex-1 rounded-md border px-3 text-sm"
              value={selectedToAdd}
              onChange={(e) => setSelectedToAdd(e.target.value)}
            >
              <option value="">Select a stock location…</option>
              {unassigned.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <Button
              size="small"
              onClick={handleAdd}
              isLoading={isAssigning}
              disabled={!selectedToAdd}
            >
              Add
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => {
                setIsAdding(false);
                setSelectedToAdd("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="border-t px-8 py-4">
          <Text className="text-ui-fg-muted text-sm">Loading…</Text>
        </div>
      ) : assignedLocations.length === 0 ? (
        <div className="border-t px-8 py-6 text-center">
          <BuildingStorefront className="text-ui-fg-muted mx-auto mb-2 size-6" />
          <Text className="text-ui-fg-muted text-sm">
            No stock locations assigned. The seller cannot manage stock.
          </Text>
        </div>
      ) : (
        <div className="border-t">
          {assignedLocations.map((location: any, index: number) => (
            <div key={location.id}>
              {index > 0 && <div className="border-t" />}
              <div className="flex items-center justify-between px-8 py-3">
                <div className="flex items-center gap-3">
                  <BuildingStorefront className="text-ui-fg-muted size-4 shrink-0" />
                  <Text className="text-sm font-medium">{location.name}</Text>
                  {location.address?.city && (
                    <Badge size="2xsmall" color="grey">
                      {location.address.city}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="transparent"
                  size="small"
                  className="text-ui-fg-subtle hover:text-ui-fg-error"
                  onClick={() => handleRemove(location.id, location.name)}
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
};
