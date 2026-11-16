# DE LUX — E-commerce de moda

Tienda online completa de moda ("Parisian Modern Wardrobe"): catálogo, carrito, checkout con pagos reales con Stripe, área de cliente y panel de administración. Proyecto full-stack con Next.js y PostgreSQL.

## Funcionalidades

**Tienda**
- Catálogo por colecciones y categorías, buscador, ficha de producto con variantes (talla y color) e imágenes
- Carrito persistente y lista de deseos
- Checkout con **Stripe** (Payment Element + PaymentIntents) y webhooks para confirmar pagos
- Códigos de descuento, gastos de envío y control de stock con reservas durante el pago
- Cuenta de cliente: pedidos, direcciones y perfil
- Páginas de envíos, devoluciones, contacto y newsletter

**Panel de administración**
- Gestión de productos, usuarios y pagos (con reembolsos)
- Roles **ADMIN** y **EDITOR** con permisos distintos
- Registro de auditoría de acciones

## Tecnologías

| Área | Stack |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript |
| Base de datos | PostgreSQL + Prisma ORM (24 modelos: productos, variantes, pedidos, pagos, devoluciones, cupones…) |
| Pagos | Stripe |
| Formularios y validación | react-hook-form + Zod (mismos esquemas en cliente y API) |
| Estado | Zustand |
| UI | Tailwind CSS, Radix UI, componentes estilo shadcn, Lucide, Sonner |
| Autenticación | Sesión con cookie httpOnly y contraseñas con hash |

## Arquitectura

- `src/app/(shop)` — páginas de la tienda
- `src/app/admin` — panel de administración
- `src/app/api` — API REST con Route Handlers (validan con Zod y delegan en `src/server`)
- `src/server` — lógica de negocio: checkout, precios, Stripe, autenticación, subidas
- `prisma/` — esquema, migraciones y datos de ejemplo (seed)
- `docs/` — [documentación de la API](docs/API.md) y del [modelo de datos](docs/DATA-MODEL.md)

## Puesta en marcha

Requisitos: Node.js 20+ y PostgreSQL.

```bash
npm install
cp .env.example .env      # rellena DATABASE_URL y las claves de Stripe
npm run db:migrate        # crea las tablas
npm run db:seed           # carga productos de ejemplo
npm run dev               # http://localhost:3000
```

Sin claves de Stripe, la tienda funciona y el checkout responde 503.

Otros scripts: `npm run db:studio` (explorar la base de datos), `npm run user:password` (cambiar la contraseña de un usuario), `npm run lint`.

## Autora

**María de Lourdes Ortiz** — Desarrolladora web full-stack · [Creaciones Digitales](https://www.creaciones-digitales.com/)
