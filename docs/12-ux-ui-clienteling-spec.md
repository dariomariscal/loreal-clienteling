# UX/UI Spec — Clienteling iPad-first para Luxury Beauty

> Documento de referencia para el diseño y construcción de la app de clienteling de L'Oréal Luxe (Lancôme, YSL y otras marcas del grupo). Cubre: contexto de producto, arquitectura visual iPad-first, patrones de UX, integración de IA y reglas específicas de luxury beauty.

---

## 1. Contexto

### 1.1 Marcas y producto vendido

- **Lancôme** — skincare y maquillaje de lujo (Génifique, Absolue, Teint Idole), fragancias (La Vie Est Belle, Idôle). Tono: elegancia francesa atemporal, científica.
- **YSL Beauté** — fragancias (Black Opium, Libre, MYSLF), maquillaje (Rouge Pur Couture, Touche Éclat). Tono: audacia couture, rock-chic, nocturno.
- Ambas son parte de **L'Oréal Luxe**. La app sirve a Beauty Advisors (BAs) en boutique.

### 1.2 Quién usa la app

- **Beauty Advisors (BAs)** en boutique — usuario principal, todo el día con iPad en mano.
- **Store managers** — visión agregada, performance, asignaciones.
- **Clientes finales** — nunca usan la app directamente; reciben mensajes, citas, recomendaciones.

### 1.3 Qué hace diferente luxury beauty

| Aspecto | Retail genérico | Luxury beauty |
|---|---|---|
| Tono | Eficiente | Editorial, respirado |
| Frecuencia de contacto | Alta | ~1/mes salvo trigger fuerte |
| Sample | Marketing | **Estratégico** — convierte mejor que descuento |
| Compliance | Bajo | Alto: claims, alérgenos, exclusivas |
| Multi-marca | Una marca | Permeable entre Lancôme/YSL respetando murallas legales |
| Producto en pantalla | Pequeño | **Grande, editorial** |

---

## 2. Plataformas de referencia

A imitar / superar:

- **BSPK** — #1 en clienteling luxury 2026, multicanal, AI-first.
- **Tulip + Salesfloor** — fuerte en luxury, integración Salesforce, Tulip Messaging AI.
- **Proximity Insight** — Salesforce-native, casos beauty.
- **Red Ant RetailOS** — explícitamente "beauty platform".
- **Cegid** — fuerte EMEA y luxury.
- **L'Oréal Luxe Connect** (app interna actual del grupo) — baseline a superar.

---

## 3. Funcionalidades clave (qué debe hacer la app)

### 3.1 Perfil de cliente 360°

**Datos base**
- Contacto, cumpleaños, idiomas, canal preferido (WhatsApp / SMS / email / WeChat / LINE).
- Tier de loyalty (Lancôme: Rose Gold / Gold / Platinum; YSL: Loyalty Club).
- Puntos, beneficios, gifts pendientes.
- Histórico omnicanal: tienda + e-commerce de marca + retailers (Sephora, Douglas, El Corte Inglés).

**Datos específicos de beauty (el diferenciador)**
- **Perfil de piel**: tipo (seca/mixta/grasa), tono Fitzpatrick, undertone, concerns (manchas, arrugas, rojeces, acné).
- **Perfil de maquillaje**: shade match (ej. Teint Idole 320 W, All Hours B50), texturas, looks favoritos.
- **Perfil olfativo**: familias (oriental, floral, amaderada), perfumes que posee, aversiones.
- **Alergias / ingredientes a evitar** (sin sulfatos, vegano, fragrance-free).
- **Rituales**: rutina AM / PM, frecuencia, productos compatibles.

**Notas y timeline**: notas libres del BA, fotos de looks aplicados, momentos clave (boda, embarazo, viaje).

### 3.2 Catálogo y recomendaciones

- Catálogo enriquecido: shade finder, ingredientes, claims, swatches, videos.
- Cross-sell contextual (Génifique → Génifique Eye → Absolue Mask).
- Sets y rutinas pre-armadas ("ritual de noche", "antiage 40+", "set viaje").
- Recomendaciones IA basadas en perfil + histórico + tendencias.
- Wishlist compartida cliente ↔ BA.
- Stock en tiempo real (tienda propia, otras tiendas, central); reserva y click-and-collect.

### 3.3 Outreach proactivo (1:1 a escala)

- Mensajería multicanal integrada: WhatsApp Business, SMS, email, WeChat, LINE.
- Templates aprobados por marca (compliance crítico).
- Drafts con IA personalizados.
- **Triggers automáticos** (auto-tasks):
  - Cumpleaños / aniversario de cliente.
  - **Replenishment** (sérum ~60 días → recordatorio día 50).
  - Re-engagement (sin compra 90/180 días).
  - Restock de wishlist.
  - Lanzamiento o edición limitada relevante.
- One-to-many con personalización (campañas que se sienten 1:1).

### 3.4 Citas y servicios

- Booking: maquillaje, consulta skincare, masterclass, fragancia personalizada.
- Recordatorios automáticos pre/post.
- Ficha de servicio: qué se hizo, qué productos se usaron, foto del look → al perfil.
- Consultas virtuales / video.

### 3.5 Samples (muy luxury beauty)

- Tracking: qué fragancia/crema, fecha, expectativa de follow-up.
- Follow-up automático 7–14 días después.
- Conversion tracking sample → venta como KPI explícito.

### 3.6 Eventos VIP

- Invitaciones a private viewings, lanzamientos, masterclass, eventos de fragancia.
- RSVP tracking, lista curada por BA.
- Servicios premium: grabado de frasco, packaging personalizado, gifting.

### 3.7 Checkout y operaciones

- Mobile POS desde tablet (sin caja).
- Carrito compartido cliente ↔ BA.
- Devoluciones, cambios, envío a casa, click-and-collect.

### 3.8 Performance del BA

- Dashboard personal: ventas, clientes activos, mensajes, conversión de samples, response rate.
- **Black Book / clientela**: lista propia, segmentable (VIP, dormant, top spenders).
- Ranking entre BAs, objetivos, comisiones atribuibles.
- Manager view: tienda + alertas de clientes en riesgo.

### 3.9 Training in-app

- Fichas de producto, videos, quizzes, certificaciones por gama (modelo BeautyEd / Axonify).
- Cheat sheets rápidas durante una venta.

### 3.10 Compliance e inteligencia

- Consent management (GDPR/CCPA): opt-in por canal, derecho al olvido, audit log.
- Detección de duplicados, merge.
- Análisis de cohortes, LTV, churn risk, next best product.
- Integraciones con Salesforce / SAP / sistema central de loyalty.

---

## 4. Arquitectura visual — iPad-first

### 4.1 Esqueleto base: Three-Column Split View

Patrón canónico Apple HIG. Usado por Tulip, BSPK, Proximity, Red Ant.

```
┌─────────────┬──────────────────┬─────────────────────────┐
│             │                  │                         │
│  SIDEBAR    │   LISTA          │   DETALLE               │
│  (Nav)      │   (Browse)       │   (Focus)               │
│             │                  │                         │
│  240–280pt  │   320–380pt      │   Resto (flex)          │
│             │                  │                         │
└─────────────┴──────────────────┴─────────────────────────┘
```

**Ratio recomendado**: ~1 : 1.3 : 2.5 en landscape (iPad Pro 12.9" 1366pt → ~260 / 340 / 766).

### 4.2 Comportamiento por orientación

| Modo | Comportamiento |
|---|---|
| **Landscape** | 3 columnas visibles siempre |
| **Portrait** | Sidebar colapsa a icono (`sidebar.left`), quedan 2 columnas |
| **Split View 50%** | 2 columnas (lista + detalle), sidebar en overlay |
| **Slide Over (1/3)** | 1 columna estilo iPhone con tab bar inferior |

**Regla HIG**: nunca sidebar + tab bar a la vez.

### 4.3 Qué va en cada columna

#### Columna 1 — Sidebar

```
─────────────────────
 LOGO marca (Lancôme)
─────────────────────
 [Foto BA] Sara M.
 Boutique Serrano
─────────────────────
 □ Today              ← dashboard del día
 □ My Clients         ← black book
 □ Messages       (3) ← inbox unificado
 □ Appointments
 □ Tasks          (5)
─────────────────────
 □ Catalog
 □ Samples
 □ Events
 □ Training
─────────────────────
 □ Performance
 □ Settings
```

Reglas:
- 8–12 items máximo, agrupados con separadores, sin scroll.
- Badges numéricos solo en accionable (mensajes, tasks, citas hoy).
- "Today" siempre primero.

#### Columna 2 — Lista / Browse

Densidad media. Para clientes:

```
┌─────────────────────────┐
│ 🔍 Search clients       │
│ [Filters: VIP ▾ Tier ▾] │
├─────────────────────────┤
│ ● María García      VIP │
│   Platinum · 2 días     │
│   Génifique × 3         │
├─────────────────────────┤
│ ○ Laura Sánchez         │
│   Gold · 12 días        │
│   Necesita follow-up    │
└─────────────────────────┘
```

- Row height ~72–88pt (3 líneas: nombre / tier+recency / hook).
- Avatar a la izquierda, indicador VIP a la derecha.
- Filtros como chips, no modal.
- Sticky search en top.

#### Columna 3 — Detalle

80% de la información. Dos patrones probados:

- **Patrón A — Inspector con tabs internos** (Tulip, BSPK): tabs Overview / History / Profile / Notes.
- **Patrón B — Scroll vertical con secciones** (Proximity, Salesfloor): narrativo, más luxury.

**Recomendación**: B en portrait, A en landscape. La ficha de cliente debe sentirse como una carpeta de boutique, no como un CRM.

### 4.4 Densidad y luxury feel

| Aspecto | Retail genérico | Luxury beauty |
|---|---|---|
| Densidad | Alta | **Baja, respirada** |
| Tipografía | Sans 13–15pt | **Serif display (Didone) en headers**; sans elegante UI 15–17pt |
| Color | Múltiples acentos | **Monocromo + 1 acento marca** (rojo Lancôme, negro YSL) |
| Bordes | Cards con shadow | **Líneas finas o sin bordes**, separación por espacio |
| Imagen | Producto pequeño | **Producto grande, editorial** |
| Padding | 12–16pt | **24–40pt** entre secciones |

**Margen exterior iPad Pro 12.9"**: 32–48pt a cada lado del detail pane.

### 4.5 Touch, pointer y atajos

- Targets mínimos **44×44pt**.
- Soportar hover states (Magic Keyboard trackpad).
- Atajos: `⌘F` buscar cliente, `⌘N` nueva nota, `⌘K` command bar.
- Soportar Apple Pencil para notas a mano (firma, anotaciones en swatch).

---

## 5. Pantallas principales

### 5.1 Today / Home

La pantalla a la que el BA vuelve 30 veces al día. Una sola columna en detail pane, con cards.

```
Good morning, Sara ☀
Boutique Serrano · martes 24 mayo

┌─ Appointments today (3) ─────────┐
│ 10:30  María García   Skincare   │
│ 12:00  Laura S.       Make-up    │
│ 16:30  Ana López      Walk-in    │
└──────────────────────────────────┘

┌─ Priority follow-ups ────────────┐
│ • Sample Génifique → día 12      │
│ • Birthday: Carmen R. mañana     │
│ • New launch: Rouge Pur Couture  │
└──────────────────────────────────┘

┌─ Your numbers · May ─────────────┐
│ €18,420 / €25,000 target         │
│ 142 outreach · 38% response      │
└──────────────────────────────────┘
```

### 5.2 Customer Detail

Orden de secciones validado en luxury:

1. **Header sticky** — foto, nombre, tier, LTV, acciones rápidas (📞 💬 ✉️).
2. **Beauty profile** — piel, tono, fragancias, alergias. *Lo que diferencia luxury beauty.*
3. **Active context** — samples dadas, citas próximas, mensajes recientes.
4. **Wishlist + recomendaciones**.
5. **Purchase history** (omnicanal con badges de tienda/online).
6. **Timeline** completa.
7. **Notes** privadas del BA.

### 5.3 Messages

Three-column dentro del detail pane:
- Lista de conversaciones (col 2 ya hace de lista).
- Hilo activo en col 3.
- Composer con templates de marca + sugerencias IA arriba del input.

### 5.4 Catalog

- Grid 3–4 cols landscape, 2 portrait.
- Card alta: imagen 4:5, nombre, precio, stock dot.
- Tap → quick-look popover, no navegación.
- "Add to recommendation" sin salir.

### 5.5 Componentes recurrentes

1. **Customer card** (en lista) — la forma de ver a una clienta es la marca.
2. **Action sheet flotante** (popover, no modal) para "agendar / añadir sample / enviar mensaje".
3. **Composer multicanal** con preview del template + variables.
4. **Quick-look de producto** (popover desde catálogo o recomendación).
5. **Empty states editoriales** — fotografía de marca o tipografía, no ilustraciones genéricas.
6. **Stat blocks** — números grandes, contexto pequeño.

---

## 6. Integración de IA en la UX

### 6.1 Regla maestra

**La IA nunca debe sentirse como IA.** El BA debe sentirse empoderado, no reemplazado. El cliente nunca debe percibir que el mensaje vino de un bot.

### 6.2 Los 4 patrones canónicos de superficie

#### A. Inline Draft (el más usado)
La IA pre-rellena un campo existente.
- **Dónde**: composer de mensajes, campo de notas, descripción de producto.
- **UX**: texto pre-escrito, badge `✨ Sugerido` arriba del input. Botón "Regenerar" / "Empezar de cero".

#### B. Suggestion Chips (el más discreto)
Botones contextuales con acciones pre-empaquetadas.
- **Dónde**: encima del composer, en ficha de cliente, debajo del header.
- **UX**: 2–4 chips horizontales. Tap → expande a draft en composer.

#### C. Side Panel / Inspector (copilot)
Panel lateral derecho colapsable.
- **Dónde**: cuarta columna en iPad landscape, o sheet inferior en portrait.
- **UX**: lista de "Insights" y "Próximas acciones" para la cliente activa.

#### D. Conversational Surface (chat de consulta)
Chat dedicado en command bar (`⌘K`).
- **UX**: "Encuéntrame clientas que compraron Génifique pero no Absolue".
- En luxury, **secundario**: la IA debe proponer, no esperar a ser preguntada.

### 6.3 Dónde aparece la IA, pantalla por pantalla

#### Home — Next Best Actions

```
┌─ Suggested for today ✨ ────────────────┐
│  ① María García — sample day 12         │
│    "Suggested: WhatsApp follow-up"      │
│    [Draft message]  [Skip]              │
│                                         │
│  ② Carmen R. — birthday tomorrow        │
│    "VIP Platinum, last gift: La Vie..." │
│    [Draft wish]  [Schedule call]        │
│                                         │
│  ③ Ana López — new launch match         │
│    "Rouge Pur Couture #157 fits her..." │
│    [Send teaser]  [Add to wishlist]     │
│                                         │
│  See 5 more →                           │
└─────────────────────────────────────────┘
```

Patrón: lista priorizada cliente + razón + acción + dismiss. Máximo 3–5 visibles.

#### Customer Detail — 3 zonas de IA

**(1) Header insights** — debajo del nombre:
```
María García · Platinum · 2,450€ LTV
✨ Loves floral fragrances · Best contact: WhatsApp evenings
```

**(2) Suggestion chips** debajo del header:
```
[📞 Call] [💬 WhatsApp] [✉️ Email]
[✨ Birthday in 6d] [✨ Sample due] [✨ New match: Idôle EDP]
```

**(3) Sección Recommendations** con "why" por producto:
```
Recommended for María
─────────────────────
[Absolue Eye Cream]    "Complements her Génifique routine"
[Idôle EDP]            "Floral lover, hasn't tried Lancôme fragrance"
[Rouge Pur Couture]    "Matches her undertone N3"
```

#### Composer — el draft

```
To: María García · WhatsApp
─────────────────────────────────────────────────
✨ Suggested draft · based on her birthday & last purchase

┌─────────────────────────────────────────────┐
│ ¡Hola María! Mañana es tu cumpleaños 🌹     │
│ y queríamos dejarte un detalle preparado    │
│ en boutique: una muestra de Absolue Eye     │
│ Cream que complementa tu rutina con         │
│ Génifique. ¿Te paso a buscar entre las 17h? │
└─────────────────────────────────────────────┘

[✨ Regenerate]  [More formal]  [Shorter]  [Start blank]

Tone: ● Lancôme voice  ○ Casual  ○ Formal
─────────────────────────────────────────────────
                                      [Send →]
```

Detalles:
- Draft **dentro del campo de envío**, no en burbuja separada.
- Indicador discreto `✨ Suggested draft` + línea explicativa.
- Variantes como chips, no sliders ni menús.
- **Tone lock** con voz de marca (Lancôme ≠ YSL).
- "Start blank" siempre visible — ignorar la IA en 1 tap.

#### Catalog — búsqueda semántica

```
🔍 "fragancias para regalo cliente VIP que adora YSL Libre"
                                  ↑ búsqueda semántica

Filtered for María García ✨
[Idôle EDP] [Tresor La Nuit] [La Vie Est Belle Intensément]
```

Dentro de un producto: **"Why for her"** — 2–3 razones de por qué encaja.

### 6.4 Patrones de control y confianza (críticos)

#### Explainable Rationale — imprescindible
Toda sugerencia lleva un "porque". Una línea en gris pequeño:
- `"Porque compró Génifique hace 45 días"`
- `"Porque su tier subió a Platinum la semana pasada"`
- `"Porque su look favorito incluye base N3"`

Sin "porque", el BA no confía y deja de usar la IA.

#### Confidence Signal — sutil
No mostrar "87% confidence". En su lugar:
- **Alta**: sugerencia aparece directamente.
- **Media**: prefijo "Maybe…" o estilo más tenue.
- **Baja**: no se muestra. Si la IA no está segura, **calla**.

#### Undo siempre disponible
Toda acción enviada (mensaje, task) tiene undo 15s en toast inferior.

#### Autonomy Dial (settings)
Por tipo de acción:
- **Mensajes salientes** → siempre con confirmación (default).
- **Tasks internas** → automáticas (puede auto-crear "follow-up sample en 14d").
- **Etiquetado de clientes** → automático con review semanal.

En Settings → AI assistance, toggle simple por categoría. No exponer "modelos" ni "temperatura".

#### Escalation Pathway
Cuando la IA no puede:
- Cliente con alergia desconocida → **no** sugiere producto, muestra "Ask client about allergies".
- Mensaje en idioma raro → "I'll help in Spanish — switch to manual?"

### 6.5 Reglas específicas de luxury beauty

#### 🚫 No mostrar nunca
- "Powered by GPT/Claude/AI" → rompe la marca.
- Porcentajes de confianza explícitos.
- Spinners largos visibles — usar skeleton states elegantes.
- Términos técnicos ("model", "prompt", "tokens").
- Emojis robóticos (🤖). El icono debe ser ✨ o un símbolo de marca.

#### ✅ Sí hacer
- **Brand voice training** — la IA habla como Lancôme (poético, francés, elegante) o YSL (audaz, directo, fashion). Templates obligatorios.
- **Compliance check invisible** — validar contra términos prohibidos (claims médicos, alérgenos, exclusivas regionales).
- **Bilingüe/multilingüe nativo**.
- **Sample-aware** — la IA conoce el ciclo (sample dura X días → trigger).
- **Lanzamiento-aware** — al llegar Rouge Pur Couture nueva edición, segmenta "compradoras de rojos cálidos".

### 6.6 Las 5 funcionalidades de IA con más ROI (por orden)

1. **Drafts de mensaje en composer** — BA ahorra 10 min/mensaje, mantiene volumen.
2. **Daily Next Best Actions en Home** — día caótico → checklist priorizada.
3. **Match scoring producto↔cliente** — power-up de recomendaciones (con "why").
4. **Resumen de cliente al abrir ficha** — onboarding express del BA.
5. **Búsqueda semántica** del catálogo y clientes.

**Las que NO añaden valor en luxury v1**:
- Chatbot autónomo cliente↔IA (rompe propuesta de valor del BA).
- Generación de imágenes (no encaja con catálogo controlado).
- Voice assistant (el BA habla con clientes, no con el iPad).

### 6.7 Anatomía de una AI Card

Plantilla visual estándar para toda sugerencia:

```
┌──────────────────────────────────────────┐
│ ✨  Sample follow-up                     │  ← tipo de acción
│                                          │
│ María García · day 12 of Génifique trial │  ← contexto 1 línea
│                                          │
│ Suggested: WhatsApp evening              │  ← acción concreta
│ "She typically replies after 19h"        │  ← rationale (gris pequeño)
│                                          │
│ [Draft message]  [Schedule]  [Dismiss]   │  ← 1 primaria, 2 secundarias
└──────────────────────────────────────────┘
```

Reglas:
- 1 acción primaria (botón sólido).
- 1–2 secundarias (botón ghost).
- Dismiss siempre disponible.
- Rationale **siempre** presente.
- Máximo 4 líneas de texto.

### 6.8 Métrica de éxito por sugerencia

- **Aceptación <40%** → la sugerencia muere.
- **Aceptación 40–85%** → mantener con tuning.
- **Aceptación >85%** → candidato a automatizar con Autonomy Dial.

---

## 7. Multitasking y breakpoints

Diseñar en este orden:

1. **Landscape iPad Pro 11"** (1194×834) — resolver three-column.
2. **Portrait iPad Air** (820×1180) — sidebar colapsa, list+detail.
3. **Split View 50%** (~507pt) — comportamiento iPhone Plus.
4. **Slide Over / <480pt** — tab bar bottom, una columna.

---

## 8. Referencias visuales / mood

- **Apple Mail iPad** — arquitectura three-column.
- **Notion iPad** — detail pane como canvas, no pantalla fija.
- **Cash App / Linear iPad** — popovers y quick actions.
- **Net-a-Porter EIP app** — tono luxury, espacio, fotografía dominante.
- **Farfetch Store Companion** — clienteling interno luxury.
- **Liquid Glass / iPadOS 18+** (WWDC25) — look moderno 2026.

---

## 9. Checklist resumen

### Layout
- [ ] Three-column split view en landscape
- [ ] Sidebar colapsa en portrait
- [ ] Tab bar solo en compact widths (<480pt)
- [ ] Targets 44×44pt mínimo
- [ ] Margen 32–48pt en detail pane

### Tipografía y feel
- [ ] Serif display en headers (Didone-style)
- [ ] Sans elegante UI 15–17pt
- [ ] Monocromo + 1 acento por marca
- [ ] Padding generoso (24–40pt entre secciones)
- [ ] Empty states editoriales con fotografía de marca

### Customer detail
- [ ] Header sticky con acciones rápidas
- [ ] Beauty profile como sección destacada
- [ ] Active context (samples, citas, mensajes recientes)
- [ ] Purchase history omnicanal
- [ ] Notes privadas del BA

### IA
- [ ] Inline drafts en composer
- [ ] Suggestion chips contextuales en ficha
- [ ] Next Best Actions en Home (max 5)
- [ ] Explainable rationale en cada sugerencia
- [ ] "Start blank" siempre visible
- [ ] Tone lock por marca (Lancôme / YSL)
- [ ] Undo 15s en toast tras enviar
- [ ] Autonomy Dial en settings
- [ ] Sin "Powered by AI", sin %, sin jerga técnica
- [ ] Compliance check invisible antes de mostrar drafts

### Performance
- [ ] Skeleton states elegantes (no spinners)
- [ ] Carga <5s para cualquier pantalla
- [ ] Offline-first para ficha de cliente (ver `05-offline-sync.md`)

---

## 10. Fuentes de referencia

- [Apple HIG — Designing for iPadOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ipados)
- [Apple HIG — Split Views](https://developer.apple.com/design/human-interface-guidelines/split-views)
- [Apple HIG — Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- [WWDC25 — Elevate the design of your iPad app](https://developer.apple.com/videos/play/wwdc2025/208/)
- [Apple Design Gallery 2026 — Liquid Glass](https://developer.apple.com/design/new-design-gallery-2026/)
- [BSPK — Mobile Clienteling for Luxury](https://www.bspk.com/post/why-mobile-clienteling-is-a-must-for-modern-luxury-retailers)
- [BSPK — Digital Luxury Playbook & AI](https://www.bspk.com/post/the-new-digital-luxury-playbook-e-commerce-online-client-service-and-ai-personalization)
- [Tulip Messaging AI](https://www.tulip.com/tulip-messaging-ai/)
- [Tulip — Future of Clienteling AI](https://www.tulip.com/blog/the-future-of-clienteling-phygital-ai-and-next-gen-engagement/)
- [Salesfloor — Beauty Clienteling](https://salesfloor.net/beauty-clienteling/)
- [Proximity Insight — Top Clienteling Apps 2025](https://www.proximityinsight.com/resources/research/top-clienteling-apps-in-2025-which-is-right-for-you/)
- [Red Ant — Beauty Retail Platform](https://www.redant.com/retailos/beauty/)
- [Cegid — Clienteling for Luxury](https://www.cegid.com/global/blog/clienteling-growth-driver-for-luxury-brands/)
- [Smashing Magazine — Designing Agentic AI UX Patterns](https://www.smashingmagazine.com/2026/02/designing-agentic-ai-practical-ux-patterns/)
- [Shape of AI — Follow-up Pattern](https://www.shapeof.ai/patterns/follow-up)
- [Microsoft — Generative AI UX Guidance](https://learn.microsoft.com/en-us/microsoft-cloud/dev/copilot/isv/ux-guidance)
- [Heyday — Virtual Clienteling Luxury](https://heyday.hootsuite.com/post/clienteling-in-the-age-of-luxury-e-commerce/)
