import { z } from "zod"

export const profileDetailsSchema = z.object({
  firstName: z.string().nonempty("Ad zorunludur."),
  lastName: z.string().nonempty("Soyad zorunludur."),
  phone: z.string().nonempty("Telefon numarası zorunludur."),
  email: z.string().nonempty("E-posta adresi zorunludur."),
})

export type ProfileDetailsFormData = z.infer<typeof profileDetailsSchema>
