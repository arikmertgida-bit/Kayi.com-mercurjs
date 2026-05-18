import { getTranslations } from "next-intl/server"
import { notFound, redirect } from "next/navigation"
import { retrieveCustomer } from "@/lib/data/customer"
import { getReturnDetail, getReturnShipment } from "@/lib/data/orders"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { format } from "date-fns"

interface TimelineStep {
  key: string
  label: string
}

const PHASE_ORDER = ["pending", "awaiting_shipment", "in_transit", "received"] as const
type Phase = (typeof PHASE_ORDER)[number]

function getPhaseIndex(phase: Phase | undefined): number {
  if (!phase) return 0
  const idx = PHASE_ORDER.indexOf(phase)
  return idx === -1 ? 0 : idx
}

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const t = await getTranslations("returns")

  const user = await retrieveCustomer()
  if (!user) {
    redirect(`/${locale}/sign-in`)
  }

  const [returnDetail, shipment] = await Promise.all([
    getReturnDetail(id),
    getReturnShipment(id),
  ])

  if (!returnDetail) {
    notFound()
  }

  const steps: TimelineStep[] = [
    { key: "pending", label: t("detail.stepPending") },
    { key: "awaiting_shipment", label: t("detail.stepAwaitingShipment") },
    { key: "in_transit", label: t("detail.stepInTransit") },
    { key: "received", label: t("detail.stepReceived") },
  ]

  const currentPhase: Phase = (shipment?.phase as Phase) ?? "pending"
  const currentStep = getPhaseIndex(currentPhase)

  return (
    <main className="container py-8">
      <div className="mb-6">
        <LocalizedClientLink
          href="/user/returns"
          className="label-sm text-secondary hover:text-primary transition-colors"
        >
          ← {t("detail.backToList")}
        </LocalizedClientLink>
      </div>

      <h1 className="heading-md uppercase mb-6">{t("detail.title")}</h1>

      {/* Timeline */}
      <div className="bg-secondary rounded-xl p-6 mb-6">
        <h2 className="label-md font-semibold mb-4">{t("detail.timeline")}</h2>
        <ol className="flex items-start gap-0 w-full">
          {steps.map((step, index) => {
            const isCompleted = index <= currentStep
            const isActive = index === currentStep
            return (
              <li key={step.key} className="flex-1 flex flex-col items-center relative">
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 ${
                      index < currentStep ? "bg-primary" : "bg-neutral-300"
                    }`}
                    style={{ transform: "translateX(0)" }}
                  />
                )}
                <div
                  className={`z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    isCompleted
                      ? "bg-primary border-primary text-white"
                      : "bg-white border-neutral-300 text-neutral-400"
                  } ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}`}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>
                <p
                  className={`mt-2 label-xs text-center ${
                    isActive ? "text-primary font-semibold" : "text-secondary"
                  }`}
                >
                  {step.label}
                </p>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Shipment info */}
      {shipment ? (
        <div className="bg-secondary rounded-xl p-6 mb-6">
          {shipment.tracking_number && (
            <p className="label-sm">
              <span className="text-secondary">{t("detail.tracking")}:</span>{" "}
              <span className="font-mono font-semibold">{shipment.tracking_number}</span>
              {shipment.carrier && <span className="text-secondary"> ({shipment.carrier})</span>}
            </p>
          )}
          {shipment.shipped_at && (
            <p className="label-sm text-secondary mt-1">
              {format(new Date(shipment.shipped_at), "dd MMM yyyy")}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-secondary rounded-xl p-6 mb-6">
          <p className="label-sm text-secondary">{t("detail.noShipment")}</p>
        </div>
      )}

      {/* Vendor note */}
      {returnDetail.vendor_reviewer_note && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <h2 className="label-md font-semibold mb-2">{t("detail.vendorNote")}</h2>
          <p className="label-sm text-primary">{returnDetail.vendor_reviewer_note}</p>
        </div>
      )}
    </main>
  )
}
