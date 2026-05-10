import { z } from "zod"

export const addressSchema = z.object({
  addressId: z.string().optional(),
  addressName: z.string().nonempty("Adres adı zorunludur."),
  firstName: z.string().nonempty("Ad zorunludur."),
  lastName: z.string().nonempty("Soyad zorunludur."),
  address: z.string().nonempty("Adres zorunludur."),
  city: z.string().nonempty("Şehir zorunludur."),
  countryCode: z.string().nonempty("Ülke zorunludur."),
  postalCode: z.string().nonempty("Posta kodu zorunludur."),
  company: z.string().optional(),
  province: z.string().optional(),
  phone: z
    .string()
    .nonempty("Telefon numarası zorunludur.")
    .regex(/^\+?[0-9\s\-()]+$/, "Geçersiz telefon numarası formatı."),
  metadata: z.record(z.any()).optional(),
})

export type AddressFormData = z.infer<typeof addressSchema>
