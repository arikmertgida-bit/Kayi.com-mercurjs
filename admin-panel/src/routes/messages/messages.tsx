import { Container, Heading } from "@medusajs/ui";
import { useMe } from "@hooks/api/users";
import { MessengerAdminInbox } from "./components/MessengerAdminInbox";

export const Messages = () => {
  const { user, isPending } = useMe();

  return (
    <Container>
      <Heading className="mb-4">Messages</Heading>
      {isPending ? (
        <div className="flex h-[700px] items-center justify-center text-ui-fg-muted text-sm">
          Loading...
        </div>
      ) : user?.id ? (
        <MessengerAdminInbox adminId={user.id} />
      ) : (
        <div className="flex h-[700px] items-center justify-center text-ui-fg-muted text-sm">
          Could not load admin user.
        </div>
      )}
    </Container>
  );
};
