import { Container, Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useMe } from "@hooks/api/users";
import { MessengerAdminInbox } from "./components/MessengerAdminInbox";

export const Messages = () => {
  const { user, isPending } = useMe();
  const { t } = useTranslation();

  return (
    <Container>
      <Heading className="mb-4">{t("messages.domain")}</Heading>
      {isPending ? (
        <div className="flex h-[700px] items-center justify-center text-ui-fg-muted text-sm">
          {t("general.loading", "Loading...")}
        </div>
      ) : user?.id ? (
        <MessengerAdminInbox adminId={user.id} />
      ) : (
        <div className="flex h-[700px] items-center justify-center text-ui-fg-muted text-sm">
          {t("general.error")}
        </div>
      )}
    </Container>
  );
};
