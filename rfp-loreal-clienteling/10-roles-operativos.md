# 10 — Roles Operativos del Sistema

Definición detallada de cada rol que **opera la plataforma de clienteling día a día**. Estos son los roles con acceso operativo (no consumidores de reportes ejecutivos). Cada rol describe: qué hace, qué ve, qué puede modificar, sobre qué datos tiene scope.

Los nombres siguen la nomenclatura oficial de L'Oréal Luxe verificada en publicaciones de empleo y descripciones de puesto del grupo.

## Jerarquía

```
admin                                ← IT / Country level
  └── national_retail_manager        ← Por división (Luxe, Consumer, etc.)
        └── area_manager             ← Por zona geográfica + división
              └── counter_manager    ← Por tienda + marca
                    └── beauty_advisor ← Mostrador específico
```

---

## 1. Beauty Advisor (BA)

**Nombre oficial:** Beauty Advisor
**En español MX:** Consejera de Belleza / Asesora de Belleza
**Rol en código:** `beauty_advisor`

### Qué hace

Es la **persona que atiende a la clienta en el mostrador**. Es el usuario más frecuente del sistema y el destinatario principal del diseño UX. El RFP la describe como "el corazón de la experiencia".

**Actividades diarias:**
- Recibe a la clienta en el mostrador (rotación alta, sesiones cortas de 5-15 min)
- Identifica si la clienta ya está registrada (búsqueda por nombre/teléfono/email)
- Registra clientas nuevas con el wizard (PII + aviso de privacidad + consentimientos de marketing)
- Consulta el perfil completo: historial de compras, recomendaciones previas, tonos de base, preocupaciones de piel, rutina actual
- Recomienda productos (manual o apoyada por IA)
- Registra muestras gratis entregadas
- Captura fotos before/after, swatches de tono, escaneos de piel
- Toma notas privadas o compartidas sobre la consulta
- Agenda citas (faciales, cabina, color match, masterclass)
- Envía seguimiento post-visita por WhatsApp/SMS/email
- Comparte wishlists y tracking links curados

### Qué ve

- **Solo las clientas asignadas a su tienda** (RF-52)
- Su propio dashboard de KPIs (ventas atribuidas, recomendaciones convertidas, citas completadas)
- Su cola diaria de **Next Best Actions** (clientas con cumpleaños, reposición, win-back, abandoned cart)
- Catálogo completo de productos de **las marcas de su mostrador**
- Inventario en tiempo real **de su tienda**
- Sus propias notas privadas + todas las notas públicas de su tienda

### Qué NO ve

- Clientas de otras tiendas (ni siquiera dentro de la misma cadena)
- Notas privadas creadas por otras BAs
- KPIs de otras BAs o tiendas
- Configuración de marcas/tiendas/usuarios

### Permisos clave

| Acción | Permiso |
|---|---|
| Crear / editar clientas | ✓ (en su tienda) |
| Eliminar clientas | ✗ (solo admin vía ARCO) |
| Registrar órdenes | ✓ |
| Crear citas | ✓ |
| Enviar mensajes | ✓ |
| Capturar consentimientos | ✓ |
| Subir media | ✓ |
| Atribuirse una venta | Automático cuando es ella quien consulta/recomienda |
| Acceso a otras tiendas | ✗ |

### Especialización (atributo `specialty`)

Los BAs pueden tener una especialización oficial sin cambiar de rol:
- `generalist` — BA estándar (default)
- `makeup_artist` (MUA) — aplicación de maquillaje, looks, masterclasses
- `skincare_expert` — diagnóstico de piel, rutinas
- `fragrance_specialist` — perfumería de lujo (típico en YSL, Armani, Valentino)

La especialización no cambia permisos; sirve para asignación inteligente de clientas (una clienta con concerns de piel se rutea preferentemente a un skincare expert) y para mostrar credenciales en la UI.

### Atribución

Toda venta realizada después de su consulta/recomendación se le atribuye automáticamente (RF-25) vía `orders.attributedUserId`.

### Autenticación

Login individual, **nunca compartido** con otras BAs (RF-56). Cada BA tiene su propia cuenta Clerk.

---

## 2. Counter Manager / Business Manager

**Nombre oficial:** Counter Manager (también Business Manager)
**En español MX:** Gerente de Mostrador
**Rol en código:** `counter_manager`

### Qué hace

Lidera al equipo de BAs de **un mostrador específico de una marca en una tienda**. Es el primer nivel de gerencia. Sigue atendiendo clientas (es BA senior + líder), pero su trabajo principal es operar y desarrollar el equipo.

**Actividades diarias:**
- Coordina turnos y cobertura del mostrador
- Hace coaching 1:1 a sus BAs (KPIs, técnicas de venta, conocimiento de producto)
- Revisa el desempeño de cada BA (ventas, conversión de recomendaciones, NPS)
- Atiende clientas VIP y casos escalados
- Ejecuta eventos de marca en su mostrador (masterclass, lanzamientos)
- Coordina con el visual merchandising de la marca
- Maneja la relación con el gerente de la tienda departamental (Liverpool/Palacio)
- Reasigna clientas entre BAs cuando alguien sale de vacaciones
- Aprueba productos en reserva grandes o de larga duración

### Qué ve

- **Todas las clientas de su tienda** (no solo las suyas)
- Dashboards de **todos los BAs de su mostrador**: ranking, KPIs, attribution
- Cola de Next Best Actions consolidada del mostrador
- Reportes de su tienda: ventas, conversión de recomendaciones, eventos, samples → órdenes
- Inventario completo de su tienda con alertas de stock bajo
- Notas privadas de cualquier BA de su mostrador (para revisión y handoff)

### Qué NO ve

- Otras tiendas de Liverpool/Palacio
- Marcas que no opera su mostrador
- Configuración de marcas a nivel nacional
- Datos de finanzas/marketing nacional

### Permisos clave

| Acción | Permiso |
|---|---|
| Todo lo de Beauty Advisor | ✓ |
| Reasignar clientas entre BAs de su mostrador | ✓ |
| Aprobar reservas largas (>7 días) | ✓ |
| Editar perfil de cualquier clienta de su tienda | ✓ |
| Ver notas privadas de su equipo | ✓ (para coaching) |
| Configurar invitaciones a eventos del mostrador | ✓ |
| Crear / desactivar usuarios BA | ✗ (solo admin) |
| Crear / desactivar BAs en su mostrador | Solicita al admin |

### Scope técnico

`storeId + brandId` — un Counter Manager es siempre "Counter Manager de **Lancôme** en **Liverpool Polanco**", nunca cross-marca o cross-tienda.

---

## 3. Area Manager / Multibrand Area Manager

**Nombre oficial:** Multibrand Area Manager (también Retail Area Manager)
**En español MX:** Gerente de Zona Multimarca
**Rol en código:** `area_manager`

### Qué hace

Supervisa **todos los mostradores de una división en una zona geográfica**. Cubre múltiples marcas Luxe (Lancôme + YSL + Kiehl's + Armani…) en múltiples tiendas (Liverpool Santa Fe + Liverpool Polanco + Palacio Polanco + Palacio Perisur…). Viaja entre tiendas, no opera mostrador.

**Actividades diarias:**
- Visita rotativa a tiendas de su zona (típicamente 1-2 tiendas por día)
- Coaching a Counter Managers (técnicas de management, lectura de KPIs, planes de mejora)
- Revisa cumplimiento de directrices de marca (visual merchandising, ejecución de eventos, uso del clienteling)
- Negocia con compradores de tienda departamental a nivel local (espacio, ubicación, promociones)
- Identifica BAs y Counter Managers de alto potencial para promoción
- Ejecuta planes de acción cuando una tienda baja KPIs
- Aprueba presupuestos locales (T&E, eventos pequeños)
- Coordina con Field Education para training cuando se lanza producto nuevo
- Consolida resultados zona vs. objetivos

### Qué ve

- **Todas las clientas de todas las tiendas de su zona, dentro de su división** (RF-54)
- Dashboards comparativos: ranking de tiendas, ranking de Counter Managers, ranking de BAs en zona
- Heatmap geográfico de zona: por dónde están sus clientas, dónde hay gaps
- Reportes de pipeline: cumpleaños próximos, abandoned carts, clientas at-risk en toda la zona
- Inventario consolidado de su zona
- Comparativo entre marcas de Luxe en la misma tienda (ej. ¿cómo va Lancôme vs. YSL en Liverpool Polanco?)

### Qué NO ve

- Tiendas fuera de su zona
- Marcas de otras divisiones (un Area Manager Luxe no ve Consumer Products)
- Configuración de marcas
- Información personal de empleados (RR.HH.)

### Permisos clave

| Acción | Permiso |
|---|---|
| Crear / editar clientas | ✓ (en tiendas de su zona) |
| Reasignar clientas entre tiendas de su zona | ✓ |
| Reasignar clientas entre BAs de distintas tiendas | ✓ |
| Crear store events multi-tienda | ✓ |
| Aprobar reservas largas en su zona | ✓ |
| Ver notas privadas | ✗ (respeto a la confidencialidad del BA) |
| Configurar marcas | ✗ |
| Crear/desactivar Counter Managers o BAs | Solicita al admin |

### Scope técnico

`zoneId + divisionId` — un Area Manager es siempre "Area Manager **Luxe** en **Zona Centro MX**". Su acceso a tiendas se resuelve con: `stores WHERE zone_id = X AND brand_id IN (brands WHERE division_id = Y)`.

### Diferenciador clave vs. Counter Manager

| Counter Manager | Area Manager |
|---|---|
| 1 tienda, 1 marca | Múltiples tiendas, múltiples marcas (de su división) |
| Opera mostrador parte del día | Solo gestión (no atiende clientas habitualmente) |
| Coaching individual a BAs | Coaching a Counter Managers |
| Visión: 1 mostrador | Visión: zona completa |

---

## 4. National Retail Manager

**Nombre oficial:** National Retail Manager (puede ser por división o por marca)
**En español MX:** Director(a) Nacional de Retail
**Rol en código:** `national_retail_manager`

### Qué hace

Lidera retail de **una división completa a nivel nacional** (México). Tiene a su cargo a **todos los Area Managers de su división** en el país. Es el primer nivel donde el scope deja de ser regional y se vuelve nacional.

**Actividades diarias:**
- Define KPIs nacionales de retail para su división (objetivo de venta MX para Luxe)
- Diseña el calendario nacional de eventos (lanzamientos coordinados en todo el país)
- Negocia con la sede nacional de Liverpool/Palacio (acuerdos comerciales, espacio, branding)
- Aprueba expansión de mostradores nuevos
- Aprueba contrataciones senior (Area Managers, Counter Managers de tiendas flagship)
- Revisa rolling forecast mensual con cada Area Manager
- Coordina con marketing nacional, e-commerce, supply chain
- Reporta a la Division General Manager y a Latin America Zone

### Qué ve

- **Todas las clientas, órdenes, citas y mensajes de su división a nivel nacional**
- Dashboards ejecutivos por zona, por tienda, por marca, por Counter Manager, por BA
- Trends nacionales: pipeline de clientas VIP, churn por zona, conversión de samples nacional
- Comparativos cross-zona (¿qué zona vende mejor Lancôme? ¿en qué Liverpool YSL tiene más share?)
- Configuración de mensajes/templates a nivel marca y nacional

### Qué NO ve

- Otras divisiones (un National Retail Manager Luxe no ve Consumer Products)
- Configuración de tenant (usuarios admin del sistema, integraciones)
- Logs de auditoría completos (solo summary)
- Información financiera detallada por empleado

### Permisos clave

| Acción | Permiso |
|---|---|
| Configurar message templates por marca | ✓ |
| Crear/configurar message campaigns nacionales | ✓ |
| Aprobar exportes de datos a marketing | ✓ |
| Definir segments dinámicos nacionales | ✓ |
| Crear / editar marcas (logo, colores, threshold VIP) | ✓ (solo sus marcas) |
| Crear / editar zonas | ✗ (admin) |
| Crear / desactivar Area Managers | Solicita al admin |
| Ejecutar ARCO / derecho al olvido | ✗ (solo admin) |

### Scope técnico

`divisionId` (sin restricción de zona ni tienda dentro de esa división). Su acceso es: `stores WHERE brand_id IN (brands WHERE division_id = user.division_id)`.

### Diferenciador clave vs. Area Manager

| Area Manager | National Retail Manager |
|---|---|
| 1 zona, 1 división | Nacional, 1 división |
| Visión: tiendas en zona | Visión: todas las tiendas del país de su división |
| Aprueba presupuestos locales | Aprueba presupuestos nacionales |
| Tiene 5-15 tiendas | Tiene 50-200 tiendas |

---

## 5. Admin (Country / IT)

**Nombre oficial:** Administrator (uso interno para Country GM + IT super-admin)
**En español MX:** Administrador Central
**Rol en código:** `admin`

### Qué hace

Gestiona la **plataforma a nivel nacional, sin restricciones de división**. Es un rol híbrido entre Country General Manager (visibilidad total cross-división) y administrador de TI (configuración del sistema).

**Actividades diarias:**
- Da de alta usuarios nuevos (todos los roles: BA, Counter Manager, Area Manager, National Retail Manager)
- Reasigna roles cuando alguien cambia de puesto
- Configura marcas nuevas (cuando L'Oréal lanza una marca en MX)
- Configura tiendas nuevas (cuando se abre un mostrador en una tienda nueva)
- Configura zonas geográficas y asigna municipios
- Configura integraciones (POS, WhatsApp Business API, proveedores de IA)
- Versiona el aviso de privacidad cuando legal lo actualiza
- Ejecuta solicitudes ARCO (derecho al olvido) cuando un cliente lo pide
- Revisa audit logs ante incidentes
- Es la única persona que puede ver datos de las 4 divisiones simultáneamente

### Qué ve

- **Todo, sin excepción**
- Todas las clientas, órdenes, citas, mensajes, notas (incluyendo privadas) del país
- Configuración completa del sistema
- Audit logs completos
- Logs de uso de IA (costos, latencia, errores)
- Logs de transcripciones de voz

### Permisos clave

| Acción | Permiso |
|---|---|
| Todo lo anterior | ✓ |
| Crear/desactivar usuarios de cualquier rol | ✓ |
| Configurar marcas, tiendas, zonas | ✓ |
| Versionar aviso de privacidad | ✓ |
| Ejecutar ARCO (derecho al olvido) | ✓ (único rol) |
| Acceso a integraciones | ✓ |
| Acceso a audit logs | ✓ |
| Editar customer activity / órdenes históricas | ✓ (con audit) |
| Borrar registros | ✗ (solo anonimización vía ARCO) |

### Scope técnico

Sin filtros — todos los métodos de `ScopeService` retornan `undefined` (sin WHERE clause).

### Consideración de gobernanza

Por su poder, el admin debe:
- Ser un grupo pequeño (idealmente 2-3 personas máximo en MX)
- Tener MFA obligatorio en Clerk
- Toda acción queda registrada en `audit_logs`
- Acceso a PII se loguea explícitamente (cumplimiento LFPDPPP)

---

## Tabla resumen — scope de acceso

| Rol | Scope geográfico | Scope de marca/división | Quién está debajo |
|---|---|---|---|
| `beauty_advisor` | 1 tienda | 1 marca (el mostrador donde trabaja) | — |
| `counter_manager` | 1 tienda | 1 marca | BAs de su mostrador |
| `area_manager` | 1 zona | 1 división (múltiples marcas) | Counter Managers de su zona |
| `national_retail_manager` | Nacional | 1 división | Area Managers de su división |
| `admin` | Nacional | Todas las divisiones | Todos |

## Tabla resumen — permisos críticos

| Acción | BA | Counter Mgr | Area Mgr | Nat. Retail Mgr | Admin |
|---|---|---|---|---|---|
| Crear/editar clientes | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver notas privadas de otros | ✗ | ✓ (su mostrador) | ✗ | ✗ | ✓ |
| Reasignar clientes entre tiendas | ✗ | ✗ | ✓ (su zona) | ✓ (su división) | ✓ |
| Configurar marcas | ✗ | ✗ | ✗ | ✓ (sus marcas) | ✓ |
| Configurar tiendas/zonas | ✗ | ✗ | ✗ | ✗ | ✓ |
| Crear/desactivar usuarios | ✗ | ✗ | ✗ | ✗ | ✓ |
| Templates de marketing | ✗ | ✗ | ✗ | ✓ | ✓ |
| Ejecutar ARCO | ✗ | ✗ | ✗ | ✗ | ✓ |
| Ver audit logs | ✗ | ✗ | ✗ | ✗ | ✓ |

## Mapeo a requerimientos del RFP

| RFP | Rol cubierto |
|---|---|
| RF-52 (BA ve solo su tienda) | `beauty_advisor` con scope `storeId` |
| RF-53 (Manager ve su tienda) | `counter_manager` con scope `storeId + brandId` |
| RF-54 (Supervisor ve múltiples tiendas) | `area_manager` con scope `zoneId + divisionId` |
| RF-55 (Admin gestión nacional) | `admin` sin scope + `national_retail_manager` por división |
| RF-56 (Auth individual) | Todos los roles con cuenta Clerk individual |
| RNF-15 (Escalabilidad de roles) | Enum extensible + esquema soporta `divisions` |

## Roles que NO se modelan en el sistema

Por claridad, estos roles existen en L'Oréal pero **no son usuarios operativos del clienteling**:

- **Brand General Manager** — director nacional de una marca; consume reportes ejecutivos, no opera mostrador. Si necesita acceso → cae bajo `admin` o `national_retail_manager`.
- **Division General Manager / Country General Manager** — consumidores de dashboards. Acceso vía `admin` read-only si se requiere.
- **Field Education Manager / National Education Manager** — rol de capacitación, no necesita acceso operativo a clientes. Si se agrega módulo de training futuro, se modelará entonces.
- **Visual Merchandising** — rol de marca, no de clienteling.
- **Marketing / E-commerce / Supply Chain** — consumen exports de datos pero no operan la herramienta de mostrador.

Estos roles deben recibir dashboards/exports vía el módulo de Analytics (separado del CRUD operativo) o ser onboardeados como `admin` con permisos restringidos en una iteración futura.
