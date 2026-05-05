"use client"
import { Button, Card } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { Modal } from "../Modal/Modal"
import { useState, useTransition } from "react"
import { ProfileDetailsForm } from "../ProfileDetailsForm/ProfileDetailsForm"
import { Divider, Heading } from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { updateGlobalNotificationPreference } from "@/lib/data/customer"
import { useTranslations } from "next-intl"

export const ProfileDetails = ({ user }: { user: HttpTypes.StoreCustomer }) => {
  const [showForm, setShowForm] = useState(false)
  const t = useTranslations('settings')
  const notifyInit =
    ((user.metadata as Record<string, unknown> | null | undefined)
      ?.notify_enabled as boolean | undefined) ?? true
  const [notifyOn, setNotifyOn] = useState(notifyInit)
  const [isPending, startTransition] = useTransition()

  const handleNotifyToggle = () => {
    const next = !notifyOn
    setNotifyOn(next)
    startTransition(async () => {
      try {
        await updateGlobalNotificationPreference(next)
      } catch {
        setNotifyOn(!next)
      }
    })
  }

  return (
    <>
      <Card className="bg-secondary p-4 flex justify-between items-center">
        <Heading level="h2" className="heading-sm uppercase">
          {t('profileDetails')}
        </Heading>
        <Button
          variant="tonal"
          onClick={() => setShowForm(true)}
          className="uppercase flex items-center gap-2 font-semibold"
        >
          <PencilSquare />
          {t('editDetails')}
        </Button>
      </Card>
      <Card className="p-0">
        <div className="p-4">
          <p className="label-md text-secondary">{t('name')}</p>
          <p className="label-lg text-primary">
            {`${user.first_name} ${user.last_name}`}
          </p>
        </div>
        <Divider />
        <div className="p-4">
          <p className="label-md text-secondary">{t('email')}</p>
          <p className="label-lg text-primary">{user.email}</p>
        </div>
        <Divider />
        <div className="p-4">
          <p className="label-md text-secondary">{t('phoneNumber')}</p>
          <p className="label-lg text-primary">{user.phone}</p>
        </div>
      </Card>
      {showForm && (
        <Modal
          heading={t('editProfileModal')}
          onClose={() => setShowForm(false)}
        >
          <ProfileDetailsForm
            handleClose={() => setShowForm(false)}
            defaultValues={{
              firstName: user.first_name || "",
              lastName: user.last_name || "",
              phone: user.phone || "",
              email: user.email || "",
            }}
            notificationToggle={
              <div className="flex items-center justify-between mb-2">
                <span className="label-md font-medium">{t('notifications')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notifyOn}
                  disabled={isPending}
                  onClick={handleNotifyToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
                    notifyOn ? "bg-black" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifyOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            }
          />
        </Modal>
      )}
    </>
  )
}
