import { Container, Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { OnboardingRow } from "./onboarding-row"
import { useUpdateOnboarding } from "../../../hooks/api"
import { useEffect } from "react"

type DashboardProps = {
  products: boolean
  locations_shipping: boolean
  store_information: boolean
  stripe_connect: boolean
}

export const DashboardOnboarding = ({
  products,
  locations_shipping,
  store_information,
  // stripe_connect,
}: DashboardProps) => {
  const { mutateAsync } = useUpdateOnboarding()
  const { t } = useTranslation()

  useEffect(() => {
    mutateAsync()
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("dashboard.onboarding.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("dashboard.onboarding.description")}
          </Text>
        </div>
      </div>
      <div className="px-6 py-4">
        <OnboardingRow
          label={t("dashboard.onboarding.completeStore")}
          state={store_information}
          link="/settings/store"
          buttonLabel={t("dashboard.onboarding.manage")}
        />
        <OnboardingRow
          label={t("dashboard.onboarding.setupShipping")}
          state={locations_shipping}
          link="/settings/locations"
          buttonLabel={t("dashboard.onboarding.setup")}
        />
        <OnboardingRow
          label={t("dashboard.onboarding.addProducts")}
          state={products}
          link="/products/create"
          buttonLabel={t("dashboard.onboarding.add")}
        />
      </div>
    </Container>
  )
}
