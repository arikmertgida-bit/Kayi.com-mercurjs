import { z } from "zod"

export const registerFormSchema = z.object({
  firstName: z.string().nonempty("Ad zorunludur."),
  lastName: z.string().nonempty("Soyad zorunludur."),
  email: z.string().nonempty("E-posta adresi zorunludur.").email("Geçerli bir e-posta adresi girin."),
  password: z
    .string()
    .nonempty("Şifre zorunludur.")
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/^(?=.*[A-Z])(?=.*[!@#$%^&*])/, {
      message: "Şifre en az bir büyük harf ve bir özel karakter içermelidir.",
    }),
  phone: z
    .string()
    .min(6, "Telefon numarası zorunludur.")
    .regex(/^\+?\d+$/, { message: "Telefon numarası yalnızca rakam içermelidir." }),
})

export type RegisterFormData = z.infer<typeof registerFormSchema>
