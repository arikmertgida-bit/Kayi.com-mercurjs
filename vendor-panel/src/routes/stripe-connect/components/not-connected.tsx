import { ExclamationCircle } from "@medusajs/icons"
import { Button, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useCreateStripeAccount } from "../../../hooks/api"

export const NotConnected = () => {
  const { mutateAsync, isPending } = useCreateStripeAccount()
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-center text-center my-32 flex-col">
      <ExclamationCircle />
      <Heading level="h2" className="mt-4">
        {t("stripeConnect.notConnected.title")}
      </Heading>
      <Text className="text-ui-fg-subtle" size="small">
        {t("stripeConnect.notConnected.description")}
      </Text>
      <Button
        isLoading={isPending}
        className="mt-4"
        onClick={() =>
          mutateAsync({
            context: {
              country: "US",
            },
          })
        }
      >
        {t("stripeConnect.notConnected.action")}
      </Button>
    </div>
  )
}
