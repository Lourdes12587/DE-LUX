# API — DE LUX

REST con Route Handlers de Next.js (`src/app/api/**/route.ts`). JSON en la entrada y en la salida.
Los cuerpos se validan con zod; los esquemas están en `src/lib/schemas/*` y son los mismos que usan los formularios (react-hook-form).
La lógica vive en `src/lib/catalog.ts` (catálogo) y `src/server/*` (precios, checkout, admin); los handlers solo validan y delegan.

> **Estado actual**
> - **Autenticación por sesión** (cookie `ph_session`, httpOnly). `/api/admin/*` exige rol ADMIN o EDITOR (pagos, usuarios y resumen: solo ADMIN); el checkout y `/api/account/*` exigen sesión.
> - **Pagos con Stripe** (Payment Element + PaymentIntents). Sin claves en `.env`, el checkout responde 503. Los pagos de los datos de prueba (`pi_sim_…` y los ids inventados del seed) se reembolsan solo en la base.

## Errores

Todas las rutas responden `{ "error": string, "details"?: unknown }` con estos códigos:

| Código | Cuándo |
|---|---|
| 400 | JSON inválido o validación zod (`details` = `{ formErrors, fieldErrors }`) |
| 403 | Cuenta bloqueada intentando comprar |
| 404 | Recurso inexistente (o producto no publicado, en las rutas públicas) |
| 409 | Conflicto: sin stock, producto no disponible, slug/email duplicado, pago ya reembolsado, último admin, borrar producto con pedidos |
| 422 | El código de descuento no se puede aplicar al pedido |
| 500 | Error inesperado (se registra en el servidor) |

## Tienda (públicas)

### `GET /api/products`
Solo productos `ACTIVE`. Parámetros (uno de):

| Parámetro | Ejemplo | Resultado |
|---|---|---|
| `q` | `?q=trench&limit=6` | Búsqueda en nombre, descripción, categoría y color (sin distinguir mayúsculas) |
| `ids` | `?ids=id1,id2` | Productos por id en ese orden (wishlist). Ignora ids inexistentes |
| `collection` | `?collection=coats` | Slug de categoría o colección virtual (`new-in`, `sale`) |
| — | | Todo el catálogo activo |

Respuesta: `{ products: Product[] }`. `Product` (`src/lib/types.ts`) incluye `variants: { id, sku, color, size, stock }[]`, donde `stock` es lo **disponible** (stock − reservas activas), y `stock` por talla sumando colores.

### `GET /api/products/:slug`
`{ product: Product }` · 404 si no existe o no está activo.

### `GET /api/categories`
`{ categories: Category[] }`: New In, categorías reales (por `position`) y Sale.

### `POST /api/cart/quote`
Calcula la bolsa en el servidor (precios vigentes, stock, descuento y envío). Lo usan la bolsa y el checkout.

```json
{ "items": [{ "productId": "…", "color": "Camel", "size": "M", "quantity": 1 }],
  "promoCode": "WELCOME10", "shippingMethod": "standard" }
```
Respuesta:
```json
{ "subtotal": 265, "discount": 26.5, "shipping": 0, "total": 238.5,
  "promoCode": "WELCOME10", "discountError": null,
  "items": [{ "productId": "…", "color": "Camel", "size": "M", "unitPrice": 265, "available": 6 }] }
```
Si el código no aplica, `discountError` explica el motivo y el descuento es 0. Devuelve 409 si un artículo ya no existe.

### `POST /api/checkout`
Paso 1 del pago: crea el pedido **PENDING**, reserva el stock 30 min y abre un PaymentIntent de Stripe (no cobra). Sin compra como invitado: el pedido se asocia al `User` con ese email (se crea si no existe).

```json
{ "email": "ana@example.com",
  "address": { "firstName": "Ana", "lastName": "Ruiz", "address": "Calle Mayor 1", "apartment": "",
               "city": "Madrid", "postalCode": "28001", "country": "Spain", "phone": "600123123" },
  "shippingMethod": "standard", "promoCode": "WELCOME10",
  "items": [{ "productId": "…", "color": "Camel", "size": "M", "quantity": 1 }],
  "previousPaymentIntentId": null }
```
→ `201 { orderNumber, paymentIntentId, clientSecret, publishableKey, total }`. El navegador monta el Payment Element con `clientSecret` y confirma con `stripe.confirmPayment` (`return_url` = `/order-confirmation`).
`previousPaymentIntentId` cancela el intento anterior de la misma sesión (si el cliente cambió la bolsa) y libera su stock.
Errores: 409 sin stock · 422 código no aplicable o ya usado · 403 cuenta bloqueada · 502 Stripe rechazó crear el pago · 503 Stripe sin configurar.

### `GET /api/checkout/confirmation?payment_intent=pi_…&payment_intent_client_secret=…`
Stripe añade ambos parámetros al volver a `/order-confirmation`; el secreto demuestra que el visitante es quien pagó. Consulta el PaymentIntent en Stripe y **concilia el pedido** (no depende del webhook). Respuesta: `{ order: { number, email, status: "paid"|"processing"|"failed"|"cancelled", lines, subtotal, discount, shipping, total, method, address } }`.

### `POST /api/webhooks/stripe`
Avisos de Stripe (`payment_intent.succeeded`, `.payment_failed`, `.canceled`, `.processing`). Verifica la firma con `STRIPE_WEBHOOK_SECRET` (sin secreto o con firma inválida → 400). En local: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`; en producción, dar de alta la URL en el panel de Stripe.

**Conciliación (`fulfillPayment`, idempotente; la llaman el webhook y la confirmación):** pago correcto → pedido `PAID`, `Payment` con método/marca/últimos 4, stock descontado + `InventoryMovement` `SALE`, reservas liberadas, `DiscountRedemption` + `usedCount`. Cancelado → pedido `CANCELLED` y stock liberado. Fallido → `Payment` `FAILED` con motivo (el cliente puede reintentar). Si un pago llega con la reserva caducada y sin stock, el pedido se mantiene (el cliente ya pagó) y el movimiento queda marcado como *oversold*.

### `POST /api/newsletter`
`{ email }` → `{ subscribed: true }`. Idempotente.

## Autenticación y cuenta

Sesión con cookie `ph_session` (httpOnly, SameSite=Lax, Secure en producción, 30 días); en la tabla `Session` solo se guarda el SHA-256 del token. Contraseñas con scrypt (`src/server/password.ts`). 401 = sin sesión · 403 = sin permiso.

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/auth/register` | `{ firstName, lastName, email, password, marketingOptIn?, orderNumber? }` | `201 { user }` + cookie. Contraseña ≥ 8 con letras y un número. 409 email ya registrado · 409 `order_proof_required` si el email ya tiene pedidos (reenviar con uno de sus números) · 422 número no coincide · 403 cuenta del equipo (la activa un admin) |
| `POST /api/auth/login` | `{ email, password }` | `{ user }` + cookie · 401 credenciales incorrectas · 429 tras 8 intentos fallidos (15 min) |
| `POST /api/auth/logout` | — | `{ ok: true }` |
| `GET /api/auth/me` | — | `{ user }` o `{ user: null }` |
| `GET /api/account/orders` | — | Pedidos del cliente (sin los pendientes/cancelados del checkout) |
| `GET /api/account/orders/:number` | — | Detalle: artículos, totales, dirección, pago, envío · 404 si no es suyo |

Cuentas del equipo: `npm run user:password -- <email> [customer|editor|admin]` pide la contraseña por terminal, activa la cuenta y cierra sus sesiones.

## Admin (ADMIN / EDITOR)

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /api/admin/dashboard` | — | KPIs últimos 30 días vs. 30 anteriores, serie diaria de ingresos netos, ventas por categoría, pagos recientes, más vendidos, stock bajo |
| `GET /api/admin/categories` | — | `{ categories: { id, slug, name }[] }` |
| `GET /api/admin/products` | — | `{ products: AdminProduct[] }` (todos los estados, con `sku` base y `sold`) |
| `POST /api/admin/products` | `ProductInput` | `201 { product }` |
| `GET /api/admin/products/:id` | — | `{ product }` |
| `PUT /api/admin/products/:id` | `ProductInput` | `{ product }` |
| `DELETE /api/admin/products/:id` | — | `{ deleted: true }` · 409 si tiene pedidos (archivar en su lugar) |
| `POST /api/admin/products/:id/duplicate` | — | `201 { product }` copia en `DRAFT` con stock 0 |
| `POST /api/admin/products/status` | `{ ids: string[], status: "active"\|"draft"\|"archived" }` | `{ updated }` |
| `GET /api/admin/payments` | — | `{ payments: Payment[] }` (más recientes primero) |
| `POST /api/admin/payments/:paymentIntentId/refund` | `{ reason? }` opcional | `{ payment }` · reembolso total vía Stripe Refunds API (los pagos de prueba sin PaymentIntent real, solo en la base) · 409 si no está `SUCCEEDED` · 502 si Stripe lo rechaza |
| `GET /api/admin/users` | — | `{ users: AdminUser[] }` con nº de pedidos y gasto |
| `POST /api/admin/users` | `{ name, email, role: "editor"\|"admin" }` | `201 { user }` creado como `INVITED` · 409 email duplicado |
| `PATCH /api/admin/users/:id` | `{ role?, status? }` | `{ user }` · 409 si dejaría la tienda sin admin activo. Bloquear cierra sus sesiones |

### Imágenes de producto

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/admin/uploads` | `multipart/form-data` con campo `file` (JPG, PNG, WebP o AVIF, ≤ 10 MB) | `201 { url, width, height }` · 415 tipo no admitido · 413 demasiado grande · 422 no es una imagen válida |
| `GET /media/:file` | — | La imagen (`image/webp`, caché inmutable) · 404 si no existe |

La subida decodifica la imagen con sharp (rechaza archivos que no lo son), aplica la rotación EXIF, la limita a 2000×2500, elimina metadatos y la guarda como WebP con nombre UUID en `storage/uploads/` (fuera de `public/`, ignorado por git). La `url` devuelta (`/media/<uuid>.webp`) se usa en `images[]` del producto. Los archivos no se borran al quitar una imagen de un producto.

**`ProductInput`** (`src/lib/schemas/product.ts`): `name`, `slug` (minúsculas y guiones, único), `description`, `composition?`, `details[]`, `price`, `compareAtPrice` (null o mayor que `price`), `status`, `categoryId`, `featured`, `newArrival`, `bestSeller`, `seoTitle?`, `seoDescription?`, `colors: { name, hex }[]` (mínimo 1, nombres únicos), `stock: { [color]: { XS…XL: number } }`, `images: { url, alt }[]` (imágenes subidas `/media/…` o URLs https de `images.unsplash.com`, el dominio permitido en `next.config.ts`).

Guardar un producto sincroniza colores y variantes (color × talla, SKU `PH-XXX-NNN-COL-TALLA`), registra cada cambio de stock como `InventoryMovement` (`RESTOCK`/`ADJUSTMENT`) y revalida las páginas de la tienda.

## Probar rápido

```bash
curl "http://localhost:3000/api/products?q=coat&limit=3"
curl -X POST http://localhost:3000/api/cart/quote -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"<id>","color":"Sky","size":"M","quantity":1}],"promoCode":"WELCOME10"}'
```
