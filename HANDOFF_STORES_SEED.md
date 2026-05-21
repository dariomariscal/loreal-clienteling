# Handoff: cargando sucursales de Liverpool al sistema

Este documento existe para que el siguiente agente continúe sin pedir contexto. El usuario está pasando datos de sucursales (raw text de Liverpool MX), uno o varios bloques a la vez, y el agente los añade a un seed TypeScript que las inserta en la DB de producción (Neon) con geocoding automático.

No es un documento permanente del repo — bórralo cuando se haya cargado el universo completo de sucursales.

## Estado al momento del handoff

- **49 sucursales** ya sembradas en producción, en 10 estados: Aguascalientes, Baja California, Baja California Sur, Campeche, Coahuila, Colima, Chiapas, Chihuahua, CDMX, Estado de México.
- **Municipios INEGI sembrados**: estados 01, 02, 03, 04, 05, 06, 07, 08, 09, 15.
- El seed vive en `packages/database/seed/stores/` (modular). Los datos están en `packages/database/seed/stores/data/<estado>.ts` — un archivo por estado.
- Cambios locales sin commit/push: la modularización del seed + las últimas sucursales agregadas. Hay 2 commits locales (backend + web frontend) que ya están en `origin/main`.
- Deploy a Fly de la API ya se hizo desde el lado del usuario. Schema (`phone`, `hours`) y migraciones aplicadas en Neon producción.

## Estructura del módulo seed

```
packages/database/seed/stores/
├── index.ts        # CLI runner (entry point — orquestación)
├── types.ts        # SeedStore interface
├── geocoder.ts     # cliente Nominatim (función pura, sin DB)
├── repository.ts   # upsertStore, resolveMunicipalityId, resolveZoneId, replaceBrandStores
└── data/
    ├── index.ts    # concatena todos los SEED_STORES_<EST> en un solo array exportado
    ├── ags.ts      # SEED_STORES_AGS
    ├── bc.ts       # SEED_STORES_BC
    ├── bcs.ts
    ├── cam.ts
    ├── cdmx.ts
    ├── chih.ts
    ├── chis.ts
    ├── coa.ts
    ├── col.ts
    └── mex.ts
```

Cuando agregues sucursales solo tocas `data/<estado>.ts`. Si el estado es nuevo, creas el archivo siguiendo el patrón `SEED_STORES_<ABREV>` y lo añades al spread en `data/index.ts`. Nunca edites `index.ts`, `geocoder.ts`, `repository.ts` o `types.ts` para añadir sucursales — solo `data/`.

## Cómo funciona el flujo

El usuario te pasa texto plano de una o varias sucursales. Formato típico (raw):

```
Liverpool <Nombre>

Dirección:
<calle, colonia, CP, ciudad, estado>
Tel: <teléfono>
Horario de tienda: <horario>
Horario de atención C&C: <horario, opcional>
```

Tu trabajo por cada sucursal:

1. **Generar el `code`** en formato `LIV-<EST>-<NOMBRE>`:
   - `<EST>` = abreviación del estado (AGS, BC, BCS, CAM, COA, COL, CHIS, CHIH, CDMX, MEX, etc.).
   - `<NOMBRE>` = nombre identificable mayúscula+guiones, ej. `ALTARIA`, `SALTILLO-GALERIAS`, `TIJUANA-PENINSULA`.
2. **Agregar entrada al archivo del estado correspondiente** en `packages/database/seed/stores/data/<estado>.ts` (ej. `data/cdmx.ts` para CDMX). Push al final del array `SEED_STORES_<EST>` siguiendo este shape:

   ```ts
   {
     code: "LIV-XXX-NOMBRE",
     displayName: "Liverpool <Nombre>",
     chain: "liverpool",
     address: "<calle, colonia, CP, ciudad, ESTADO_ABREV>",  // limpia, sin notas
     geocodeQuery: "<query corta para Nominatim>",            // ver sección "Geocoding tips"
     city: "<Ciudad>",
     state: "<Estado completo>",
     district: "<Colonia>",
     postcode: "<CP>",
     phone: "<10 dígitos, sin espacios ni paréntesis>",
     hours: {
       store: { "mon-sun": "11:00-21:00" },
       clickCollect: { "mon-sun": "..." }, // solo si difiere
       access: "Entrada por ...",          // solo si viene
     },
     brandCodes: ["LANCOME", "YSL"],       // SIEMPRE estos dos por ahora
   }
   ```

3. **Si el estado es nuevo**, crea `data/<estado>.ts` con el array `SEED_STORES_<EST>` exportado y añádelo al spread en `data/index.ts`.
4. **Sembrar municipios** del estado si es nuevo (ver sección "Comandos").
5. **Correr `seed:stores`** y verificar.
6. **Iterar geocoding** si Nominatim falla (ver troubleshooting).
7. **No hacer commit** todavía — al final el usuario pedirá un commit batch.

## Geocoding tips (CRÍTICO)

El seed usa OpenStreetMap Nominatim — gratis, sin API key, ~1 req/s rate limit. Es lo único que falla con frecuencia.

**Regla**: Nominatim odia direcciones largas con número de local. Si pones la dirección completa como `geocodeQuery`, suele devolver 0 resultados. Usa queries cortas que matchean POIs (centros comerciales o tiendas Liverpool).

**Patrones que funcionan** (probados en este proyecto):

- `"Liverpool <Ciudad>"` — Nominatim suele tener POI directo de las tiendas Liverpool. Casi siempre funciona si la sucursal es la única del municipio. Ej: `"Liverpool Mexicali"`, `"Liverpool Champoton, Campeche"`.
- `"<Nombre del Mall>, <Ciudad>"` — para sucursales en centros comerciales con nombre conocido. Ej: `"Centro Comercial Altaria, Aguascalientes"`, `"Galerias Saltillo, Saltillo, Coahuila"`.
- Si la sucursal es la única en su ciudad, simplemente `"Liverpool <Ciudad>, <Estado>"`.

**Patrones que NO funcionan**:

- Dirección postal completa con número de local: `"Calle X 123, Local A-9, Col Y, CP, Ciudad, Estado"` — error recurrente.
- Nombres de plazas pequeñas que no están en OSM (ej. "Plaza Punto Tec" → 0 resultados, pero "Liverpool Piedras Negras" sí).

**Cuando falle**, valida primero con curl:

```bash
curl -s -A "loreal-validation" "https://nominatim.openstreetmap.org/search?format=json&limit=3&countrycodes=mx&q=<URL_ENCODED_QUERY>" \
  | python3 -c "import json,sys; data=json.load(sys.stdin); [print(f\"{r.get('display_name','')[:140]}\n  lat={r['lat']}, lon={r['lon']}\n\") for r in data] if data else print('no results')"
```

Itera hasta encontrar una query que devuelva el POI correcto (revisa que `display_name` mencione la ciudad correcta), después actualiza `geocodeQuery` en el seed y reintentas.

**Última instancia**: el usuario te puede pasar `lat`/`lng` exactos de Google Maps. En ese caso pon esos campos en la entrada y omite `geocodeQuery` — el seed se salta Nominatim cuando ambos están presentes.

## Comandos

La URL de Neon producción está comentada en `apps/api/.env`. La extraes así:

```bash
grep -E "^# NEON_DATABASE_URL=" /Users/dariomariscal/Desktop/loreal-clienteling/apps/api/.env \
  | sed 's/^# NEON_DATABASE_URL=//' > /tmp/neon_url
```

Trabaja siempre desde `packages/database` (el script `seed:stores` está ahí). Para seedear municipios de estados nuevos:

```bash
DATABASE_URL="$(cat /tmp/neon_url)" STATES=<codigo1>,<codigo2> pnpm seed:municipalities
```

Códigos INEGI de estados (2 dígitos): 01 Aguascalientes, 02 Baja California, 03 BCS, 04 Campeche, 05 Coahuila, 06 Colima, 07 Chiapas, 08 Chihuahua, 09 CDMX, 10 Durango, 11 Guanajuato, 12 Guerrero, 13 Hidalgo, 14 Jalisco, 15 México, 16 Michoacán, 17 Morelos, 18 Nayarit, 19 Nuevo León, 20 Oaxaca, 21 Puebla, 22 Querétaro, 23 Quintana Roo, 24 SLP, 25 Sinaloa, 26 Sonora, 27 Tabasco, 28 Tamaulipas, 29 Tlaxcala, 30 Veracruz, 31 Yucatán, 32 Zacatecas.

Para sembrar sucursales:

```bash
DATABASE_URL="$(cat /tmp/neon_url)" pnpm seed:stores
```

El seed es idempotente (UPSERT por `code`), así que correrlo varias veces es seguro. Cada corrida muestra `inserted=X, updated=Y, geocoded=Z`. `geocoded=total entries` siempre — no cachea entre runs, pero no importa.

Limpia el archivo temporal al final: `rm /tmp/neon_url`.

## Verificación

Después de cada batch exitoso, confirma con el usuario:

- Cuántas insertadas vs actualizadas.
- El `municipalityId` resuelto de cada nueva (debe matchear el estado/municipio esperado).
- Si una sucursal cae en un municipio raro, valida con curl reverso a Nominatim usando lat/lng.

Para listar todas las stores actuales en Neon, escribe un script ad-hoc tipo:

```ts
// /tmp/check.ts
import { Pool } from "pg";
import fs from "node:fs";
function toDirect(raw: string): string {
  let url = raw.replace("-pooler", "");
  const p = new URL(url);
  p.searchParams.delete("channel_binding");
  if (!p.searchParams.get("sslmode")) p.searchParams.set("sslmode", "require");
  return p.toString();
}
async function main() {
  const pool = new Pool({ connectionString: toDirect(fs.readFileSync("/tmp/neon_url","utf8").trim()), max: 1 });
  const { rows } = await pool.query(`SELECT code, state, municipality_id FROM stores ORDER BY code`);
  console.table(rows);
  await pool.end();
}
main();
```

Y corre con `pnpm tsx /tmp/check.ts | grep -v "SECURITY WARNING\|sslmode\|libpq\|trace-warnings\|next major\|To prepare"`.

## Detalles del modelo

- `stores.code` es UNIQUE — sirve como llave natural para upserts.
- `stores.municipality_id` es `varchar(5)` (código INEGI de 5 dígitos = 2 estado + 3 municipio). El seed lo resuelve con `ST_Contains(boundary, ST_MakePoint(lng, lat))` contra `municipalities`.
- `stores.zone_id` queda en `NULL` por ahora — no hay zonas creadas en producción. Cuando el usuario cree zonas desde la UI, el campo se llena automáticamente.
- `stores.hours` es `jsonb` con shape `{ store?: Record<string,string>; clickCollect?: Record<string,string>; access?: string }`. Las llaves son rangos de días: `"mon-sun"` por defecto, o split como `"mon-fri"`/`"sat-sun"`.
- `stores.phone` es texto sin formato — guarda 10 dígitos sin espacios/paréntesis (ej. `"4491393400"`, no `"449 139 3400"` ni `"(449) 139-3400"`).
- `brand_stores` es M:N entre brands y stores. El seed resuelve `brandCodes: ["LANCOME", "YSL"]` contra `brands.code` y reemplaza las filas para esa store en cada corrida.

## Convenciones de naming de codes

Mantén consistencia con los 16 ya existentes:

- Prefijo `LIV-` siempre.
- Abreviación de estado:
  - Ya en uso: AGS Aguascalientes, BC Baja California, BCS BCS, CAM Campeche, COA Coahuila, COL Colima, CHIS Chiapas, CHIH Chihuahua, CDMX Ciudad de México, MEX Estado de México.
  - Siguientes esperadas: DGO, GTO, GRO, HGO, JAL, MICH, MOR, NAY, NL, OAX, PUE, QRO, QROO, SLP, SIN, SON, TAB, TAM, TLA, VER, YUC, ZAC. Usa criterio.
- Si hay varias sucursales en la misma ciudad, agrega sufijo de centro comercial: `LIV-BC-TIJUANA-PENINSULA`, `LIV-COA-SALTILLO-GALERIAS`.
- Sufijo especial para Express/Duty Free si es relevante para distinguir: `LIV-BC-ENSENADA` (Express implícito porque es la única).

## Qué NO hacer

- **No** crear migraciones nuevas — el schema ya tiene `phone` + `hours`.
- **No** correr `pnpm seed` (sin sufijo) — ese es el bootstrap que hace `TRUNCATE ... CASCADE` de tablas dominio. Destructivo.
- **No** modificar `users`, `brands`, `brand_configs`, `products`, `product_availability` desde aquí — son tablas con datos reales del usuario.
- **No** hacer commits hasta que el usuario lo pida explícitamente — al final habrá un commit batch con todas las sucursales nuevas.
- **No** hacer push — el usuario lo hace cuando esté listo.
- **No** asumir el `brandCodes` — siempre confirma o usa el default `["LANCOME", "YSL"]` hasta que cambie.

## Si Nominatim devuelve coordenadas obviamente mal

Pasa cuando un nombre genérico matchea otro lugar. Síntomas:

- El `municipalityId` no corresponde al estado de la sucursal.
- Las coordenadas están en otro país o muy lejos.

Solución:

1. Confirma con `curl` reverso a Nominatim (ver "Geocoding tips") qué hay en ese lat/lng.
2. Cambia el `geocodeQuery` por algo más específico (agrega estado, agrega "Centro Comercial", etc.).
3. Si nada funciona, pide al usuario las coords exactas de Google Maps y pásalas como `lat`/`lng` literales — el seed se salta Nominatim.

## Contexto de fondo (no necesario, pero útil)

El usuario decidió poblar sucursales por seed en vez de UI porque el formulario web no maneja bien la carga masiva. Los campos `phone` y `hours` (jsonb con `StoreHours`) se agregaron al schema específicamente para este uso. El frontend (`apps/web`) ya soporta los nuevos campos en lectura y edición pero no es necesario para esta tarea.

El sistema completo es un CRM de clienteling para BAs de L'Oréal en tiendas departamentales. Las stores funcionan como unidad de aislamiento: BAs/managers ven solo su tienda, supervisores ven su zona (conjunto de municipios), admin ve todo. Por eso `municipality_id` y `zone_id` son críticos.
