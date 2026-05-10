import { z } from "zod"

export const loginFormSchema = z.object({
  email: z.string().nonempty("E-posta adresi zorunludur.").email("Geçerli bir e-posta adresi girin."),
  password: z.string().nonempty("Şifre zorunludur."),
})

export type LoginFormData = z.infer<typeof loginFormSchema>
