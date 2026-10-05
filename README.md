# Northstar Admin

Operations workspace for a catalogue: products, catalog options, coupons, orders and
customers. Built with Next.js App Router, TypeScript, Tailwind CSS, Radix primitives,
TanStack Query, React Hook Form and Zod.

Everything is backed by an in-memory mock, so every screen is fully interactive —
create, edit, filter, sort, paginate and delete all really work, and the state resets
on reload.

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000/admin` (the root redirects there).

```bash
pnpm test    # vitest
pnpm lint    # eslint
pnpm build   # next build
```

## Architecture

```
types/          domain types, one file per bounded context
lib/mock/       mutable in-memory database (db) + seed data
lib/services/   the ONLY data boundary for the UI
lib/schemas/    zod schemas + form<->domain mappers
lib/utils/      pure helpers (formatting, enum labels, order maths, variant rules)
hooks/          useAdminList (URL state) + useAdminMutation (CRUD + toasts)
components/ui/  design-system primitives
components/admin/ layout, DataTable, forms and shared admin pieces
app/admin/      routes
```

A few decisions worth knowing:

- **`lib/services/` is the only way to data.** No component imports `lib/mock/`
  directly, so swapping the services for `fetch` calls leaves the UI untouched.
- **Services enforce the domain rules**, not just the forms: unique slugs, variant
  uniqueness, sale-window sanity, order status flow, and delete guards for records
  that other rows still reference.
- **Every list is server-side.** Search, filter, sort and page live in the URL and are
  applied by the service; the table never slices an in-memory array itself.
- **Orders and customers store snapshots.** Renaming a product does not rewrite the
  line items or shipping address of an order that already exists.
- **Reads are defensive copies.** `queryList` clones each row, so nothing rendered in
  the browser can mutate the store by accident.
- **Formatting is pinned** to `en-US`/UTC via `Intl`, so the server and client cannot
  disagree and produce a hydration mismatch.
- **Money inputs are validated as strings** and only then coerced — an unvalidated
  value is never `parseFloat`ed.
- **Full-page forms are inline, not modals.** `/admin/products/new` and
  `/admin/products/[id]/edit` render the form in the page, and the page header is
  present on the first paint, so opening one of them never flashes a skeleton and
  then pops a dialog over an empty page. Small CRUD lists keep their dialogs.
- **Destructive or stateful changes confirm first.** Order status and user role use a
  draft value: the select alone changes nothing, and the dialog is what saves.

## Domain rules

- Price lives on **Product** only. A `Variant` carries size, colour, SKU and stock.
- A product may not contain two variants with the same (size, colour) combination.
- An image belongs to a product and a colour; `colorId: null` means it is shared
  across every colour.
- Order status flows `PENDING → CONFIRMED → SHIPPING → DELIVERED`, and can be
  cancelled from any non-terminal state. Cancelled orders do not count as revenue.
- `Coupon.usedCount` is tracked by checkout and is read-only in the admin.
- A customer's addresses and a user's role are the only mutable fields on a user;
  addresses are never edited from the admin.

## Routes

| Route | Purpose |
| --- | --- |
| `/admin` | Totals, orders by status, low stock, recent orders |
| `/admin/products` | Product list with category/collection/status filters |
| `/admin/products/new`, `/admin/products/[id]/edit` | Add and edit, tabbed into info / variants / images |
| `/admin/products/[id]` | Detail with information, variants and images-by-colour |
| `/admin/categories`, `/admin/collections`, `/admin/sizes`, `/admin/colors` | Catalog options, each with a delete guard |
| `/admin/coupons` | Discount codes with usage counts |
| `/admin/orders`, `/admin/orders/[id]` | List with status/coupon filters; detail with the status control |
| `/admin/users`, `/admin/users/[id]` | List with role filter; detail with addresses and order history |

## Tests

`lib/utils/utils.test.ts`, `lib/utils/query.test.ts`, `lib/schemas/schemas.test.ts`,
`lib/services/services.test.ts`, `lib/services/dashboard.test.ts` and
`hooks/use-admin-mutation.test.ts` cover the formatting helpers, the human-readable
enum labels, the URL list-state round trip and page clamping, the order status
flow, the coercion in every schema, the delete guards, the dashboard arithmetic
(revenue must exclude cancelled orders), the service-level domain rules and the
optimistic-delete cache handling.

Run them with `pnpm test`.

## Out of scope

No authentication, no real API, no cart administration, and no editing of a
customer's addresses.