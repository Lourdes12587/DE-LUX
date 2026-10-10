import { z } from "zod";

// Shared by the account forms (react-hook-form) and /api/auth/*.

const email = z.string().trim().min(1, "Enter your email").pipe(z.email("Enter a valid email address").max(200));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const PASSWORD_MIN = 8;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(80),
  lastName: z.string().trim().min(1, "Enter your last name").max(80),
  email,
  password: z
    .string()
    .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letters and at least one number"),
  marketingOptIn: z.boolean().default(false),
  /**
   * Proof of ownership when the email already placed orders without an account: the number of any of those
   * orders (it is on the confirmation page and the Stripe receipt). Prevents claiming someone else's orders.
   */
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^PH-\d{4}-\d{5}$/, "Use the format PH-2026-00125")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type RegisterInput = z.input<typeof registerSchema>;
