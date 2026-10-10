import { z } from "zod";
import { SIZES } from "@/lib/types";

// Shared by the checkout form (react-hook-form) and POST /api/checkout + /api/cart/quote.

const required = "This field is required";

/** Bag limits — enforced by the cart store (client) and these schemas (server). */
export const MAX_QTY_PER_LINE = 20;
export const MAX_CART_LINES = 50;

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  color: z.string().min(1),
  size: z.enum(SIZES as [string, ...string[]]),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const shippingMethodSchema = z.enum(["standard", "express"]);

export const addressSchema = z.object({
  firstName: z.string().trim().min(1, required).max(80),
  lastName: z.string().trim().min(1, required).max(80),
  address: z.string().trim().min(1, required).max(200),
  apartment: z.string().trim().max(200).default(""),
  city: z.string().trim().min(1, required).max(100),
  postalCode: z
    .string()
    .trim()
    .min(1, required)
    .regex(/^[A-Za-z0-9 -]{3,10}$/, "Enter a valid postal code"),
  country: z.string().trim().min(2, required).max(60),
  phone: z
    .string()
    .trim()
    .min(1, required)
    .refine((v) => v.replace(/\D/g, "").length >= 7, "Enter a valid phone number")
    .pipe(z.string().max(30)),
});

/** Fields the shopper fills in on /checkout. */
export const checkoutFormSchema = z.object({
  email: z.string().trim().min(1, required).pipe(z.email("Enter a valid email address").max(200)),
  ...addressSchema.shape,
  shippingMethod: shippingMethodSchema,
});
export type CheckoutFormValues = z.input<typeof checkoutFormSchema>;

/** Request body of POST /api/checkout (creates the order + Stripe PaymentIntent; the payment method is chosen in Stripe's Payment Element). */
export const checkoutSchema = z.object({
  email: checkoutFormSchema.shape.email,
  address: addressSchema,
  shippingMethod: shippingMethodSchema,
  promoCode: z.string().trim().max(40).nullish(),
  items: z.array(cartItemSchema).min(1).max(MAX_CART_LINES),
  /** PaymentIntent from an earlier attempt in this session — cancelled so its stock is released. */
  previousPaymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]+$/).nullish(),
});

/** Query of GET /api/checkout/confirmation (Stripe appends both to the return URL). */
export const confirmationQuerySchema = z.object({
  payment_intent: z.string().regex(/^pi_[A-Za-z0-9_]+$/),
  payment_intent_client_secret: z.string().min(10).max(300),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Request body of POST /api/cart/quote. */
export const quoteSchema = z.object({
  items: z.array(cartItemSchema).max(MAX_CART_LINES),
  promoCode: z.string().trim().max(40).nullish(),
  shippingMethod: shippingMethodSchema.default("standard"),
});

export const promoFormSchema = z.object({
  code: z.string().trim().min(1, "Enter a code").max(40),
});
export type PromoFormValues = z.infer<typeof promoFormSchema>;
