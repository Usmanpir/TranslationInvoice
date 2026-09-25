import 'server-only'
import { z } from 'zod'

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null)

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(200),
  phone: z.string().trim().min(1, 'Phone is required').max(50),
  address: optional(1000),
  company: optional(200),
  taxNumber: optional(50),
})

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200, 'Password is too long')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use at least one letter and one number')
