"use client"
import { Button, Card } from "@/components/atoms"
import { AddressForm, Modal } from "@/components/molecules"
import { emptyDefaultAddressValues } from "@/components/molecules/AddressForm/AddressForm"
import { AddressFormData } from "@/components/molecules/AddressForm/schema"
import { deleteCustomerAddress } from "@/lib/data/customer"
import { cn } from "@/lib/utils"
import { HttpTypes } from "@medusajs/types"
import { isEmpty } from "lodash"
import { useState } from "react"
import { useTranslations } from "next-intl"

export const Addresses = ({
  user,
  regions,
}: {
  user: HttpTypes.StoreCustomer
  regions: HttpTypes.StoreRegion[]
}) => {
  const [showForm, setShowForm] = useState(false)
  const [deleteAddress, setDeleteAddress] = useState<string | null>(null)
  const t = useTranslations('addresses')

  const [defaultValues, setDefaultValues] = useState<AddressFormData | null>(
    null
  )

  const countries = regions.flatMap((region) => region.countries)

  const handleEdit = (addressId: string) => {
    const address = user.addresses.find((address) => address.id === addressId)
    if (address) {
      setDefaultValues({
        addressId: addressId,
        addressName: address.address_name || "",
        firstName: address.first_name || "",
        lastName: address.last_name || "",
        address: address.address_1 || "",
        city: address.city || "",
        countryCode: address.country_code || "",
        postalCode: address.postal_code || "",
        company: address.company || "",
        province: address.province || "",
        phone: address.phone || user.phone || "",
      })
      setShowForm(true)
    }
  }

  const handleDelete = async (addressId: string) => {
    await deleteCustomerAddress(addressId)
    setDeleteAddress(null)
  }

  const handleAdd = () => {
    setDefaultValues(emptyDefaultAddressValues)
    setDeleteAddress(null)
    setShowForm(true)
  }

  return (
    <>
      <div
        className={cn(
          "md:col-span-3",
          isEmpty(user.addresses) ? "space-y-8" : "space-y-4"
        )}
      >
        <h1 className="heading-md uppercase">{t('title')}</h1>
        {isEmpty(user.addresses) ? (
          <div className="text-center">
            <h3 className="heading-lg text-primary uppercase">
              {t('noSavedTitle')}
            </h3>
            <p className="text-lg text-secondary mt-2">
              {t('noSavedDesc')}
            </p>
            <Button onClick={handleAdd} className="mt-4">
              {t('addAddress')}
            </Button>
          </div>
        ) : (
          <>
            {user.addresses.map((address) => (
              <Card
                className="px-4 flex justify-between items-start gap-4 max-w-2xl"
                key={address.id}
              >
                <div className="flex flex-col ">
                  <h4 className="label-md text-primary">
                    {address.address_name}
                  </h4>
                  <p className="label-md text-secondary">
                    {`${address.first_name} ${address.last_name}`}
                  </p>
                  {address.company && (
                    <p className="label-md text-secondary">{address.company}</p>
                  )}
                  <p className="label-md text-secondary">
                    {`${address.address_1}, ${address.postal_code} ${
                      address.city
                    }${address.province ? `, ${address.province}` : ""}${`, ${
                      countries.find(
                        (country) =>
                          country && country.iso_2 === address.country_code
                      )?.display_name || address.country_code?.toUpperCase()
                    }`}`}
                  </p>
                  <p className="label-md text-secondary">
                    {`${user.email}, ${address.phone || user.phone}`}
                  </p>
                </div>
                <div className="flex gap-2 sm:gap-4 flex-col-reverse sm:flex-row">
                  <Button
                    variant="tonal"
                    className="text-negative"
                    onClick={() => setDeleteAddress(address.id)}
                  >
                    {t('delete')}
                  </Button>
                  <Button
                    variant="tonal"
                    onClick={() => handleEdit(address.id)}
                  >
                    {t('edit')}
                  </Button>
                </div>
              </Card>
            ))}
            {user.addresses.length < 6 && (
              <Button onClick={handleAdd}>{t('addAddress')}</Button>
            )}
          </>
        )}
      </div>
      {showForm && (
        <Modal
          heading={
            defaultValues?.addressId
              ? t('editAddressTitle', { name: defaultValues.addressName })
              : t('addAddress')
          }
          onClose={() => setShowForm(false)}
        >
          <AddressForm
            regions={regions}
            handleClose={() => setShowForm(false)}
            defaultValues={defaultValues || emptyDefaultAddressValues}
          />
        </Modal>
      )}
      {deleteAddress && (
        <Modal
          heading={t('confirmDelete')}
          onClose={() => setDeleteAddress(null)}
        >
          <div className="px-4 flex flex-col gap-4">
            <p>{t('confirmDeleteDesc')}</p>
            <div className="flex justify-end gap-4">
              <Button variant="tonal" onClick={() => setDeleteAddress(null)}>
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDelete(deleteAddress)}
              >
                {t('delete')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
