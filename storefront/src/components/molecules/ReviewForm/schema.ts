import { z } from "zod"

export const reviewSchema = z.object({
  sellerId: z.string(),
  rating: z.number().min(1, "Lütfen bir puan verin").max(5),
  opinion: z
    .string()
    .min(3, "Yorumunuz en az 3 karakter olmalı")
    .max(500, "Yorumunuz en fazla 500 karakter olabilir")
    .optional()
    .or(z.literal("")),
  images: z.array(z.string()).max(4, "En fazla 4 fotoğraf ekleyebilirsiniz").optional(),
})

export type ReviewFormData = z.infer<typeof reviewSchema>
