# Handoff — National Retail Manager (NRM) dashboard

**Para el próximo agente de Claude Code.** Este documento es lo que necesitas para
implementar `(national)` en `apps/web/` sin contexto previo. Léelo completo
antes de tocar archivos.

---

## 0. TL;DR — qué construir

Un nuevo route group `apps/web/app/(national)/` con **10 pantallas iPad-first**
para el rol `national_retail_manager` (NRM). El **backend ya está 100% listo**
con los endpoints, hooks y permisos correspondientes — solo falta la UI. La
filosofía de diseño y los componentes reutilizables ya fueron resueltos
durante la implementación del Area Manager.

Tu trabajo se reduce a:
1. Clonar la shell del `(area-manager)` ajustando el nav.
2. Reusar los componentes en `apps/web/components/manager/`.
3. Crear las pantallas exclusivas del NRM (zones-ranking, brands config,
   templates editor, segments con scope, audit summary).
4. Sembrar datos demo si quieres ver algo en pantalla.

**Esfuerzo estimado:** ~6–8 horas si reusas todo lo que ya existe.

---

## 1. Contexto del rol — lo no obvio

Lee primero `rfp-loreal-clienteling/10-roles-operativos.md` §4. Resumen
operativo para este agente:

| Aspecto | Counter Manager | Area Manager | **National Retail Manager** |
|---|---|---|---|
| Scope técnico | `storeId + brandId` | `zoneId + divisionId` | **`divisionId`** (sin zona ni tienda) |
| Tiendas a su cargo | 1 | 5–15 | **50–200 a nivel nacional** |
| Unidad de comparación | BAs | tiendas | **zonas (y debajo tiendas)** |
| Edita marcas | ✗ | ✗ | **✓** (logo, colores, threshold VIP de su división) |
| Edita templates | ✗ | ✗ | **✓** (por marca dentro de su división) |
| Define segments de división | ✗ | ✗ | **✓** (visibles a toda su división) |
| Ve audit summary | ✗ | ✓ | **✓** |
| Crea zonas | ✗ | ✗ | ✗ (solo admin) |
| Crea usuarios | ✗ | ✗ | ✗ (solicita al admin) |
| Ejecuta ARCO | ✗ | ✗ | ✗ (solo admin) |

**El NRM es el primer rol donde la "unidad" deja de ser geográfica
(tienda/zona) y empieza a ser estratégica (marca/template/segment/audit).**
Esto cambia la mitad de las pantallas: son menos "leaderboards" y más
"configuración + análisis ejecutivo cross-zona".

---

## 2. Estado del backend — qué ya existe

### 2.1 Endpoints específicos para NRM (todos en `apps/api`)

Confirmados con typecheck y migraciones aplicadas — **no necesitas tocar el
backend**:

| Endpoint | Roles permitidos | Notas |
|---|---|---|
| `GET /analytics/zone-overview` | area_manager, NRM, admin | KPIs agregados del scope |
| `GET /analytics/stores-ranking` | area_manager, NRM, admin | Ranking de tiendas con conversión, ticket, etc |
| `GET /analytics/counter-managers-ranking` | area_manager, NRM, admin | Ranking de Counter Managers |
| `GET /analytics/zones-ranking` | **NRM, admin** | Ranking comparativo cross-zona dentro de la división |
| `GET /analytics/stores/:storeId/brands-comparison` | counter_manager+, admin | Lancôme vs YSL vs Kiehl's en la misma tienda |
| `GET /dashboards/zone/today` | area_manager, NRM, admin | Payload single-shot (pulse + ranking + ops) |
| `GET /geo/customer-density` | counter_manager+ | Choropleth o lista; respeta scope |
| `GET /inventory/zone-summary` | area_manager, NRM, admin | Roll-up multi-store + top SKUs afectados |
| `POST /events/multi` | area_manager, NRM, admin | Crea evento en N tiendas con `event_group_id` compartido |
| `GET /audit-logs/summary` | area_manager, NRM, admin | Summary agregado filtrado por scope |
| `GET /brands` | todos | NRM ve toda su división, no solo su brandId |
| `POST /brands`, `PATCH /brands/:id`, `PUT /brands/:id/config` | **NRM, admin** | NRM enforced server-side a su división |
| `GET /messages/templates` | todos | NRM ve templates de TODAS las marcas de su división + globales |
| `POST /messages/templates`, `PATCH /messages/templates/:id` | **NRM, admin** | NRM enforced server-side a su división |
| `GET /segments` | todos | Visibilidad: personal + brand + division + global |
| `POST /segments` con `scope: 'division'` | NRM, admin | Crea segments compartidos en toda la división |
| `GET /audit-logs` | admin | NRM NO entra (solo summary) |

### 2.2 Schema database — campos relevantes

- `users.divisionId` (text) — set por Clerk publicMetadata, FK lógico a `divisions.id` (uuid).
- `brands.divisionId` (uuid) — FK a `divisions`. NRM filtra por aquí.
- `customer_segments.divisionId` (uuid, nullable) — set cuando NRM crea un segment de división. Migración `0006_keen_rhino.sql`.
- `store_events.event_group_id` (uuid, nullable) — multi-store rollout. Migración `0005_short_blazing_skull.sql`.

### 2.3 ScopeService

`apps/api/src/common/services/scope.service.ts` — método relevante:
`getAccessibleStoreIds(user)` para NRM resuelve:

```ts
stores WHERE id IN (
  brand_stores.store_id WHERE brand_stores.brand_id IN (
    brands.id WHERE brands.division_id = user.divisionId
  )
)
```

Para verlo en SQL:
```sql
SELECT DISTINCT s.id, s.display_name, z.code AS zone
FROM stores s
INNER JOIN brand_stores bs ON bs.store_id = s.id
INNER JOIN brands b ON b.id = bs.brand_id
LEFT JOIN zones z ON z.id = s.zone_id
WHERE b.division_id = '<user.divisionId>'
ORDER BY z.code, s.display_name;
```

---

## 3. Estado del frontend — qué ya existe

### 3.1 Hooks React Query (en `apps/web/lib/hooks/`)

Todos los hooks que NRM necesita **ya están listos**:

```ts
// Dashboards & analytics
useZoneDashboardToday()                          // /dashboards/zone/today
useZoneOverview(from?, to?)                      // /analytics/zone-overview
useStoresRanking(from?, to?)                     // /analytics/stores-ranking
useCounterManagersRanking(from?, to?)            // /analytics/counter-managers-ranking
useZonesRanking(from?, to?)                      // /analytics/zones-ranking  ← NRM-only
useBrandsComparison(storeId, from?, to?)         // /analytics/.../brands-comparison

// Visualizations
useCustomerDensity({ geojson: true, simplify })  // /geo/customer-density (returns GeoJSON or list)
useInventoryZoneSummary(limit?)                  // /inventory/zone-summary
useEvents(query)                                 // /events
useCreateMultiStoreEvent()                       // POST /events/multi

// Brands (NRM-editable)
useBrands()
useBrand(id)
useCreateBrand()                                 // accepts divisionId
useUpdateBrand()
useUpdateBrandConfig()

// Templates (NRM-editable)
// Hooks aren't fully exposed yet — see "Gaps" section below

// Segments (with scope)
useSegments()
useCreateSegment()  // accepts scope: 'personal'|'brand'|'division'|'global'
useUpdateSegment()
useDeleteSegment()
usePreviewSegment()

// Audit
useAuditLogsSummary({ from, to, limit })         // /audit-logs/summary  ← visible to NRM
```

### 3.2 Componentes manager reutilizables (en `apps/web/components/manager/`)

**Todos diseñados pensando en NRM también** — solo reusa:

| Componente | Qué hace | Dónde usarlo en NRM |
|---|---|---|
| `KpiSparklineCard` | KPI card con sparkline + delta chip | Pantalla `/today` |
| `RankingTable<T>` | Tabla densa sortable con bar-in-cell | `/zones`, `/stores`, `/team` |
| `BarInCell` | Bar-in-cell con tone semantic | Dentro de RankingTable columns |
| `SparklineCell` | Sparkline compacta para cells | Columnas opcionales en rankings |
| `SpotlightTop3` | 3 cards top-performer con podio | `/team`, `/zones` |
| `CustomerDensityMap` | Mapbox choropleth + pins | `/heatmap` (nacional) |
| `InventoryMatrix` | Matrix stores × SKUs full-bleed | `/inventory` |
| `MultiStoreSwimlane` | Swimlane horizontal de eventos | `/events` (swimlane view) |
| `format.ts` | `formatCompactMoney`, `formatCompactNumber`, `formatDelta` | En todos lados |

### 3.3 Shell pattern del Area Manager (en `apps/web/app/(area-manager)/`)

**Esta es la base que vas a clonar.** Estructura:

```
(area-manager)/
├── _lib/role-guard.ts              ← bouncer: solo area_manager + admin
├── _components/
│   ├── area-manager-shell.tsx      ← decide cuando colapsar sidebar a rail
│   ├── area-manager-nav.tsx        ← nav con tooltips collapsed / labels expanded
│   └── area-manager-sidebar.tsx    ← 72pt portrait / 240pt landscape, forceRail prop
├── layout.tsx                      ← session + role guard server-side
└── area-manager/
    ├── page.tsx                    ← redirect → /area-manager/today
    └── <feature>/
        ├── page.tsx                ← thin wrapper, exporta metadata
        └── _components/
            └── <feature>-page.tsx  ← componente client con la lógica
```

**Patrones que ya están resueltos** (no los reinventes):
- Server-side role guard en `layout.tsx` con `getSession()` + `redirect()`.
- Sidebar con `hidden md:flex w-[72px] lg:w-[240px]`.
- `forceRail` para colapsar en pantallas Tier-3 full-bleed.
- Headers con `font-[family-name:var(--font-heading)] text-3xl tracking-tight`.
- `SingleColumn` + `SectionCard` para Tier 1/2; canvas full-bleed para Tier 3.
- Skeletons con `animate-pulse rounded bg-muted`.
- Empty states con `AdvisorEmptyState`.

---

## 4. Pantallas a construir para NRM (10 totales)

Cada pantalla está clasificada por **tier de densidad** según la regla:

- **Tier 1** = overview glanceable (10s) → cards/lists
- **Tier 2** = review/compare (1–3 min) → tablas con sparklines, swimlanes
- **Tier 3** = análisis profundo (5+ min) → mapas full-bleed, matrices

**Regla de cohesión:** la shell se ve igual en todas las pantallas; solo
cambia el canvas central. Tier 3 es la única excepción (full-bleed).

### Mapa de pantallas

```
(national)/
├── _lib/role-guard.ts                                  ← solo national_retail_manager + admin
├── _components/
│   ├── national-shell.tsx
│   ├── national-nav.tsx
│   └── national-sidebar.tsx
├── layout.tsx
└── national/
    ├── page.tsx                                        ← redirect → /national/today
    │
    ├── today/                                          ← T1
    ├── zones/                                          ← T2 — exclusivo NRM
    ├── stores/                                         ← T2 — reuso
    ├── team/                                           ← T2 — reuso (BAs + CMs cross-zona)
    ├── heatmap/                                        ← T3 — nacional, no zonal
    ├── inventory/                                      ← T3 — nacional
    ├── events/                                         ← T2/T3 — reuso
    ├── brands/                                         ← T2 — exclusivo NRM (config marcas)
    ├── templates/                                      ← T2 — exclusivo NRM
    ├── segments/                                       ← T2 — exclusivo NRM (scope: 'division')
    └── audit/                                          ← T2 — exclusivo NRM (summary)
```

### 4.1 `/national/today` — Tier 1

**Reuso directo de `area-today-page.tsx`** copiándolo y cambiando:
- Header: `"Vista nacional"` + número de tiendas/zonas en su división.
- Sub-líneas de KPI cards muestran "vs ayer", "vs sem". El payload de
  `useZoneDashboardToday()` ya viene scopeado a su división porque el
  backend resuelve `getAccessibleStoreIds` por `divisionId`.
- Añade un panel "Zonas críticas hoy" que reusa el patrón de
  `StoresPodium` pero con `useZonesRanking()` (5 mejores / 5 peores zonas).

### 4.2 `/national/zones` — Tier 2 — **NUEVA**

Ranking cross-zona dentro de la división. Usa `useZonesRanking()`.

Columnas de `RankingTable<ZoneRankingAggRow>`:
- Zona (nombre + storeCount)
- Ventas (con bar-in-cell)
- Ticket promedio
- Conversión recos
- Nuevas clientas

**Hover/tap en una fila → drill-down a una vista filtrada de tiendas de esa
zona** (puedes usar query string `?zoneId=` y filtrar `useStoresRanking()`
client-side por `r.zoneId === selectedZone`).

### 4.3 `/national/stores` — Tier 2

Clona `stores-ranking-page.tsx` casi 1:1. Diferencia: el NRM ve **muchas
más tiendas** (50–200), así que:
- Añade **filtro por zona** (chip selector arriba) antes de la tabla.
- Considera virtualización si tienes >100 filas (opcional — `RankingTable`
  no la trae built-in; si lo necesitas, instala `@tanstack/react-virtual`).
- El `stickyFirstColumn` ya está; úsalo.

### 4.4 `/national/team` — Tier 2

Toggle entre Counter Managers / BAs igual que el AM. Diferencia:
- Counter Managers: usar `useCounterManagersRanking()`.
- BAs: usar `useBaPerformance()` — devuelve TODOS los BAs del scope.
- Añade filtro por zona y/o por marca (chip selectors).

### 4.5 `/national/heatmap` — Tier 3

Clona `heatmap-page.tsx`. Diferencias:
- Mapa centrado en **México completo**, no CDMX. Ajusta `initialCenter` a
  `[-102, 23.5]` y `initialZoom` a `4.5` (ya está como fallback en el
  componente `ZonesMap` del dashboard si quieres referencia).
- El floating overview top-left muestra "Total nacional" + top-5 zonas o
  estados (no municipios — son demasiados).
- Considera **toggle entre vista por municipio y por zona** (haz un
  agregado client-side: sumar customer counts de cada municipality en cada
  zona via `zone_municipalities`). Si es muy complejo, déjalo para v2.

### 4.6 `/national/inventory` — Tier 3

Clona `inventory-matrix-page.tsx`. Si hay >20 tiendas, las columnas serán
ilegibles. Opciones:
- **Filtrar por zona** (chip arriba) — la matriz solo muestra tiendas de
  la zona seleccionada.
- **Agregar por zona en vez de tienda** como vista alterna: filas = SKUs,
  columnas = zonas, celdas = % de tiendas con stock bajo en esa zona.

### 4.7 `/national/events` — Tier 2/T3

Clona `area-events-page.tsx` con lista + swimlane. Sin cambios mayores —
el endpoint `useEvents()` ya respeta scope. El sheet de "Programar en
varias tiendas" funciona igual; el NRM podrá seleccionar de cualquier
tienda de su división.

### 4.8 `/national/brands` — Tier 2 — **NUEVA**

Lista + edición de marcas de su división. **Esta es exclusiva del NRM.**

UI sugerida:
- **Lista a la izquierda** (300pt) con cards de cada brand: logo, código,
  tier, vipThresholdAmount, status.
- **Detail panel a la derecha** con formulario editable:
  - Logo URL
  - Primary / accent color (color picker — ya existe `color-picker.tsx`)
  - VIP threshold (amount + period in months)
  - Replenishment rules (JSON editor opcional, dejar vacío)
- Mutaciones: `useUpdateBrand()` + `useUpdateBrandConfig()`. El backend
  enforce que solo se editen marcas de la división del caller, así que no
  hay riesgo de escape de scope.
- Tab "Crear marca" con `useCreateBrand()` — `divisionId` se omite en el
  payload, el backend lo fuerza al del caller.

**Patrón visual:** two-column `ThreeColumnLayout` (ya está disponible).

### 4.9 `/national/templates` — Tier 2 — **NUEVA**

Manager de message templates por marca. Similar a `/brands`:
- Filtro por marca (chip selector).
- Lista de templates: nombre, canal (whatsapp/sms/email), campaign type,
  estado activo.
- Detail editor: nombre, body, canal, campaignType, isActive.
- "+ Nuevo template" → modal/sheet con form.
- Mutaciones: usar `apiFetch` directo o crear los hooks `useCreateTemplate` /
  `useUpdateTemplate` si no existen (ver Gaps §6.1).

Endpoints: `POST /messages/templates`, `PATCH /messages/templates/:id`.

### 4.10 `/national/segments` — Tier 2 — **NUEVA**

Manager de customer segments con scope multi-nivel.

UI:
- Lista de segments con badge de scope (personal / brand / division /
  global).
- "+ Nuevo segment" → sheet con:
  - Nombre + descripción
  - Filter builder (lifecycle stages, loyalty tiers, days since last order,
    total spent, birthday this month — ya está en `segmentFilterSchema`)
  - **Scope selector** con 3 opciones para NRM: `personal` (default),
    `brand` (selecciona una marca de su división), `division` (compartido
    a toda su división). `global` solo si es admin.
  - Preview con `usePreviewSegment()` que muestra los primeros 20 clientes
    que match.
- Mutaciones: `useCreateSegment()` con `scope`, `brandId?`, `divisionId?`.

### 4.11 `/national/audit` — Tier 2 — **NUEVA**

Summary del audit log filtrado por su scope. Usa `useAuditLogsSummary()`.

Layout:
- KPI cards arriba: total events, días con más actividad, etc.
- 3 paneles:
  - **By action** (cuál acción más frecuente — bar chart horizontal)
  - **By entity type** (qué se toca más — bar chart)
  - **Top actors** (quiénes más interactúan — lista con avatares)
- Range selector (7 días / 30 días / 90 días).
- **NO mostrar fila por fila** — eso es exclusivo de admin. El summary es
  agregado por diseño.

---

## 5. Datos demo

### 5.1 Estado actual

El seed `packages/database/seed/area-manager-demo.sql` ya pobló la **zona
CDMX-CENTRO** (división Luxe) con datos realistas. Como NRM ve TODA la
división Luxe, **ya tienes data visible inmediatamente** si entras como
NRM.

**Problema:** la división Luxe solo tiene 2 marcas (Lancôme + YSL) y casi
toda la actividad concentrada en una zona. Para demo del NRM querrás:
1. Crear usuarios CMs y BAs en OTRAS zonas (Norte, Bajío, Sureste...) para
   que `useZonesRanking()` tenga >1 zona con datos.
2. Generar orders/customers/recos/samples distribuidos cross-zona.
3. Opcional: agregar marcas Luxe adicionales (Kiehl's, Armani, Valentino)
   para que `/national/brands` no se vea vacío.

### 5.2 NRM user

Existe `d.puebla@loreal.mx` pero es `area_manager`. **Necesitas crear o
promover un usuario a `national_retail_manager`** con scope `divisionId` =
`c74d7620-94e0-421f-9bf8-2e4d1221805e` (Luxe).

Para crear vía Clerk API (usa el patrón de `/tmp/seed-users.py` que está
ahora borrado pero tienes el ejemplo en el commit `aa1dc6b` del seed):

```python
# Password demo: Loreal2026!Demo
# CLERK_SECRET_KEY en apps/api/.env
# Header obligatorio: User-Agent (sino Cloudflare 1010)

payload = {
  "email_address": ["d.nacional@loreal.mx"],
  "password": "Loreal2026!Demo",
  "first_name": "Diana",
  "last_name": "Nacional",
  "public_metadata": {
    "role": "national_retail_manager",
    "active": True,
    "fullName": "Diana Nacional",
    "divisionId": "c74d7620-94e0-421f-9bf8-2e4d1221805e",  # Luxe
    "invitationStatus": "accepted"
  }
}
```

NO le pongas `storeId`, `zoneId` ni `brandId` — el NRM no los tiene por
diseño.

### 5.3 Script de seed sugerido para NRM

Crea `packages/database/seed/national-demo.sql` (idempotente, tag con
`ND-` o `@demo-nrm.mx`) que:
- Cree 4 Counter Managers + 12 BAs distribuidos en zonas Norte, Bajío,
  Sureste (3 zonas con 1 tienda cada una mínimo).
- Genere customers + orders + recos + samples en esas zonas con cantidades
  similares al AM seed.
- Opcional: 2-3 marcas Luxe adicionales si el modelo lo permite.

Patrón base: copia `area-manager-demo.sql` y cambia los IDs de zona/store/
brand. Casts importantes que ya descubrí (lo digo para que no te tropieces):
- `users.store_id` es **text**, `customers.signup_store_id` es **uuid** —
  necesitas `::uuid` o `::text` al hacer joins.
- `psql :'var'` interpola como text — castea a `::uuid` cuando uses como
  filtro contra columnas uuid.
- `WHERE ... CROSS JOIN LATERAL` no es válido — usa `FROM x CROSS JOIN
  LATERAL ... WHERE`.

---

## 6. Gaps conocidos

### 6.1 Hooks de templates incompletos

`apps/web/lib/hooks/use-templates.ts` puede no tener mutations expuestos
para create/update. Verifica antes de empezar `/national/templates`. Si
faltan, copia el patrón de `useCreateBrand`/`useUpdateBrand` en
`use-brands.ts`.

### 6.2 Comparativo multi-marca (4.5 del audit del backend)

El endpoint `GET /analytics/stores/:storeId/brands-comparison` existe pero
no se está usando en el AM. El NRM lo necesitará si quieres una pantalla
"comparar Lancôme vs YSL en Liverpool Polanco". No es prioritario para v1.

### 6.3 Agregación geográfica por zona

El endpoint `/geo/customer-density` agrega por municipio. Para una vista
nacional sería mejor agregar por zona o estado. Tienes dos opciones:
- Hacerlo client-side: sumar customer counts por `zone_municipalities`.
- Agregar un nuevo endpoint backend `/geo/customer-density-by-zone`.

### 6.4 Filtro por zona en componentes existentes

`RankingTable` no tiene filter chips integrados. Si en `/national/stores` o
`/national/team` necesitas filtrar por zona, lo manejas client-side antes
de pasar `rows` al componente. Considera extraer un `<ZoneFilterChips>`
reutilizable.

---

## 7. Cómo empezar — checklist práctica

1. **Lee** este documento + `rfp-loreal-clienteling/10-roles-operativos.md`
   §4.
2. **Lee** los archivos del Area Manager:
   - `apps/web/app/(area-manager)/layout.tsx`
   - `apps/web/app/(area-manager)/_components/area-manager-*.tsx`
   - `apps/web/app/(area-manager)/area-manager/today/_components/area-today-page.tsx`
3. **Lee** los componentes manager:
   - `apps/web/components/manager/*.tsx`
4. **Crea** `(national)/layout.tsx` + role-guard + shell + nav clonados del
   AM. Verifica con typecheck (`pnpm typecheck`).
5. **Crea NRM user** en Clerk con divisionId=Luxe.
6. **Crea** `/national/today` reusando `area-today-page.tsx` y validando
   visualmente que cargue. Esto valida que la shell funciona.
7. **Crea** las pantallas en este orden (las primeras son las que reutilizan
   más, las últimas las exclusivas):
   - `/national/stores` (clon de AM)
   - `/national/team` (clon de AM)
   - `/national/heatmap` (clon de AM)
   - `/national/inventory` (clon de AM)
   - `/national/events` (clon de AM)
   - `/national/zones` ← **nueva**
   - `/national/brands` ← **nueva**
   - `/national/templates` ← **nueva**
   - `/national/segments` ← **nueva**
   - `/national/audit` ← **nueva**
8. **Seed demo data** para zonas adicionales.
9. **Commit progresivamente** — un commit por fase (shell, T1+T2 reusos,
   T3 reusos, pantallas nuevas). Mira los commits `03d5e4f` y `371e949`
   como referencia de mensaje.

---

## 8. Checks de calidad antes de hacer commit

- [ ] `pnpm typecheck` desde raíz: 10/10 successful.
- [ ] Cargas `/national/today` como el user NRM: ves KPI cards con números
      reales (no ceros), sin errores en consola.
- [ ] Cargas `/national/zones`: ves al menos 2 zonas en el ranking.
- [ ] Cargas `/national/heatmap`: el mapa de México renderiza con
      municipios coloreados.
- [ ] Cargas `/national/brands`: puedes editar el logo de Lancôme y se
      guarda (verifica con `SELECT logo_url FROM brand_configs`).
- [ ] Cargas `/national/segments`: puedes crear un segment con
      `scope='division'` y aparece en la lista con el badge correcto.
- [ ] Cargas `/national/audit`: el summary muestra al menos 1 evento
      reciente.
- [ ] Cargas `/national/inventory` y `/national/heatmap` en iPad
      landscape (1366x1024) y portrait (1024x1366): no hay overflow ni
      cortes.
- [ ] Como `area_manager` (`d.puebla`) intentas entrar a `/national/*`:
      te redirige a `/advisor/today`.

---

## 9. Convenciones del codebase (resumen rápido)

- **Tokens semánticos**: `--color-success` (verde), `--color-warning`
  (ámbar), `--color-destructive` (rojo). Úsalos consistente cross-pantalla.
- **Tokens BA**: `--ba-surface`, `--ba-sidebar`, `--ba-accent`,
  `--ba-accent-soft`. Heredados del shell.
- **Tabular nums**: `tabular-nums` para todos los números en tablas y
  KPIs.
- **Heading font**: `font-[family-name:var(--font-heading)]`.
- **Touch targets**: mínimo 44pt iOS HIG. Filas de lista ≥56pt, botones
  ≥40pt h.
- **Skeletons**: `animate-pulse rounded bg-muted`.
- **Empty states**: usa `<AdvisorEmptyState>` con `icon`, `title`,
  `description`.
- **NO crear archivos `.md`** salvo que se pidan explícitamente. Este
  handoff es excepción.
- **NO usar emojis** en código ni UI salvo que se pidan.

---

## 10. Comandos útiles

```bash
# Typecheck monorepo
pnpm typecheck

# Dev server (web en :3000, API en :3001)
pnpm dev

# Aplicar seed
docker cp packages/database/seed/<file>.sql loreal-postgres:/tmp/seed.sql
docker exec loreal-postgres psql -U loreal -d loreal_clienteling -f /tmp/seed.sql

# Inspeccionar DB
docker exec loreal-postgres psql -U loreal -d loreal_clienteling -c "<sql>"

# Ver migraciones aplicadas
docker exec loreal-postgres psql -U loreal -d loreal_clienteling -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 5;"
```

---

## 11. Si algo se rompe

- **404 en /national/***: revisa que la carpeta sea `app/(national)/`
  (con paréntesis para route group) y que el role-guard permita
  `national_retail_manager`.
- **403 en algún endpoint**: revisa `@Roles([...])` en el controller del
  API. Probablemente `national_retail_manager` no está incluido y debes
  agregarlo (commit `aa1dc6b` ya hizo este trabajo para la mayoría).
- **`undefined` en publicMetadata.divisionId**: el NRM user no fue creado
  correctamente. Verifica `curl https://api.clerk.com/v1/users/<id>`.
- **El mapa no carga**: revisa `NEXT_PUBLIC_MAPBOX_TOKEN` en
  `apps/web/.env.local`.

---

**Última actualización**: 2026-05-26 (commit `03d5e4f`).
**Autor del handoff**: agente que implementó (area-manager) + backend de NRM.
**Total estimado del trabajo restante**: ~6–8 h con reuso máximo.
