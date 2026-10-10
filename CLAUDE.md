# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DE LUX (formerly PHENOMENON; internal keys like the `phenomenon` DB, localStorage keys and `PHENOMENON20` keep the old name) — a premium, editorial-style fashion ecommerce (storefront + admin dashboard). Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (new-york, Radix), zustand, react-hook-form + zod, Prisma 6 on PostgreSQL 18. `docs/DATA-MODEL.md` documents the schema, `docs/API.md` the REST API, `PLAN.md` the roadmap.

Current state: storefront and admin read/write the database through REST Route Handlers. **Not done yet:** transactional email, reviews (no table — `Product.rating` is optional and absent from DB data).

## Commands

```bash
npm run dev      # dev server (http://localhost:3000)
npm run build    # production build — also the fastest full type/route check
npm run lint     # ESLint (flat config, next/core-web-vitals + typescript)
npx tsc --noEmit # type check only
npx shadcn@3.3.1 add <component>   # add a shadcn/ui primitive into src/components/ui

npm run db:migrate   # prisma migrate dev — after editing prisma/schema.prisma
npm run db:seed      # load mock data from src/lib/data/* (idempotent)
npm run db:studio    # browse the database
npm run db:reset     # DESTRUCTIVE: drop, re-migrate, re-seed — ask the user first
```

There is no test runner. If `tsc` reports errors inside `.next/types/...` after moving/renaming routes, delete `.next` and rerun — they are stale generated types.

PostgreSQL runs natively on Windows (port 3001, database `phenomenon`); `DATABASE_URL` is in `.env` (never print it — it holds the password). **`npm run build` needs the database running**, because catalogue pages are statically generated from it.

## Architecture

**Route groups.** `src/app/layout.tsx` only loads fonts (Bodoni Moda → `--font-bodoni`, Manrope → `--font-manrope`, Mrs Saint Delafield → `--font-signature`) and the global `<Toaster/>`.
- `src/app/(shop)/` — storefront. Its `layout.tsx` mounts AnnouncementBar, Header, Footer and the global overlays (MobileMenu, CartDrawer, SearchOverlay).
- `src/app/admin/` — admin dashboard with its own layout (ink sidebar + topbar), `robots: noindex`. The layout redirects signed-out users to `/account?next=/admin` and blocks customers; overview/payments/users pages are ADMIN-only (editors get products).

**Data access layers.**
- `src/lib/catalog.ts` (`server-only`) — storefront reads via Prisma, ACTIVE products only. `toProduct()` maps rows to the UI `Product` type; available stock = `Variant.stock` − non-expired `StockReservation`s.
- `src/server/*` (`server-only`) — `http.ts` (`handle()` wraps every route: ApiError/zod/Prisma → JSON status codes), `pricing.ts` (`priceCart()`, the **single source of truth** for prices, discounts and shipping), `checkout.ts` (Stripe checkout: `createCheckoutSession()` → PENDING order + stock reservation + PaymentIntent; `fulfillPayment()` idempotent reconciliation used by the webhook **and** `/api/checkout/confirmation`, so payments confirm locally without a webhook), `stripe.ts` (`getStripe()` — 503 when keys are missing; keys read at runtime), `admin/*` (products, payments, users, dashboard).
- `src/app/api/**/route.ts` — thin handlers: validate with zod, call the services. Server components call the services directly; client components `fetch` the API via `api()` in `src/lib/api.ts`.
- Client components must never import `@/lib/catalog`, `@/lib/db` or `@/server/*` (they would pull Prisma into the bundle). Pure helpers for client filtering/sorting live in `src/lib/catalog-utils.ts`.
- `src/lib/data/*` mocks are only used by `prisma/seed.ts` (plus static `editorialImages`, and the mock `/account/orders` page).

**Auth** (`src/server/auth.ts`, no external library): scrypt passwords (`src/server/password.ts`), DB sessions keyed by SHA-256 of the `ph_session` httpOnly cookie, in-process login rate limit. `getCurrentUser()` in server components; `requireUser()` in handlers; wrap admin handlers with `guarded(STAFF | ADMIN_ONLY, fn)` instead of `handle()` — **every new /api/admin route must use `guarded`**. Checkout requires an account (`createCheckoutSession(input, user)`); `/account` hosts sign-in/register (`?next=` sanitised by `safeNext`). Public sign-up cannot claim team accounts, and an email with past orders must prove one order number. Client session state: `useSession` (zustand, loads `/api/auth/me`). Team passwords: `npm run user:password -- <email> [customer|editor|admin]`.

**Schemas.** zod schemas in `src/lib/schemas/*` are shared by forms (react-hook-form + `zodResolver`) and API handlers, so client and server validate identically. Server field errors come back as `details.fieldErrors`; `applyServerErrors()` (`src/lib/form-errors.ts`) maps them onto form fields.

**Stock model.** Stock is per colour × size (`Variant`, one SKU each). `Product.variants` carries it to the UI; use `variantStock(product, color, size)`. `Product.stock` is the per-size sum across colours (filters/badges only).

**Categories.** Virtual collections (`new-in` → `newArrival`, `sale` → `compareAtPrice`) are defined in `src/lib/collections.ts`, not stored. Real categories match `Product.category` (a slug). Catalogue pages use ISR (`revalidate = 60`) and admin writes call `revalidatePath("/", "layout")`; admin pages are `force-dynamic`. Product images are either uploads (`POST /api/admin/uploads` → sharp → WebP in `storage/uploads/`, gitignored, served by `src/app/media/[file]/route.ts` because Next only serves `public/` files present at build time) or https URLs on a host allowed in `next.config.ts` (`IMAGE_HOSTS` in `src/lib/schemas/product.ts`). Products may have no images — storefront components must guard `images[0]`. New products default to DRAFT (hidden from the store); `/admin/products/[id]/preview` renders any status with the storefront components.

**Client state (zustand, `src/store/`).**
- `cart.ts` — persisted to localStorage (`phenomenon-cart`, version 2). Line key is `productId:color:size`; quantity is clamped to `maxQuantity` (that variant's stock). It stores the promo code but never validates it: totals come from `useCartQuote(method)` (`src/hooks/use-cart-quote.ts` → `POST /api/cart/quote`), which also syncs price/stock changes back into the bag.
- `wishlist.ts` — persisted (`phenomenon-wishlist`), stores product ids; the page loads them via `GET /api/products?ids=`.
- `ui.ts` — open state for cart drawer / search / mobile menu, plus `useHydrated()`. **Any render that depends on persisted state must be gated with `useHydrated()`** to avoid hydration mismatches (see Header counts, CartDrawer, cart/checkout/wishlist pages).

**Pricing** (`src/lib/pricing.ts`, shared): standard €4.95, express €9.95, free standard shipping when (subtotal − discount) ≥ €150. Discount codes are `DiscountCode` rows (seeded: `WELCOME10` once per customer, `PHENOMENON20` min €150); rules are evaluated only in `src/server/pricing.ts`.

**Checkout** (two steps): the react-hook-form details form posts to `/api/checkout`, which returns a Stripe `clientSecret` + `publishableKey`; `src/components/checkout/stripe-payment.tsx` mounts the Payment Element (methods come from the Stripe Dashboard) and confirms with `return_url=/order-confirmation`, which reconciles via the API and clears the bag only when paid. If the bag/details change after the PaymentIntent exists, the form requires re-confirming and cancels the old intent (`previousPaymentIntentId`). Stripe env vars: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (in `.env`; never print them). Admin refunds call the Stripe Refunds API; seed payments (fake ids) are refunded in the DB only.

## Design system

Tokens live in `src/app/globals.css` (`@theme inline`): `ink #111`, `paper #F8F7F4`, `stone #E8E6E1`, `burgundy #7A1018` (accent only — never large UI surfaces except deliberate editorial blocks), `rose`, `subtle` (secondary text), and reserved status colours `good` / `warning` / `critical` (state only, always paired with an icon + label — see `StatusBadge` in `src/components/admin/ui.tsx`). All radii are 0; avoid shadows and card borders on the storefront.

Reusable component classes in `globals.css`: `container-edit` (1440px max + gutters), `eyebrow`, `nav-label`, `display` (serif headings), `link-underline`, `field` (underline input), and buttons used as **`btn btn-primary` / `btn btn-outline` / `btn btn-light`** (the variant class does not include `.btn`). Fonts: `font-display`, `font-sans`, `font-script`. Use `ease-editorial` for motion; `<Reveal>` (`src/components/reveal.tsx`) does scroll fade-ins.

Images come from `images.unsplash.com` (allowed in `next.config.ts` `remotePatterns`); product images are 4:5. UI copy is English with EUR prices formatted via `formatPrice` (`src/lib/format.ts`).

shadcn primitives in `src/components/ui/` were locally restyled (softer overlay, no shadow on Sheet, custom ink Toaster) — check them before regenerating with `shadcn add --overwrite`.

## Environment notes (Windows)

The git repository root is the user's home directory (`C:\Users\Lenovo`), not this project — don't commit from here without confirming; suggest `git init` in the project first. When editing files from Windows PowerShell 5.1, `Get-Content -Raw`/`Set-Content` corrupt UTF-8 characters (€, —, ✓) — use the Edit/Write tools or Bash instead.

## Rules
- Al momento de crear datos nuevos no uses modales, usa plugins dedicadas para los formularios
- No uses server actions, usa Routes handlers
- para manejo de estados globales usa Zunstand
- para formularios usar react-hook-form y zod