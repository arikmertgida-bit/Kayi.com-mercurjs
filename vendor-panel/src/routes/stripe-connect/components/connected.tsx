import { ExclamationCircle } from "@medusajs/icons"
import { Button, Heading, Text } from "@medusajs/ui"
import { useState } from "react"
import { useCreateStripeOnboarding } from "../../../hooks/api"

export const Connected = ({
  status,
}: {
  status: "connected" | "pending" | "not connected"
}) => {
  const { mutateAsync, isPending } = useCreateStripeOnboarding()
  const [onboardingError, setOnboardingError] = useState(false)

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
        Your Stripe Account is ready
      </Heading>
      <a href="https://dashboard.stripe.com/payments" target="_blank" rel="noopener noreferrer">
        <Button className="mt-4">Go to Stripe</Button>
      </a>
    </div>
  ) : (
    <div className="flex items-center justify-center text-center my-32 flex-col">
      <ExclamationCircle />
      <Heading level="h2" className="mt-4">
        Not onboarded
      </Heading>
      <Text className="text-ui-fg-subtle" size="small">
        Go to Stripe Onboarding page
      </Text>
      {onboardingError && (
        <Text className="text-ui-fg-error mt-2" size="small">
          Connection error. Please try again.
        </Text>
      )}
      <Button
        isLoading={isPending}
        className="mt-4"
        onClick={() => handleOnboarding()}
      >
        Stripe Onboarding
      </Button>
    </div>
  )
}
