# Frontend Redesign Handoff — L'Oréal Clienteling

> Document for the next Claude Code agent. You are picking up after a backend prep phase. Read this top-to-bottom before touching the frontend.

---

## 1. Context: what this app is

L'Oréal Clienteling is a multi-brand retail clienteling platform for Mexico. It supports the 5 L'Oréal brands (Lancôme, Kiehl's, YSL, Maybelline, L'Oréal Paris) operating across department stores (Liverpool, Palacio) and brand-owned boutiques. The day-to-day user is the **Beauty Advisor (BA)** working the floor.

Stack:
- Monorepo (pnpm + Turbo)
- API: NestJS 11 + Drizzle + Postgres (pgvector) + Better Auth
- Web: Next.js 15 (apps/web)
- Mobile: Expo / React Native (apps/mobile)
- Sync: PowerSync (offline-first for mobile; currently broken config, not blocking)

Roles (in `users.role`):
- `admin` — sees everything, full CRUD on configuration
- `supervisor` — scoped to all stores of their zone
- `manager` — scoped to a single store
- `ba` — scoped to a single store, only their own customers/appointments

Scoping is enforced at the **service layer** via `ScopeService` (`apps/api/src/common/services/scope.service.ts`), not via DB RLS. Important: `users.id` is `text` (Better Auth) and domain tables use `uuid`, so FKs from users → domain tables are app-enforced, not DB-enforced.

---

## 2. What the previous session did (backend prep)

The frontend redesign relies on these backend changes that already shipped. **Do not redo them.**

### Schema changes
- `stores.lat` / `stores.lng` (numeric 10,7) — for the map widget on Create Store
- `brands.logoUrl` (varchar 500) — so listings don't need a JOIN on `brand_configs`
- `brand_stores` (new junction table, PK `(brand_id, store_id)`, cascade delete) — supports multi-brand stores (Liverpool sells Lancôme + Kiehl's + YSL)
- `appointments.event_type` (string) **dropped**; only `event_type_id` (FK to `appointment_event_types`) remains, now `NOT NULL`

### API changes
- `CreateStoreDto` accepts `lat`, `lng`, `brandIds[]` — service handles `brand_stores` upsert
- `CreateBrandDto` accepts `logoUrl`
- `CreateAppointmentDto` now requires `eventTypeId` (UUID), not `eventType` string
- `GET /stores/:id` returns `brandIds: string[]` alongside the row
- **`AuditInterceptor`** (global, in `common/common.module.ts`) — logs every POST/PATCH/PUT/DELETE to `audit_logs` with actor, IP, user-agent, and request body (secrets redacted). Skips `/auth/*`. Compliance for LFPDPPP.

### Migrations
- Migration `0003_wild_marvel_boy.sql` generated and applied
- Drizzle journal backfilled for migrations 0001–0003 (was desynced)

### Already existed and works (don't rebuild)
- POST/PATCH on `/zones`, `/brands`, `/stores`, `/customers`, `/products`
- `BrandsController.upsertConfig` → `PUT /brands/:id/config` for colors/logo/VIP threshold/modules
- Customer ARCO endpoint (`DELETE /customers/:id/arco`) for "derecho al olvido"

---

## 3. The target user (this is the most important constraint)

The dashboard has two real personas:

1. **Demo / RFP** — we're showing this to L'Oréal executives. The first 30 seconds must look impressive.
2. **Manager / Supervisor daily use** — they open the app weekly to adjust BAs, see analytics, add a new store. They need speed, not tutorials.

**It is NOT** for:
- A first-time IT admin doing setup once (so don't build long onboarding wizards)
- A technical operator (so ergonomics matters, "fast & ugly" is not OK)
- BAs (they use the mobile app, not the web admin)

This implies:
- Wow-factor visuals where they pay off (map, live previews, illustrated empty states)
- No multi-step setup wizard — the user doesn't want a tutorial every login
- Ergonomic shortcuts that pay off on day 364, not just day 1 (global Create dropdown, quick-create inline, duplicate-last)

---

## 4. UX principles that drive every decision

Sourced from NN/G, Adobe Commerce, Userpilot, Eleken, LogRocket, and Linear/Notion/Stripe/Shopify pattern research.

### A. Don't ask for data you already know
- **Smart defaults from session**: BA's `storeId`, `brandId`, `zoneId` should pre-fill anything that needs them. The form should ask the user nothing the system already knows.
- **Infer over ask**: derive city/state from address autocomplete, age from birthdate, `lifecycleSegment` from purchase history (don't make it editable).
- **One source of truth**: a customer's brand comes from their last BA's brand. Don't ask twice.

### B. Container hierarchy — when to use what
| Container | When | L'Oréal example |
|---|---|---|
| Inline / quick-add row | 1 field or repeating list | Add zones, tags, shades |
| Popover | 1–3 fields, no context needed | Change customer segment, tag |
| **Side drawer (slide-over)** | 4–10 fields, want context behind visible | **Default for Create Brand / Store / BA / Appointment** |
| Modal centered | Blocking or destructive decision | Delete brand, ARCO confirmation |
| Full page | Complex entity with media + sections | Create product, edit customer |

**Stop using modals for everything.** Linear, Notion, Stripe default to drawers. Modals only for confirmations.

### C. Quick-create inline (kill context switching)
When the user is inside a Store form and needs a Zone that doesn't exist, a `[+ New zone]` button opens a mini-modal *inside the drawer*. They create it, the parent form keeps its values, the new zone is auto-selected.

This is the **single biggest fix** for the user's stated complaint of "having to jump between modules." Apply to every parent FK selector:
- Store form → quick-create Zone, quick-create Brand link
- Product form → quick-create Brand
- Appointment form → quick-create Customer
- BA form → no quick-create needed (Store/Brand always exist)

### D. Visual elements that move the needle
1. **Map for Stores** — autocomplete address → mini map (static tile or Mapbox/Google Static API; do not need full interactive map for v1). Already have `stores.lat/lng` in DB.
2. **Image drop zone with preview**, not file picker buttons — for products, brand logos, BA avatars.
3. **Live preview pane on the right** — only where it adds value: Brand (logo + colors applied), Product (card preview). Skip for BA, Zone, Customer (no visual to preview).
4. **Avatar with initial + auto-color** for BAs and Customers (generate hash → color from name).
5. **Illustrated empty states with one big CTA**, never empty tables. Critical for demo.
6. **Bulk import for Products** with CSV preview of first 5 rows mapped — don't import blind.
7. **Tag/chip selectors** for "brands operating in this store" (multi-select chips, not `<select multiple>`).
8. **Skeleton loaders + micro-interactions** for new rows fading in. Linear-quality polish matters in demos.

### E. The "global Create" pattern
Add a persistent **"+ Create ▾"** button in the sidebar/header that opens a dropdown:
```
+ Create ▾
  ├── Brand
  ├── Zone
  ├── Store
  ├── Beauty Advisor
  ├── Product
  └── Customer
```
Clicking any option opens the relevant side drawer **without navigating away** from where the user currently is. This is what kills the "jumping between modules" pain.

### F. What NOT to build
- ❌ Long onboarding wizard / coach marks
- ❌ ⌘K command palette (overkill for this audience)
- ❌ Tour mode
- ❌ 2FA in the demo flow
- ❌ Live preview on entities that don't have a visual (BA, Zone)

---

## 5. Concrete redesign priorities (in order)

| # | Feature | Why | Container | Visual |
|---|---|---|---|---|
| 1 | **Global "Create ▾" dropdown** in sidebar | Solves daily pain | — | Dropdown menu |
| 2 | **Quick-create inline** for parent FKs | Kills context switching | Mini-modal inside drawer | — |
| 3 | **Illustrated empty states** with CTA | Demo-critical when DB is fresh | Full-pane | Illustration + 1 button |
| 4 | **Create Brand** — drawer with **live preview** | Demo wow | Side drawer | Logo + colors live preview card |
| 5 | **Create Store** — drawer with **mini map** + address autocomplete + multi-brand chip selector | Demo wow + real utility | Side drawer | Static map tile, pin updates with address |
| 6 | **Create BA** — drawer with avatar (initial + color) | Daily use | Side drawer | Avatar preview |
| 7 | **Create Product** — full page with image drop zone + product card preview | Daily use | Full page | Drag-drop gallery + live card |
| 8 | **Bulk import Products** (CSV) with preview-before-confirm | Productivity | Full page | Tabular preview |
| 9 | **Duplicate last** action on Stores/Products lists | Power-user shortcut | Inline button | — |

Stop here. Don't add more without user input.

---

## 6. Where to wire things in code

### Web app structure (`apps/web/`)
> The previous session didn't open this directory. Start by reading `apps/web/package.json`, then `apps/web/app/` (Next.js 15 app router). Look for existing patterns before introducing new ones.

### API contracts to use
| Action | Endpoint | DTO |
|---|---|---|
| Create brand | `POST /brands` | `CreateBrandDto` (now includes `logoUrl`) |
| Upsert brand config | `PUT /brands/:id/config` | `UpsertBrandConfigDto` |
| Create zone | `POST /zones` | `CreateZoneDto` |
| Create store | `POST /stores` | `CreateStoreDto` (now includes `lat`, `lng`, `brandIds[]`) |
| Create user (BA) | `POST /users` | check `UsersModule` — has `invitationStatus` flow |
| Create product | `POST /products` | `CreateProductDto` |
| Create customer | `POST /customers` | `CreateCustomerDto` |
| Create appointment | `POST /appointments` | `CreateAppointmentDto` (uses `eventTypeId`, not `eventType`) |

Auth: Bearer token via Better Auth. Frontend uses `@better-auth/expo` on mobile and standard Better Auth client on web. Already wired — don't touch.

### Important conventions in this codebase
- DTOs use `class-validator` + `@nestjs/swagger`
- `forbidNonWhitelisted: true` in global ValidationPipe — sending extra fields = 400
- Drizzle is the ORM. Schema is the source of truth (`packages/database/schema/`)
- Roles enforced via `@Roles(["admin"])` decorator from `@thallesp/nestjs-better-auth`
- All writes are auto-audited by `AuditInterceptor` — no manual `audit.log()` calls needed

---

## 7. Things the previous session noted but did NOT fix

These remain open and may bite. Discuss with user before tackling.

1. **`customers.lifecycleSegment` is persisted but derivable** — should be a view or computed on read. Today nothing updates it after seed. Demo-fine, production-bug.
2. **`customers.phone` has `.unique()`** — risky for shared family phones. UX should de-dupe at presentation, not DB.
3. **Soft-delete is inconsistent** — some tables use `active`, customers uses `inactive`, appointments uses `status='cancelled'`. No global rule.
4. **PowerSync container in docker-compose has a broken config.yaml** (`client_auth > jwks > Expected a map but got boolean`). It restarts in a loop. Doesn't block the web frontend, but mobile sync is dead until fixed.
5. **No `organizations`/`tenants` table** — multi-tenancy is by role, not by schema. Fine for L'Oréal only.
6. **No `notifications`/`activity` table** — useful for a "Recent activity" widget on the dashboard if the user wants one.

---

## 8. The Docker setup

```bash
# Postgres + PowerSync containers
docker compose -f infra/docker/docker-compose.yml up -d
# Postgres: localhost:5433, user/pass: loreal/loreal, db: loreal_clienteling

# Seed
pnpm db:seed
# Truncates everything and reseeds 3 zones, 5 brands, 10 stores, 19 users, 250 products, 120 customers, etc.
# Admin login: admin@loreal.mx / Password123!
```

The user keeps a partial seed state (users + brands kept, the rest truncated) when iterating. Don't reseed without asking.

---

## 9. Definition of "done" for this redesign phase

A demo where:
1. The admin lands on a dashboard with illustrated empty states (or seeded data if loaded).
2. They click "+ Create ▾" → "Store" from anywhere.
3. Side drawer opens. They type an address, see the map pin update live.
4. They tap "+ Brand" inline to add a new brand without leaving the drawer.
5. They submit. The new store appears in the list with a fade-in animation.
6. The list view shows logos, chips, polished cards — not a stark table.

If all of that works, the redesign is shipped. Anything beyond is gold-plating.

---

## 10. Communication style the user expects

- Spanish for chat, English for code/comments
- Direct, no hedging, no over-apologizing
- Short commit messages, conventional commits (`feat(web):`, `fix(api):`)
- Don't claim a feature works without actually testing it in the browser
- When unsure between two approaches, present trade-offs and ask — don't just pick
- The user is fast: they'll tell you when they want detail, default to brief

---

**End of handoff. Start by reading `apps/web/` to understand the current state of the web admin before proposing changes.**
