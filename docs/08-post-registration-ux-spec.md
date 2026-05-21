# 08 — Post-Registration UX Specification

> **Audience:** A Claude Code agent picking this up cold, with no prior conversation context. Read end-to-end before writing code.
>
> **Scope:** Everything the Beauty Advisor (BA) sees and does **after** the registration wizard succeeds and they land on a customer profile. This document defines screens, components, interactions, microcopy, and the order in which to build them. It does **not** redefine the registration wizard itself (already implemented — see `apps/web/app/(dashboard)/clientes/_components/customer-registration-wizard.tsx`).
>
> **Stack you're working in:**
> - Next.js 15 App Router + TypeScript (`apps/web`)
> - shadcn/ui + Base UI primitives (`apps/web/components/ui/*`)
> - Tailwind v4 (no config file; tokens via CSS)
> - React Query for server state, `react-hook-form` + zod for forms
> - NestJS API (`apps/api`) with Drizzle + Postgres
> - Shared types in `packages/contracts` — **never** duplicate types in the web app
>
> **What this doc is NOT:** a redesign of the listing page, the sidebar, or the auth flow. Stay inside the post-registration surface.

---

## Table of contents

1. [Mental model](#1-mental-model)
2. [The 90-second rule](#2-the-90-second-rule)
3. [Information architecture](#3-information-architecture)
4. [Customer Profile 360 — anatomy](#4-customer-profile-360--anatomy)
5. [Tab specifications](#5-tab-specifications)
6. [Cross-cutting visual patterns](#6-cross-cutting-visual-patterns)
7. [Component inventory — what to reuse vs build](#7-component-inventory--what-to-reuse-vs-build)
8. [Implementation order — sprint-by-sprint](#8-implementation-order--sprint-by-sprint)
9. [Naming conventions](#9-naming-conventions)
10. [Acceptance criteria per surface](#10-acceptance-criteria-per-surface)
11. [Anti-patterns to avoid](#11-anti-patterns-to-avoid)
12. [Reference: industry sources](#12-reference-industry-sources)

---

## 1. Mental model

The BA's day is structured around three distinct moments. The UI must serve each one differently:

| Moment | Duration | UI optimized for |
|---|---|---|
| **A. Right after registration** | 30–60s | Optional quick-capture of 1-2 highest-value fields. Skippable. |
| **B. During the consultation** | 5–15 min | Fast lookup, fast actions: log purchase, recommend, note, schedule. |
| **C. After the shift / next day** | async | Tasks dashboard ("Hoy"): follow-ups, birthdays, replenishment alerts. |

Every screen we build must be classified into one of these moments. **A screen that tries to do all three at once is a screen that fails all three.**

The registered customer first lands on a **Customer Profile 360** page. That page is the home base for moments A and B. Moment C lives on a separate "Hoy" page (out of scope for this doc — covered in a later spec).

---

## 2. The 90-second rule

> The average BA-customer interaction is **90 seconds**. Every extra tap is a customer who didn't get served.

This rule **overrides aesthetics** when they conflict. Concrete consequences:

- The 5 most-used actions on the profile must be reachable in **1 tap from anywhere on the page**
- No action requires more than **3 taps to complete** (open → fill → save)
- **No multi-screen wizards** for routine actions. Wizards are for first-time flows only (like registration)
- **Skeleton screens, not spinners**, for any wait > 100ms
- Default values must be **always populated** — never start a form with empty fields the BA has to fill manually

---

## 3. Information architecture

### 3.1 Where the user lands

After clicking "Registrar" in the wizard, the app navigates to:

```
/clientes/[id]
```

This route already exists at `apps/web/app/(dashboard)/clientes/[id]/page.tsx`. The page component to refactor is at `apps/web/app/(dashboard)/clientes/[id]/_components/customer-detail-page.tsx`.

### 3.2 Page header (always visible, never scrolls away on mobile)

```
┌────────────────────────────────────────────────────────────────┐
│ ← Volver                                          [⋯ Acciones] │
│                                                                 │
│ 👤  María García                              [VIP]            │
│     maria@ejemplo.com · +52 55 4827 1936                       │
│     Clienta desde mar 2026 · Última visita: hoy                │
│                                                                 │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│ │ LTV          │ Compras      │ Citas        │ Última visita│ │
│ │ $4,820       │ 6            │ 2            │ Hoy          │ │
│ │ ▲ 14% mes   │              │ → 1 próxima  │              │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### 3.3 Quick actions bar (the 1-tap surface)

Beneath the header, a sticky row of 5 primary actions:

```
[+ Compra]  [+ Recomendar]  [+ Cita]  [+ Nota]  [💬 Mensaje]
```

- Each action opens a **Sheet** (right-side on desktop, full-screen modal on iPad portrait)
- Each Sheet is **single-purpose** — no nested tabs inside
- These are the 5 actions covered by RF-13, RF-20, RF-26, RF-34, RF-35 — every other action lives inside the tabs

### 3.4 Tabs (lazy-loaded)

```
┌──────────┬─────────┬─────────┬───────────────┬───────┬───────┐
│ Overview │ Belleza │ Compras │Recomendaciones│ Citas │ Notas │
└──────────┴─────────┴─────────┴───────────────┴───────┴───────┘
```

- Default tab: **Overview** (timeline of activity)
- Each tab loads its own query lazily (don't preload all 6)
- URL state: `/clientes/[id]?tab=compras` so tabs are shareable and back-button works
- Use `Tabs` from shadcn (already installed at `apps/web/components/ui/tabs.tsx` if present; if not, build on `@base-ui/react/tabs`)

---

## 4. Customer Profile 360 — anatomy

### 4.1 Layout grid

Desktop (≥ 1024px):

```
┌─ Sidebar (existing) ─┬─ Main content ───────────────────────┐
│                       │                                       │
│                       │  Header (40px vertical, sticky)       │
│                       │  KPI cards (one row, 4 cards)         │
│                       │  Quick actions (one row, 5 buttons)   │
│                       │  ─────────────────────────────────    │
│                       │  Tabs                                 │
│                       │                                       │
│                       │  Tab content                          │
│                       │  (max-width: 1100px, centered)       │
│                       │                                       │
└───────────────────────┴───────────────────────────────────────┘
```

iPad portrait (≥ 768px, < 1024px):

- Sidebar collapses to icons-only
- Quick actions become a 2-row grid (3+2)
- KPI cards stay in one row but compact

iPad landscape:

- Same as desktop layout

### 4.2 Header component spec

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-profile-header.tsx`

Props:

```ts
interface CustomerProfileHeaderProps {
  customer: Customer;
  metrics: {
    ltv: number;
    ltvChangePct: number | null;
    purchaseCount: number;
    appointmentCount: number;
    nextAppointmentAt: string | null;
    lastVisitAt: string | null;
  };
}
```

Visual:

- Avatar uses the existing `Avatar` component, size `lg` (56px)
- Name in `text-xl font-semibold`
- Segment badge to the right of name, using the existing `Badge` with variant matching `lifecycleSegment`
- Secondary line: email · phone in `text-sm text-muted-foreground`
- Tertiary line: "Clienta desde {fecha}" · "Última visita: {relativa}" in `text-xs text-muted-foreground`

### 4.3 KPI cards spec

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-kpi-cards.tsx`

Each card:

```
┌──────────────────────────┐
│ LTV                  ▲14% │  ← label + delta in text-xs, top row
│ $4,820                   │  ← value in text-2xl font-semibold
│ ────────────             │  ← optional sparkline (skip in v1)
└──────────────────────────┘
```

- 4 cards in a `grid grid-cols-2 lg:grid-cols-4 gap-3`
- Use existing `Card` component
- Delta colors: green for positive, red for negative, neutral for null. Use `text-success` / `text-destructive` tokens that already exist in the theme.
- The "Próxima cita" card is **clickable** — switches to the Citas tab
- **No sparklines in v1** — too easy to over-engineer. Add later.

### 4.4 Quick actions spec

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-quick-actions.tsx`

```tsx
const actions = [
  { id: "purchase", label: "Compra", icon: ShoppingBagIcon, color: "default" },
  { id: "recommend", label: "Recomendar", icon: SparklesIcon, color: "default" },
  { id: "appointment", label: "Cita", icon: CalendarIcon, color: "default" },
  { id: "note", label: "Nota", icon: StickyNoteIcon, color: "default" },
  { id: "message", label: "Mensaje", icon: MessageCircleIcon, color: "default" },
];
```

Buttons use the existing `Button` component, variant `outline`, size `default`. Icon left of label. On hover: subtle lift (`shadow-sm`).

State is held by a single `useState<ActionId | null>(null)` in the parent page — each Sheet reads this state.

---

## 5. Tab specifications

### 5.1 Overview tab — timeline

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-overview-timeline.tsx`

This is the **default view** — what the BA sees the moment they open the profile. Industry pattern: a vertical activity stream.

#### Visual

```
●  Hoy, 14:30                                       BA: Tú
│  💳  Compra de $1,890
│      Génifique Sérum 30ml
│
●  Hoy, 14:25                                       BA: Tú
│  ✨  3 productos recomendados
│      Génifique · Hypnôse · Idôle
│
●  Hace 2 semanas                                  BA: Ana V.
│  📅  Facial completo (60 min)
│
●  Hace 1 mes                                      BA: Ana V.
│  💳  Compra de $560
│      Hypnôse Mascara
│
○  Hace 3 meses                                    Sistema
   ✨  Clienta registrada
```

#### Specs

- Vertical line in `border-l border-border`, dots positioned with `absolute -left-[5px]`
- Dot colors by event type:
  - `purchase` → `bg-success` (green)
  - `recommendation` → `bg-primary` (brand)
  - `appointment` → `bg-warning` (amber)
  - `note` → `bg-muted-foreground` (gray)
  - `registration` → `ring-2 ring-border bg-background` (empty dot)
- Timestamps: relative (`"Hoy, 14:30"`, `"Hace 2 semanas"`) using `date-fns` `formatDistanceToNow` with `locale: es`
- Each row: timestamp on top-left, BA name on top-right, content below
- Click a row → open the relevant detail (purchase → expand inline, appointment → switch to citas tab and highlight)

#### Data source

New endpoint: `GET /customers/:id/activity?limit=20&before=<cursor>` returns a unified, paginated feed of:
- `customer_registered` event (synthetic, from `customers.created_at`)
- Each row in `purchases` for this customer
- Each row in `recommendations` for this customer
- Each row in `appointments` for this customer (past + future)
- Each row in `communications` for this customer (RF-37)

Backend lives at `apps/api/src/modules/customers/customers.controller.ts` — add a new method `getActivity()`.

#### Empty state

For a freshly-registered customer (only the `customer_registered` event):

```
[Avatar plant illustration]

Aún no hay actividad

Cuando registres compras, recomendaciones o citas
con María, aparecerán aquí en orden cronológico.

[+ Registrar primera compra]
```

Use existing `EmptyState` component with `CustomersIllustration`.

---

### 5.2 Belleza tab — preference enrichment

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-beauty-profile.tsx`

This tab is where the BA enriches the customer over time — never in a single form, always one tap at a time.

#### Visual

```
Tipo de piel
─────────────────────────────────────────────
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│   💧    │ │   ⚖️    │ │   🌵    │ │   🌸    │
│  Grasa  │ │  Mixta  │ │   Seca  │ │Sensible │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
            ┃━━━━━━━━━┃                          ← selected = ring + bg-primary/5

Preocupaciones                          (varias)
─────────────────────────────────────────────
┌─────┐ ┌─────┐ ┌─────┐ ┌─────────┐ ┌─────┐
│Acné │ │Mancha│ │Líneas│ │Hidratación│ │Poros│
└─────┘ └─────┘ └─────┘ └─────────┘ └─────┘

Subtono
─────────────────────────────────────────────
┌────────┐ ┌────────┐ ┌────────┐
│  🟡    │ │  🔵    │ │  ⚪    │
│ Cálido │ │  Frío  │ │ Neutro │
└────────┘ └────────┘ └────────┘

Shade en base                            [+ Agregar]
─────────────────────────────────────────────
┌────────────────────────────────────────┐
│ Lancôme Teint Idole — 230C  Beige      │
│ Capturado 21 may 2026 · Por ti    [✕] │
└────────────────────────────────────────┘
```

#### Specs

- Each section header is `text-sm font-semibold`, with optional helper to the right
- Card selectors are built with a new component `<SelectableCard>` (see §7) — variant `single` for "Tipo de piel", `multi` for "Preocupaciones"
- Toggling a card **saves immediately** via `PATCH /customers/:id/beauty-profile` — no save button
- Use `useMutation` with `onMutate` for optimistic update; on error, rollback and toast
- Shade entries use the existing `Card` component with a thin border, swatch color from the product, and a remove button

#### Data source

Reads `GET /customers/:id/beauty-profile` and `GET /customers/:id/beauty-profile/shades`. Both endpoints already exist in `apps/api/src/modules/beauty/beauty.controller.ts`. Confirm contract types in `packages/contracts/src/types/beauty-profiles.ts`.

#### Empty state

Don't show an empty state per section — show the cards in their unselected state. The empty state is the unselected grid itself.

---

### 5.3 Compras tab — purchase history + new purchase

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-purchases-tab.tsx`

#### Visual

```
Compras                                  [+ Nueva compra]
─────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────┐
│ Hoy · 14:30                              $1,890   ▾ │
│ Génifique Sérum 30ml                                │
│ Atribuida a: Tú                                     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ 8 abr 2026                                $560    ▾ │
│ Hypnôse Mascara · Bi-Facil Démaquillant            │
│ Atribuida a: Ana V.                                 │
└──────────────────────────────────────────────────────┘
```

- Cards stacked vertically with `gap-2`
- Click chevron or whole card to expand and show line items
- Most recent first

#### New purchase sheet — `customer-purchase-sheet.tsx`

```
┌── Nueva compra ──────────────────────────────┐
│  Fecha: [hoy ▾]                                │
│                                                │
│  [🔍 Buscar producto o escanear SKU]          │
│                                                │
│  Selección (2)              Total: $1,450     │
│  ┌──────────────────────────────────────────┐ │
│  │ [foto] Teint Idole 230C       $890  [✕] │ │
│  │        Cantidad [- 1 +]                  │ │
│  ├──────────────────────────────────────────┤ │
│  │ [foto] Bi-Facil 200ml         $560  [✕] │ │
│  │        Cantidad [- 1 +]                  │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Notas (opcional)                              │
│  [_________________________________]           │
│                                                │
│  [Cancelar]              [Registrar venta]     │
└────────────────────────────────────────────────┘
```

Key behaviors:

- Search uses `GET /products?query=...` — debounced 300ms
- Empty search returns the **top 12 products** for the BA's brand (already used by this customer if available, otherwise brand bestsellers)
- Results show as **tiles** in a 3-col grid with image + name + price + `[+]` button
- Each tile add → animates the product flying into the "Selección" list (use Framer Motion `layoutId` shared element, or just fade-in)
- Quantity uses **stepper** ([-] [1] [+]), not a text input
- BA attribution is **automatic** from `session.user` — never shown as a field
- On submit: `POST /purchases`, then close sheet, then prepend the new purchase card to the list (optimistic via React Query)

#### Skip SKU scan in v1

Use a separate button later (`📷 Escanear`) that opens a camera modal. v1 = search only.

---

### 5.4 Recomendaciones tab

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-recommendations-tab.tsx`

Almost identical layout to Compras — same card pattern, same sheet pattern, but:

- The action is `POST /recommendations` instead of `POST /purchases`
- No total price
- Each recommendation card shows: products + free-text "Notas para la clienta"
- A toggle "Enviar rutina por WhatsApp" at the bottom of the sheet (disabled if customer has no `marketing_whatsapp` consent or no phone)
- After save, if WhatsApp toggle was on → fire-and-forget call to `POST /communications` with `channel: "whatsapp"` and a templated message

#### Recommendation suggestions row (v2, skip in v1)

Above the search bar, a horizontal scroll of 3-5 suggested products with a "porque" tooltip. Powered by RF-15 motor — out of scope for v1.

---

### 5.5 Citas tab — calendar-as-canvas

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-appointments-tab.tsx`

This is the **flagship visual surface** — apply the calendar-as-canvas pattern here.

#### Visual

```
Próximas citas                              [+ Nueva cita]
──────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────┐
│  Mié 28 may  ·  14:30                                │
│  💆 Facial completo (60 min)                         │
│  BA: Tú                                              │
│                              [Reagendar] [Cancelar] │
└──────────────────────────────────────────────────────┘

Pasadas
──────────────────────────────────────────────────────────

[similar cards, dimmed by 60%, no action buttons]
```

#### New appointment sheet — `customer-appointment-sheet.tsx`

This is the **most important visual element of the spec**. Replace any traditional date+time form with this layout:

```
┌── Nueva cita para María ──────────────────────────────┐
│                                                         │
│  Tipo de servicio                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐         │
│  │     ✨     │ │     💆     │ │     💎     │         │
│  │   30 min   │ │   60 min   │ │   90 min   │         │
│  │  Consulta  │ │  Facial    │ │ Cabina VIP │         │
│  │            │ │  ●         │ │            │         │
│  └────────────┘ └────────────┘ └────────────┘         │
│                                                         │
│  ┌─── Mayo 2026 ────┐    ┌─── Mié 28 may ──┐          │
│  │ L  M  M  J  V  S D│   │                  │          │
│  │       1  2  3  4 5│   │  10:00      ○    │          │
│  │ 6 ·7  8  9 10 11 │   │  10:30      ○    │          │
│  │ 13 14·15 16 17 18│   │  11:00      ○    │          │
│  │ 20 21·22 23 24·25│   │  11:30      ●    │          │
│  │ 27[28]29 30 31    │   │  14:00      ○    │          │
│  └───────────────────┘   │  14:30      ○    │          │
│  • día con disponibilidad│  15:00      ○    │          │
│                          └──────────────────┘          │
│                                                         │
│  Notas para la clienta (opcional)                       │
│  [_______________________________________]              │
│                                                         │
│  [Cancelar]                       [Confirmar cita]     │
└─────────────────────────────────────────────────────────┘
```

#### Specs

- **Service type cards** — `SelectableCard` variant `single`. Icon (lucide) + duration + name. Selected = ring + bg-primary/5
- **Date + time on the same screen** — left half is a calendar month grid, right half is a vertical list of time slots for the selected day
- **Calendar**: build on `react-day-picker` (already a Next.js ecosystem standard, MIT). If not installed, add it via `pnpm --filter web add react-day-picker date-fns`
- **Availability dots** under each day come from `GET /appointments/availability?baUserId=<me>&from=<start>&to=<end>&durationMinutes=<svc>` — a new endpoint that returns the days in range with at least one open slot
- **Time slots** come from `GET /appointments/availability/slots?baUserId=<me>&date=<selected>&durationMinutes=<svc>` — returns the open slots for that day filtering for the service duration
- Slots are shown as full-width rows: time on left, status circle on right (○ = open, ● = selected). Booked slots are **hidden**, not greyed out
- Selecting a service **refilters** the calendar and slot list (90 min hides days/slots where only 30 min is free)
- The customer is fixed (we're inside her profile) — no customer selector

#### Backend additions needed

Two new endpoints in `apps/api/src/modules/appointments/appointments.controller.ts`:

```
GET /appointments/availability?baUserId=&from=&to=&durationMinutes=
  → returns Array<{ date: string; hasAvailability: boolean }>

GET /appointments/availability/slots?baUserId=&date=&durationMinutes=
  → returns Array<{ startsAt: string; endsAt: string; available: boolean }>
```

Service logic: read `appointments` for the BA in range, subtract from working hours (hardcode 10:00-19:00 for v1, configurable in `users` later), return free slots aligned to 30-min grid.

---

### 5.6 Notas tab

**File:** `apps/web/app/(dashboard)/clientes/[id]/_components/customer-notes-tab.tsx`

#### Visual

```
Notas                                          [+ Nota rápida]
──────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────┐
│ 🟡 Hoy, 14:32 · Tú                          [✕]     │
│                                                       │
│ Prefiere shades cálidos. Le encantó el Idôle —      │
│ regresa en 2 semanas con su mamá.                    │
│                                                       │
│ Vinculada a: Idôle EDP 50ml                          │
└──────────────────────────────────────────────────────┘
```

#### New note modal — `customer-note-dialog.tsx`

Don't use a Sheet for notes — use a small centered Dialog. Notes are quick.

```
┌── Nueva nota ──────────────────────────┐
│                                          │
│  [______________________________]        │
│  [                              ]        │
│  [                              ]        │
│                                          │
│  0 / 500                                 │
│                                          │
│  ☐ Vincular a un producto              │
│  ☐ Solo visible para ti                │
│                                          │
│  [Cancelar]              [Guardar]      │
└──────────────────────────────────────────┘
```

No file attachments in v1.

#### Backend

New small module `apps/api/src/modules/customer-notes/` with table `customer_notes` (id, customer_id, body, product_id nullable, private, author_user_id, created_at). Add schema in `packages/database/schema/customer-notes.ts` and migration.

---

## 6. Cross-cutting visual patterns

These patterns appear in multiple tabs. Build them **once**, reuse everywhere.

### 6.1 Card selector

A tappable card that represents a choice. Three variants:

- **single** — one card active at a time (radio-style)
- **multi** — many cards active simultaneously (checkbox-style)
- **toggle** — single card that toggles on/off

```tsx
<SelectableCard
  variant="single"   // | "multi" | "toggle"
  selected={isSelected}
  onSelect={() => setSelected(...)}
  icon={<DropletIcon />}
  label="Grasa"
  helper="Tipo de piel"   // optional
  swatch="#D4AF37"        // optional, for color cards
/>
```

Visual:
- Default: `border border-input bg-background`, hover `bg-muted/50`
- Selected: `ring-2 ring-primary bg-primary/5 border-primary`
- Disabled: `opacity-50 cursor-not-allowed`
- Size: `min-h-[96px] p-3`, content vertically centered

### 6.2 KPI card

```tsx
<KpiCard
  label="LTV"
  value="$4,820"
  delta={{ value: 14, direction: "up", period: "mes" }}   // optional
  onClick={() => ...}   // optional, makes the whole card a button
/>
```

Visual: see §4.3.

### 6.3 Timeline event

```tsx
<TimelineEvent
  type="purchase"   // | "recommendation" | "appointment" | "note" | "registration"
  timestamp={iso}
  actor={{ name: "Ana V.", isSelf: false }}
  title="Compra de $1,890"
  body="Génifique Sérum 30ml"
  onClick={() => ...}   // optional
/>
```

Vertical line is rendered by the parent timeline container; the event renders only the dot + content.

### 6.4 Action button row

The Quick Actions bar (§4.4) is a reusable layout, not a unique component. Use a `flex flex-wrap gap-2` container with regular `Button` components.

---

## 7. Component inventory — what to reuse vs build

### Already exist (use as-is)

| Component | Path | Use for |
|---|---|---|
| `Sheet` | `components/ui/sheet.tsx` | Purchase, Recommend, Appointment, Message sheets |
| `Dialog` | `components/ui/dialog.tsx` | Note modal, confirms |
| `Card` | `components/ui/card.tsx` | KPI, purchase row, note row |
| `Badge` | `components/ui/badge.tsx` | Segment badge, status pills |
| `Avatar` | `components/ui/avatar.tsx` | Header, timeline events |
| `Button` | `components/ui/button.tsx` | All buttons |
| `Input` | `components/ui/input.tsx` | Search inputs, free-text |
| `Textarea` | `components/ui/textarea.tsx` | Note body, recommendation notes |
| `Select` | `components/ui/select.tsx` | Filters (avoid for primary choices — use cards) |
| `Checkbox` | `components/ui/checkbox.tsx` | "Vincular producto", "Privada" |
| `Combobox` | `components/ui/combobox.tsx` | Product search inside sheets |
| `DataTable` | `components/ui/data-table.tsx` | **Avoid in profile — use cards** |
| `Pagination` | `components/ui/pagination.tsx` | Activity timeline "Cargar más" |
| `EmptyState` | `components/ui/empty-state.tsx` | All empty states |
| `Form` + RHF helpers | `components/ui/form.tsx` | Form fields inside sheets |

### Build new

| Component | Path | Notes |
|---|---|---|
| `SelectableCard` | `components/ui/selectable-card.tsx` | §6.1. Used by Belleza, Appointment, future |
| `KpiCard` | `components/ui/kpi-card.tsx` | §6.2. Header KPIs |
| `Timeline` + `TimelineEvent` | `components/ui/timeline.tsx` | §6.3. Overview tab |
| `Tabs` (if missing) | `components/ui/tabs.tsx` | Wrap `@base-ui/react/tabs` |
| `Stepper` | `components/ui/stepper.tsx` | [-] [n] [+] for quantity. ~30 lines |
| `ProductTile` | `app/(dashboard)/clientes/[id]/_components/product-tile.tsx` | Grid card for search results (image + name + price + add). Profile-local for now; promote to `components/` if reused |
| `TimeSlotList` | `app/(dashboard)/clientes/[id]/_components/time-slot-list.tsx` | Right column of appointment sheet |
| `AvailabilityCalendar` | `app/(dashboard)/clientes/[id]/_components/availability-calendar.tsx` | Wraps `react-day-picker` with availability dots |

Don't promote components to `components/ui/` until they're used in 2+ places — start local, refactor when needed.

---

## 8. Implementation order — sprint-by-sprint

Work in this order. Don't jump ahead even if tempting — earlier sprints unblock later ones.

### Sprint 0 — Foundations (1-2 days)

Goal: have the new shared components ready before you write any tab.

1. Build `SelectableCard` (§6.1) with single/multi/toggle variants + tests for state behavior
2. Build `KpiCard` (§6.2)
3. Build `Timeline` + `TimelineEvent` (§6.3) with vertical line and dot rendering
4. Add `Tabs` if missing
5. Add `Stepper`
6. Install `react-day-picker` if not present

### Sprint 1 — Profile shell (1 day)

7. Refactor `customer-detail-page.tsx`:
   - Render new `CustomerProfileHeader`
   - Render new `CustomerKpiCards` (use mocked metrics if backend not ready)
   - Render new `CustomerQuickActions` (buttons wired to local state, sheets stubbed)
   - Render `Tabs` with 6 tabs, content stubbed as "Próximamente"
8. URL-sync the active tab via `useSearchParams`

### Sprint 2 — Overview timeline (2 days)

9. Backend: `GET /customers/:id/activity` aggregating events
10. Frontend: `customer-overview-timeline.tsx` using `Timeline`
11. Empty state for new customers (only registration event)

### Sprint 3 — Belleza tab (1 day)

12. Frontend: `customer-beauty-profile.tsx` with `SelectableCard` grids
13. Inline-save mutation with optimistic update + rollback on error
14. Shade list (read-only in v1 — add button stubbed)

### Sprint 4 — Compras tab (2 days)

15. Frontend: `customer-purchases-tab.tsx` (card list + expand)
16. Frontend: `customer-purchase-sheet.tsx` with `ProductTile` grid + `Stepper`
17. Wire `POST /purchases` (endpoint already exists, confirm contract)
18. Optimistic prepend on success

### Sprint 5 — Recomendaciones tab (1 day)

19. Frontend: `customer-recommendations-tab.tsx` (copy 80% from Compras)
20. WhatsApp toggle + post-save communication trigger

### Sprint 6 — Citas tab (3 days, highest-value visually)

21. Backend: `GET /appointments/availability` (days)
22. Backend: `GET /appointments/availability/slots` (slots)
23. Frontend: `AvailabilityCalendar` wrapping `react-day-picker`
24. Frontend: `TimeSlotList`
25. Frontend: `customer-appointment-sheet.tsx` with service cards + calendar + slots
26. Frontend: `customer-appointments-tab.tsx` listing upcoming + past

### Sprint 7 — Notas tab (1 day)

27. Backend: new `customer_notes` table + migration + module
28. Frontend: `customer-notes-tab.tsx` + `customer-note-dialog.tsx`

### Sprint 8 — Message action (1 day)

29. `customer-message-sheet.tsx` — pick template (from `message_templates`), preview, send via `POST /communications`
30. Filter templates by available consent (no WhatsApp option if no consent)

After Sprint 8 the post-registration surface is feature-complete. Polish + microinteractions come next, but aren't blocking.

---

## 9. Naming conventions

This repo uses **kebab-case for filenames**, **PascalCase for components**, **camelCase for everything else**.

### Files

- New files in the profile: `customer-{feature}-{type}.tsx`
  - `customer-overview-timeline.tsx` ✓
  - `customer-beauty-profile.tsx` ✓
  - `customer-purchase-sheet.tsx` ✓
  - `CustomerOverviewTimeline.tsx` ✗
- Reusable UI in `components/ui/`: noun first
  - `selectable-card.tsx` ✓
  - `kpi-card.tsx` ✓
  - `timeline.tsx` ✓

### React components

- Export named PascalCase matching the file
  - `customer-overview-timeline.tsx` exports `CustomerOverviewTimeline`
- Internal sub-components go in the same file unless > 60 lines

### Hooks

- File: `use-{feature}.ts` in `apps/web/lib/hooks/`
- Export name: `use{Feature}` PascalCase after `use`
  - `use-customer-activity.ts` exports `useCustomerActivity`
- Add to `apps/web/lib/hooks/index.ts` barrel

### Schemas

- File: `{feature}.ts` or `{feature}-{step}.ts` in `apps/web/lib/schemas/`
- Export const: `{feature}Schema` and inferred type `{Feature}Values`

### API DTOs

- File: `{feature}.dto.ts` in `apps/api/src/dtos/`
- Class: `{Action}{Feature}Dto` (e.g. `CreatePurchaseDto`)

### Contracts (shared types)

- File: `{feature}.ts` in `packages/contracts/src/types/`
- Type: PascalCase interface, no `I` prefix

### Database

- Table: `snake_case_plural` (`customer_notes`, not `customerNote`)
- Schema file: `kebab-case-singular.ts` (`customer-notes.ts`)
- Drizzle const: `camelCase` (`customerNotes`)

### CSS / Tailwind

- Use design tokens from the existing theme (`text-foreground`, `bg-primary`, `text-muted-foreground`, `border-input`, etc.). **Never** hardcode hex colors.

---

## 10. Acceptance criteria per surface

Each surface is done when **all** of these are true.

### 10.1 Profile header
- [ ] Renders within 200ms of route mount (skeleton shown otherwise)
- [ ] All 4 KPI cards visible above the fold at 1280×800
- [ ] Quick actions row sticky on scroll (iPad) / inline (desktop)
- [ ] Clicking "Próxima cita" KPI switches to the Citas tab and scrolls to that appointment

### 10.2 Overview timeline
- [ ] Loads 20 most recent events on first paint
- [ ] "Cargar más" appends older events without reflow above
- [ ] Each event dot has correct color from §5.1 spec
- [ ] Empty state shown only when there's exactly 1 event (registration)
- [ ] Click on a purchase event expands inline (no navigation)

### 10.3 Belleza tab
- [ ] Selecting a card saves within 500ms (optimistic)
- [ ] Network failure rolls back the selection visually + toast error
- [ ] Multi-select cards allow toggling on and off
- [ ] No "Save" button anywhere in this tab

### 10.4 Compras / Recomendaciones tabs
- [ ] Search debounces at 300ms
- [ ] Empty search shows 12 default products
- [ ] Adding a product to selection adds without re-querying
- [ ] Total recalculates immediately on quantity change
- [ ] Submit disabled when selection is empty
- [ ] On success, sheet closes and new card appears at top of list within 300ms

### 10.5 Citas tab
- [ ] Service selection filters both calendar dots and time slots in <100ms
- [ ] Selecting a date <today is disabled
- [ ] Selecting a service before a date shows all available days
- [ ] Selecting a date before a service shows all slots regardless of duration
- [ ] Time slot list is keyboard-navigable (arrow keys)
- [ ] Submitting creates the appointment and switches view to the new appointment card

### 10.6 Notas tab
- [ ] Char counter updates live
- [ ] Submit disabled when body is empty or > 500 chars
- [ ] New note appears at top of list immediately on save
- [ ] Private notes show a lock icon

### 10.7 Cross-cutting
- [ ] All Sheets respect ESC to close and click-outside to close
- [ ] All mutations show loading state on submit button (disable + spinner)
- [ ] All success states show a toast in the bottom-right
- [ ] All error states show a toast with retry CTA when applicable
- [ ] Page typechecks (`pnpm --filter web typecheck`) and the dashboard route renders without console errors

---

## 11. Anti-patterns to avoid

These will tank the experience. Refuse to ship any of them.

### 11.1 The "edit page" anti-pattern
Don't build separate "view" and "edit" modes. Every visible value that's editable should be inline-editable on hover. Belleza tab tags don't have an "Edit profile" button — they just toggle.

### 11.2 The "Save bar" anti-pattern
No tab in the profile has a "Save changes" bar at the bottom. Every interaction either saves immediately or opens a Sheet that has its own save inside.

### 11.3 The "alert dialog confirm everything" anti-pattern
Don't ask "Are you sure?" for routine actions. Use **undo toasts** instead: "Cita cancelada · [Deshacer]" with 5s timeout.

### 11.4 The "select dropdown for everything" anti-pattern
Whenever you reach for a `<Select>` for a primary choice (service type, skin type, channel), ask: would 3-5 cards work? Almost always yes.

### 11.5 The "modal-in-modal" anti-pattern
A Sheet should never open another Sheet or Dialog. If you need a sub-flow, design it as a step inside the same Sheet.

### 11.6 The "spinner for everything" anti-pattern
Spinners are for indeterminate waits > 1s. For anything faster, use **skeleton screens** matching the final layout's shape.

### 11.7 The "form for a calendar" anti-pattern
The whole reason this spec exists. Never show a date picker dropdown when you can show a calendar. Never show a time `<input>` when you can show slot tiles.

### 11.8 The "scope leak" anti-pattern
The BA only sees customers from their assigned store (RF-52). Don't accidentally show data from another store in any new endpoint. Always pass through `ScopeService.scopeByStore()` in services — see `apps/api/src/modules/customers/customers.service.ts:30` for the pattern.

### 11.9 The "PII in logs" anti-pattern
Don't log customer email, phone, or full name in `console.log` or API responses beyond what the schema returns. LFPDPPP (RNF-04) applies to logs too.

### 11.10 The "BA does the work the system can do" anti-pattern
Examples to avoid:
- Asking the BA to pick the store (use `session.user.storeId`)
- Asking the BA to pick "yourself" as the attribution (use `session.user.id`)
- Asking the BA to type today's date as default (use `new Date()`)
- Asking the BA to choose the active privacy notice version (read it from `/privacy-notices/active`)

---

## 12. Reference — industry sources

These informed the patterns above. Read them only if you need to defend a design decision.

- **Tulip Clienteling — Customer Profile**: tabs, 360 view, inline editing of contact info, notes with attachments
  https://docs.tulip.com/apps/clienteling/customer-profile/
- **Tulip Customer Prism**: card-based preference filtering with color swatches, image facets, text tags
  https://docs.tulip.com/apps/clienteling/customer-prism/
- **Tulip Look Builder**: visual lookbook composer (out of v1 scope, but relevant for recommendations evolution)
  https://docs.tulip.com/apps/clienteling/look-builder/
- **Calendly's new scheduling page**: date + time on same screen, month view, instant availability
  https://calendly.com/blog/new-scheduling-page-ui
- **Cal.com**: open-source reference for premium scheduling UX
  https://cal.com/
- **Calendar UI patterns (Eleken)**: 33 calendar examples + tips on availability visualization
  https://www.eleken.co/blog-posts/calendar-ui
- **Salesfloor Beauty Clienteling**: BA-side workflow patterns, follow-up cadences
  https://salesfloor.net/beauty-clienteling/
- **Endear**: AI-Notetaker concept, custom appointment form fields
  https://endearhq.com/
- **Chips UI design (Setproduct)**: interactive selectable chips/tags patterns
  https://www.setproduct.com/blog/chip-ui-design
- **Badges vs Pills vs Chips vs Tags (Smart Interface Design)**: when to use which
  https://smart-interface-design-patterns.com/articles/badges-chips-tags-pills/

---

## Internal references (read these before coding)

- **Architecture overview**: `docs/01-architecture.md`
- **Domain model**: `docs/02-domain-model.md`
- **Monorepo structure**: `docs/03-monorepo-structure.md`
- **Security & compliance (LFPDPPP)**: `docs/04-security-compliance.md`
- **UX guidelines (general)**: `docs/07-ux-ui-guidelines.md`
- **RFP compliance matrix** (which RF each surface satisfies): `docs/06-rfp-compliance-matrix.md`
- **Existing registration wizard** (do not modify): `apps/web/app/(dashboard)/clientes/_components/customer-registration-wizard.tsx`
- **Existing customer detail page** (the one to refactor): `apps/web/app/(dashboard)/clientes/[id]/_components/customer-detail-page.tsx`
- **Backend services to extend**: `apps/api/src/modules/customers/`, `apps/api/src/modules/appointments/`, `apps/api/src/modules/purchases/`, `apps/api/src/modules/recommendations/`
- **Scope service** (always use for any new endpoint that touches customer data): `apps/api/src/common/services/scope.service.ts`

---

**End of spec.** When in doubt, prefer fewer features executed well over more features rushed. The BA has 90 seconds.
