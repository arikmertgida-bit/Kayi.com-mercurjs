import { ExclamationCircle } from "@medusajs/icons"
import { Button, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useCreateStripeOnboarding } from "../../../hooks/api"

export const Connected = ({
  status,
}: {
  status: "connected" | "pending" | "not connected"
}) => {
  const { mutateAsync, isPending } = useCreateStripeOnboarding()
  const [onboardingError, setOnboardingError] = useState(false)
  const { t } = useTranslation()

  const hostname = window.location.href

  const handleOnboarding = async () => {
    setOnboardingError(false)
    try {
      const { payout_account } = await mutateAsync({
        context: {
          refresh_url: hostname,
          return_url: hostname,
        },
      })
      window.location.replace(payout_account.onboarding.data.url)
    } catch {
      setOnboardingError(true)
    }
  }

  return status === "connected" ? (
    <div className="flex items-center justify-center text-center my-32 flex-col">
      <Heading level="h2" className="mt-4">
        {t("stripeConnect.connected.ready")}
      </Heading>
      <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer">
        <Button className="mt-4">{t("stripeConnect.connected.goToStripe")}</Button>
      </a>
    </div>
  ) : (
    <div className="flex items-center justify-center text-center my-32 flex-col">
      <ExclamationCircle />
      <Heading level="h2" className="mt-4">
        {t("stripeConnect.connected.notOnboardedTitle")}
      </Heading>
      <Text className="text-ui-fg-subtle" size="small">
        {t("stripeConnect.connected.notOnboardedDesc")}
      </Text>
      {onboardingError && (
        <Text className="text-ui-fg-error mt-2" size="small">
          {t("stripeConnect.error")}
        </Text>
      )}
      <Button
        isLoading={isPending}
        className="mt-4"
        onClick={() => handleOnboarding()}
      >
        {t("stripeConnect.connected.onboardingButton")}
      </Button>
    </div>
  )
}
