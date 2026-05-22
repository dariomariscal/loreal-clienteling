# UI Component Guide — L'Oréal Clienteling

> Este documento traduce la visión de `09-ux-vision.md` en **decisiones concretas de UI**: qué componente para qué cosa, cómo se distribuye la información, en qué formato, en qué jerarquía visual.
>
> No se mira el código existente. Se diseña desde principios + referencias documentadas de las mejores apps del mundo (Linear, Things, Superhuman, Stripe, Raycast, Apple HIG, Salesfloor, Tulip, Endear).

---

## 1. Principios de UI que rigen cada decisión

Antes de elegir componentes, las reglas del juego:

### 1.1. Una sola jerarquía visual por pantalla
3 tamaños de tipografía máximo. Una sola "estrella" en cada pantalla — todo lo demás la sirve.

### 1.2. Pirámide invertida de información
Lo más importante arriba. Lo contextual en medio. Lo histórico abajo. Patrón validado en customer-360 design.

### 1.3. Touch targets de 44×44pt mínimo (HIG Apple)
La app vive en iPad. Cada zona tocable cumple este mínimo, **sin excepciones**.

### 1.4. Densidad calculada: 5–9 elementos por pantalla
Límite cognitivo humano. Más allá, el cerebro filtra y olvida. Si necesitas mostrar más, **agrupa**.

### 1.5. F-pattern / Z-pattern de lectura
Lo más importante en top-left. Acción primaria en top-right. Confirma esto con cada pantalla.

### 1.6. Estados vacíos elegantes, no técnicos
"Sin notas aún" es feo. *"Aquí guardarás lo que quieras recordar de ella"* es invitación.

### 1.7. Animaciones 180-240ms con easing natural
Más rápido = brusco. Más lento = torpe. Curva: `cubic-bezier(0.4, 0, 0.2, 1)` (Material's "standard").

### 1.8. Card-based pero sin paredes
Cards como agrupadores visuales suaves — usar **espacio blanco + tipografía**, no bordes pesados.

---

## 2. El sistema de layout maestro — Split View asimétrico

### Para iPad horizontal (modo principal de uso)

**Patrón: Master-Detail Split View** (HIG Apple, validado en Things 3, Apple Mail, Linear):

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (320px fijo)  │   DETAIL (resto del ancho)     │
│                         │                                │
│  - Pantalla del día     │   Contenido contextual         │
│  - Búsqueda             │   (ficha, conversación,        │
│  - Lista de clientas    │    pantalla del día expandida) │
│                         │                                │
│  Siempre visible        │   Cambia según selección       │
└─────────────────────────────────────────────────────────┘
```

**Por qué este patrón:**
- Master-detail es **el patrón estándar para apps de productividad en iPad** según HIG.
- Reduce navegación: no hay "back" — siempre ves contexto y detalle simultáneamente.
- Linear, Superhuman, Things 3, Apple Mail lo usan. Familiar para cualquier usuario.

### Para iPad vertical (modo secundario)

Sidebar colapsa a un drawer (se abre con swipe desde la izquierda o tap en chevron). El detail ocupa todo el ancho.

### Para móvil (futuro, fase 2)

Stack navigation tradicional. No es prioridad para la demo.

---

## 3. Pantalla por pantalla — componentes específicos

### 3.1. Pantalla del día (Home)

**Función:** lo primero que María ve. Define el día.

**Estructura (top → bottom):**

```
[ Header silencioso: "Buenos días, María" — opcional, sutil ]
[ Fecha en formato humano: "Sábado 10 de mayo" ]

────────────────────────────────────────

  HOY IMPORTAN ESTAS 5 CLIENTAS

  ┌──────────────────────────────────┐
  │  [Avatar]  Patricia González     │
  │            Compró rutina anti-   │
  │            edad hace 58 días.    │
  │            Probable reabasto.    │
  │            [ Mandarle mensaje →] │
  └──────────────────────────────────┘
  
  (4 tarjetas más iguales, scroll vertical si pasa de viewport)

────────────────────────────────────────

  3 CITAS HOY

  · 11:00  Sofía Hernández      [chevron]
  · 14:30  Patricia González    [chevron]
  · 17:00  Mariana Ortiz        [chevron]
```

**Componentes a usar:**

| Elemento | Componente | Justificación |
|---|---|---|
| Tarjeta de clienta sugerida | **Card grande con elevación 1** (sombra muy sutil), padding generoso | Patrón validado en Endear, Salesfloor para "next action" |
| Avatar | **Imagen circular 56px** o iniciales con color suave si no hay foto | HIG Apple, estándar en clienteling apps |
| Acción sugerida dentro de tarjeta | **Botón terciario** (texto + chevron, sin fondo) | No competir con primary actions del detail panel |
| Línea de contexto IA | **Texto secundario, 15px, line-height 1.5** | Legibilidad sin gritar |
| Lista de citas | **Inset list** (estilo Things 3 / Apple Settings) | Más limpio que tabla, scaneable |
| Hora de cita | **Tabular numbers** (`font-variant-numeric: tabular-nums`) | Alinea visualmente sin esfuerzo |

**Lo que NO va aquí:**
- KPIs ("tu meta de la semana"). María no es vendedora con cuota.
- Métricas de la tienda.
- "Próximos lanzamientos" — irá en otra pantalla.
- Gráficas.

**Comportamiento clave:**
- Tarjetas tienen swipe horizontal: ← *"Ya la contacté"*, → *"Posponer"*.
- Tap en tarjeta abre la ficha en el detail panel.
- Auto-refresh suave a las 6am cada día.

---

### 3.2. Búsqueda (siempre accesible)

**Función:** la acción más frecuente del día. Tiene que ser perfecta.

**Patrón: Command Bar tipo Linear / Superhuman**

```
┌──────────────────────────────────────────────────────┐
│  ⌘K     Buscar clienta...                            │
└──────────────────────────────────────────────────────┘
                          ↓ al abrir
┌──────────────────────────────────────────────────────┐
│  🔍  patty                                       ⌘K  │
├──────────────────────────────────────────────────────┤
│  CLIENTAS                                            │
│  · Patricia González          última visita hace 58d │
│  · Patty Martínez             última visita hace 12d │
│                                                      │
│  POR DESCRIPCIÓN                                     │
│  · "la señora del labial rojo"                       │
│    → Patricia González (sugerencia IA)               │
│                                                      │
│  ACCIONES                                            │
│  · + Crear clienta nueva "Patty..."          ⌘N      │
└──────────────────────────────────────────────────────┘
```

**Componentes:**

| Elemento | Componente | Justificación |
|---|---|---|
| Barra de búsqueda | **Command palette / cmdk** (la librería estándar — la usa Vercel, Linear, Raycast) | Patrón universal `⌘K` |
| Resultados | **Lista con grupos** (CLIENTAS, POR DESCRIPCIÓN, ACCIONES) | Scaneable, jerárquica |
| Item de resultado | **Lista item con texto principal + secundario** | Información sin abrumar |
| Sugerencia IA | **Pill / chip muted** con ícono ✨ | Distingue origen IA sin invadir |
| Atajos de teclado | **kbd badges** alineados a la derecha | Educan en uso del teclado |

**Comportamiento clave:**
- `⌘K` abre desde cualquier parte. `Esc` cierra.
- Resultados aparecen en **<80ms percibido** (latencia local first, IA second).
- Búsqueda fuzzy + semántica corriendo en paralelo (ver `10-ai-infrastructure.md`).
- Última búsqueda no se guarda — María empieza fresca cada vez.

**Lo que NO usar:**
- Modal centrado clásico. Command palette se ancla al top, deja contexto visible debajo.
- Botón de "Buscar" para ejecutar. La búsqueda es live.

---

### 3.3. Ficha de la clienta — LA pantalla del producto

**Función:** la pantalla que más se ve. Si solo perfeccionas una, esta.

**Estructura (top → bottom, scroll vertical):**

```
┌─────────────────────────────────────────────────────────┐
│  [Avatar 80px]  PATRICIA GONZÁLEZ                    ⋯ │
│                  47 años · Cliente desde 2022           │
│                  📞  · 📧  · WhatsApp                   │
│                                                          │
│  ════ contexto generado por IA ════                     │
│                                                          │
│  Última visita hace 58 días. Compra cada 60 días.       │
│  Le gustan los tonos cálidos y el sérum vitamina C.     │
│  Alérgica a fragancias cítricas. Su hija cumple 15      │
│  pronto.                                                 │
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │  ✨ Próximo paso sugerido                          ││
│  │  Mandarle un mensaje sobre el sérum vitamina C     ││
│  │  [ Ver borrador → ]                                ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
├─────────────────────────────────────────────────────────┤
│  NOTAS                                          + Nueva │
│                                                          │
│  · hace 12 días                                          │
│    Le gustó la nueva línea Lancôme pero le pareció      │
│    caro. Mencionó interés en regalo para hija (15).     │
│                                                          │
│  · hace 47 días                                          │
│    Vino con su mamá. Compró sérum vitamina C + ...      │
│                                                          │
│  (más notas, scroll dentro de la sección)               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  HISTORIA DE COMPRAS                                     │
│                                                          │
│  [img] Sérum Vitamina C 30ml      hace 58d    $1,200   │
│  [img] Labial Rouge Allure        hace 90d    $890     │
│  [img] Crema noche anti-edad      hace 120d   $1,650   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  PRÓXIMAS                                       + Agendar│
│                                                          │
│  · Sábado 15 de mayo, 4:00 PM — cita en tienda          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Componentes detallados:**

#### Header de identidad
| Elemento | Componente | Detalles |
|---|---|---|
| Avatar | Imagen circular 80px con fallback de iniciales | Borde 1px, no sombra |
| Nombre | `<h1>` 32px, font-weight 600 | Único `<h1>` de la pantalla |
| Sub-identidad | Texto secundario 14px, gris medio | Edad, antigüedad, separados por `·` |
| Canales de contacto | **Icon buttons** 44px (cumple HIG) | Tap → abre app nativa (Tel, Mail, WhatsApp) |
| Menú "⋯" | **Dropdown / popover** | Acciones secundarias (editar, eliminar, exportar) |

#### Bloque de contexto IA (la estrella)
| Elemento | Componente | Detalles |
|---|---|---|
| Contenedor | **Cita visual** sin card — `border-left` 3px color acento + padding | Distingue del resto sin parecer "feature de IA" |
| Texto | 17px, line-height 1.6, color principal | Suficiente importancia |
| Indicador de generación | Texto sutil arriba: *"Resumen"* con ícono ✨ pequeño | Honesto sobre origen sin presumir |
| Estado de carga inicial | **Skeleton de 3 líneas** con shimmer | Nunca pantalla vacía |

#### Próximo paso sugerido (call to action contextual)
| Elemento | Componente | Detalles |
|---|---|---|
| Card | **Card con borde 1px color acento muy tenue + ícono ✨** | Una sola en toda la pantalla |
| Acción | **Botón primario** "Ver borrador" | El único botón primary visible |
| Dismiss | **Tap-and-hold** o swipe → "ya lo hice" | Sin botón visible de cerrar |

#### Sección de notas
| Elemento | Componente | Detalles |
|---|---|---|
| Header de sección | Texto en caps, letterspacing, 12px, gris medio | Estándar Things 3 / Stripe |
| Botón "Nueva" | **Botón texto** "+ Nueva" alineado derecha | Quieto, no compite |
| Lista de notas | **Lista sin separadores duros** — separación por espacio + timestamp | No tabla |
| Timestamp | "hace 12 días" (humano, no fecha ISO) | Usar `date-fns` `formatDistanceToNow` |
| Cuerpo de nota | Texto principal 16px, line-height 1.5 | Máx 3 líneas, expandible con tap |
| Modo edición | Tap en nota → inline edit, no modal | Auto-save al perder foco |

#### Captura de nota nueva (componente especial)
| Elemento | Componente | Detalles |
|---|---|---|
| Trigger | Botón "+ Nueva" o tap en zona vacía | Cumple regla "cero clicks innecesarios" |
| Input | **Textarea autoexpandible** desde 2 líneas | Sin label — placeholder *"Lo que quieras recordar"* |
| Botón voz | **Icon button 44px** con ícono micrófono dentro del textarea | Esquina inferior derecha del input |
| Estado guardando | Texto gris claro *"Guardando..."* → *"Guardado"* | Aparece arriba del input, fade out |
| Indicador IA | Si se dictó por voz, después aparecen **chips inline** con datos extraídos | María confirma con tap |

#### Sección de compras
| Elemento | Componente | Detalles |
|---|---|---|
| Lista | **Lista con thumbnail** estilo Apple Music | Imagen 48×48, texto, fecha, precio derecha |
| Imagen del producto | 48×48, esquinas redondeadas 8px | Fallback a placeholder elegante si no hay |
| Precio | **Tabular numbers** | Alinea verticalmente la columna |
| Tap en compra | Abre **sheet desde abajo** con detalle del ticket | No navega a otra pantalla |

#### Sección de próximas
| Elemento | Componente | Detalles |
|---|---|---|
| Cita futura | **Item de lista con ícono** de calendario | Hora + lugar |
| Estado vacío | *"Agenda un follow-up"* con botón ghost | Invitación, no error |
| Botón agendar | **Tap → date picker nativo iOS** | No reinventar |

---

### 3.4. Conversación de mensajes

**Función:** mensajear a la clienta. Debe sentirse como WhatsApp, no como módulo de marketing.

**Estructura:**

```
┌─────────────────────────────────────────────────────────┐
│  [< back]  Patricia González                            │
│            En línea hace 2h                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                            Hola Patricia, quería     │  │
│                            avisarte que llegó el     │  │
│                            sérum que querías         │  │
│                                                hace 3d  │
│                                                          │
│  Qué bueno! ¿Cuánto cuesta?                            │
│  hace 3d                                                 │
│                                                          │
│                            $1,200 — te lo aparto?    │  │
│                                                hace 3d  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  ✨ Sugerencias                                          │
│  [ Hola Patricia, ¿cómo te ha ido con el sérum?... ]    │
│  [ Patricia, llegó un labial rojo nuevo... ]            │
│  [ Escribir de cero ]                                    │
├─────────────────────────────────────────────────────────┤
│  Escribir mensaje...                          [📎] [↑] │
└─────────────────────────────────────────────────────────┘
```

**Componentes:**

| Elemento | Componente | Detalles |
|---|---|---|
| Header | **Nav bar mínima** con avatar pequeño + nombre | "Último visto" si aplica |
| Burbujas de mensaje | **Bubble** alineadas a derecha (María) o izquierda (clienta) | Padding generoso, esquinas 16px |
| Color de burbujas | María: gris claro / clienta: blanco con borde | Sin azul brillante tipo iMessage — más sobrio |
| Timestamp | 12px, gris muy claro, debajo de la burbuja | Solo cuando hay gap >5 min |
| Indicador "escribiendo..." | Tres puntos animados | Solo si la integración de canal lo permite |
| Sugerencias IA | **Strip horizontal de chips** justo arriba del input | Scroll horizontal si pasan de 3 |
| Chip de sugerencia | **Chip de altura 36px**, fondo gris muy claro, borde sutil | Tap → texto al input (editable) |
| Input | **Textarea autoexpandible**, max 6 líneas | Crece hacia arriba |
| Botón enviar | **Icon button circular**, color acento solo cuando hay texto | Disabled visible cuando vacío |
| Adjuntar | **Icon button** (clip) → opciones: foto, producto del catálogo | Sheet desde abajo |

**Optimistic UI obligatorio:** el mensaje aparece en la conversación **antes** de que confirme el server.

---

### 3.5. Registro de clienta nueva

**Función:** capturar a una clienta sin interrumpir la conversación.

**Estructura:**

```
┌─────────────────────────────────────────────────────────┐
│  [✕]                                                    │
│                                                          │
│  Nueva clienta                                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │  Nombre                                            ││
│  │  Patricia González                                 ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  Opcional                                                │
│  ┌────────────────────────────────────────────────────┐│
│  │  Teléfono                                          ││
│  └────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────┐│
│  │  Email                                             ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│  ┌────────────────────────────────────────────────────┐│
│  │  Lo que quieras recordar de ella                   ││
│  │                                                    ││
│  │                                                    ││
│  └────────────────────────────────────────────────────┘│
│                                                          │
│                              [ Guardar ]                 │
└─────────────────────────────────────────────────────────┘
```

**Componentes:**

| Elemento | Componente | Detalles |
|---|---|---|
| Modal | **Sheet desde abajo** que cubre 70% del alto | iPad-friendly, no modal centrado |
| Cierre | Botón "✕" en top-left + swipe-down | HIG estándar |
| Campo nombre | **Input grande**, font 20px, único campo activo de inicio | Cursor auto-focus |
| Sección "Opcional" | Header `<h3>` 12px caps, gris medio | Visualmente desjerarquiza |
| Campos opcionales | Inputs estándar 17px | Sin marcador rojo de error |
| Área de notas | **Textarea autoexpandible**, mínimo 3 líneas | Sin label rígido |
| Botón guardar | **Primary button**, alineado bottom-right | Activo solo si hay nombre |
| Auto-save al cerrar | Si hay nombre, se guarda incluso al cerrar con ✕ | Sin perder trabajo |

---

## 4. Sistema de diseño — las primitivas

### 4.1. Tipografía

**Font stack:**
- **Display y body**: **Inter** (variable font) — usada por Vercel, Linear, Stripe. Geométrica, legible, neutra.
- **Tabular numbers**: `font-variant-numeric: tabular-nums` para precios, horas, fechas.

**Escala (rem, base 16px):**

| Token | Tamaño | Uso |
|---|---|---|
| `display` | 32px / 600 | Nombre de la clienta en su ficha |
| `title` | 24px / 600 | Headers de sección importantes |
| `body-lg` | 17px / 400 | Texto principal de ficha |
| `body` | 16px / 400 | Texto general |
| `body-sm` | 15px / 400 | Texto secundario |
| `caption` | 13px / 400 | Timestamps, captions |
| `eyebrow` | 12px / 600 / uppercase / tracking-wider | Headers de sección |

**Línea base de altura**: 4px. Todo padding/margin es múltiplo de 4.

### 4.2. Color

**Filosofía:** color usado con avaricia. El gris elegante es el rey. El color marca **una sola cosa** por pantalla.

**Tokens semánticos:**

| Token | Rol | Aproximación |
|---|---|---|
| `bg` | Fondo principal | Blanco puro / casi blanco |
| `surface` | Cards, sheets | Blanco con sombra ultra-sutil |
| `border` | Líneas divisorias | Gris muy claro |
| `text-primary` | Texto principal | Gris muy oscuro (no negro puro) |
| `text-secondary` | Texto secundario | Gris medio |
| `text-tertiary` | Captions, hints | Gris claro |
| `accent` | Acción primaria, indicador IA | **Un solo color** — sugerencia: un rojo L'Oréal muted, no brillante |
| `success` | Confirmaciones | Verde muted (raro) |
| `warning` | Atención (raro) | Ámbar muted |

**Cero gradientes. Cero glassmorphism. Cero sombras decorativas.**

### 4.3. Espaciado

Escala basada en 4px:
- `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

**Espaciado entre secciones de la ficha:** 32px. Suficiente para respirar, no tanto que pierdas contexto.

**Padding interno de cards:** 20-24px. Generoso, no apretado.

### 4.4. Radius

- Cards: **12px**
- Botones: **8px**
- Inputs: **10px**
- Avatares: 50% (circular)
- Imágenes de producto: **8px**

**Cero esquinas vivas.** Cero radius >16px (se ve juvenil).

### 4.5. Sombras

Solo 3 niveles:
- **Nivel 0**: sin sombra (default)
- **Nivel 1**: `0 1px 2px rgba(0,0,0,0.04)` — cards de la pantalla del día
- **Nivel 2**: `0 8px 24px rgba(0,0,0,0.08)` — sheets, popovers, command palette

---

## 5. Librería de componentes — qué adoptar

Dado que el stack es React 19 + Tailwind 4 + shadcn (según `apps/web/package.json`):

### 5.1. Base recomendada: **shadcn/ui + Base UI**

Ambos ya están en el repo (`@base-ui/react`, `shadcn`). Excelente decisión:
- **Base UI** (de los creadores de Radix/MUI): primitivas accesibles sin estilos.
- **shadcn/ui**: componentes copiables, no librería — control total.

### 5.2. Componentes específicos a usar

| Necesidad | Componente | Por qué |
|---|---|---|
| Command palette | **`cmdk`** (la librería de Paco Coursey, usada por Vercel/Linear) | Estándar de la industria |
| Toast / notificaciones | **`sonner`** (Emil Kowalski) | La mejor UX de toast del mercado |
| Date picker | **shadcn Calendar** sobre `react-day-picker` | Ya está en shadcn |
| Sheet (modal desde abajo) | **shadcn Sheet** sobre Base UI | Nativo iPad-feel |
| Popover / dropdown | **Base UI Popover** | Posicionamiento robusto |
| Avatar | **shadcn Avatar** con fallback de iniciales | Estándar |
| Skeleton | **shadcn Skeleton** | Para estados de carga |
| Textarea autoexpandible | **`react-textarea-autosize`** | Standalone, ligero |
| Animaciones de transición | **`framer-motion`** o **`motion/react`** | Para transiciones de pantalla 220ms |

### 5.3. Componentes específicos de clienteling que tendrás que construir

No existen en librerías genéricas; son tu propiedad intelectual visual:

1. **`<CustomerSummaryCard />`** — la card de "5 clientas hoy" con avatar, contexto IA, acción sugerida, swipe gestures.
2. **`<AIContextBlock />`** — el bloque de 3 líneas IA que aparece en la ficha. Maneja loading skeleton, streaming, hover state.
3. **`<NextStepCard />`** — la tarjeta de "próximo paso sugerido" con borde acento y CTA primaria.
4. **`<NoteItem />`** — item de nota con timestamp humano, tap-to-edit, auto-save indicator.
5. **`<PurchaseRow />`** — fila de compra con thumbnail, fecha humana, precio tabular.
6. **`<MessageBubble />`** — burbuja de mensaje con timestamps inteligentes.
7. **`<AISuggestionChip />`** — chip horizontal de sugerencia de mensaje IA.
8. **`<VoiceNoteRecorder />`** — recorder con waveform animado, estado de "escuchando", confirmación.
9. **`<CommandSearch />`** — wrapper de cmdk con grupos (clientas, descripción, acciones).

---

## 6. Estados — no se diseñan al final, se diseñan primero

Cada componente tiene 5 estados que deben existir desde el primer día:

| Estado | Cuándo aparece | Cómo se ve |
|---|---|---|
| **Default** | Estado normal | El diseño descrito arriba |
| **Loading** | Mientras IA o red trabajan | **Skeleton** con shimmer suave 1.5s loop |
| **Empty** | No hay datos aún | Mensaje invitando, NO error |
| **Error** | Algo se rompió | Mensaje humano + acción de retry, NO stack trace |
| **Offline** | Sin conexión | Banner sutil arriba "Sin conexión, se sincronizará" |

**Ejemplos concretos para la ficha:**

- **Nota: estado empty** → *"Aquí guardarás lo que quieras recordar de Patricia. Tap para escribir o usa el micrófono."*
- **Compras: estado empty** → *"Patricia aún no tiene compras registradas."*
- **AI context: estado loading** → 3 líneas de skeleton con shimmer + ícono ✨ rotando muy lento.
- **AI context: estado error** → *"No pude generar el resumen ahora. Tap para reintentar."* (no esconder).

---

## 7. Microinteracciones — donde vive la magia

Los detalles que separan "ok" de "no puedo soltarla". Cada uno tiene un por qué.

| Microinteracción | Comportamiento | Por qué |
|---|---|---|
| Auto-save de nota | Texto gris *"Guardando..."* → *"Guardado"* fade 400ms | Confianza sin interrumpir |
| Tap en card de cliente sugerido | Card "presiona" 2px scale 0.98 → libera | Feedback táctil HIG |
| Apertura de ficha | Cross-fade 220ms del sidebar al detail | Continuidad espacial |
| Sugerencia IA aparece | Slide-in desde abajo + fade, 180ms | No invasivo |
| Mensaje enviado | Burbuja aparece con scale 0.95 → 1, optimistic | Velocidad percibida |
| Streaming de resumen IA | Texto aparece palabra por palabra mientras llega | "Está pensando" sin spinners |
| Búsqueda con resultados | Resultados aparecen en lista con stagger 30ms cada uno | Movimiento orgánico |
| Swipe en card de día | Resistencia + snap, color del fondo cambia | iOS-native feel |
| Confirmación háptico | Tap suave en confirmaciones importantes | HIG `light` impact |

---

## 8. Distribución de información — la regla de oro

> **Lo que María necesita en este momento, arriba. Lo que podría necesitar, abajo. Lo que casi nunca necesita, no.**

Aplicado a la ficha:

| Posición | Información | Frecuencia de uso |
|---|---|---|
| Top (sin scroll) | Nombre, avatar, contexto IA, próximo paso | **Cada vez que abre la ficha** |
| Mid (1 scroll) | Notas recientes | Muy frecuente |
| Bottom (2+ scroll) | Historia de compras, citas pasadas | Frecuente |
| Detrás de "⋯" | Editar datos, exportar, eliminar | Raro |
| **NO existe** | Métricas de LTV, scoring, segmentos | Innecesario para piso |

---

## 9. Responsive — adaptación a contextos

### iPad horizontal (1280×848) — diseño primario
Split view 320+resto. Todas las features visibles.

### iPad vertical (820×1180)
Sidebar colapsa a drawer. Ficha ocupa todo el ancho.

### iPhone (futuro fase 2)
Stack navigation. La pantalla del día y la ficha se navegan, no se ven simultáneamente.

### Desktop web (admin / gerentes)
La sidebar puede ser más ancha. Aparecen métricas agregadas (esa pantalla es **para gerentes, no para María** — UI distinta, otro documento).

---

## 10. Accesibilidad — no opcional

- **Contraste mínimo WCAG AA**: 4.5:1 para texto normal, 3:1 para texto grande.
- **Focus visible**: anillo de 2px color acento en cualquier elemento navegable por teclado.
- **Aria labels** en todos los icon-only buttons.
- **Tamaño mínimo de tap target**: 44×44pt (HIG).
- **VoiceOver**: las cards anuncian "Patricia González, próximo paso: mandarle mensaje sobre sérum".
- **Reduce motion**: si el usuario tiene la preferencia activa, todas las animaciones bajan a 80ms con linear easing.

---

## 11. Anti-patrones que evitamos (importante documentarlos)

Cosas que veo en clienteling apps actuales que **no haremos**:

1. ❌ **Tabs en la ficha del cliente** — fragmenta la información. Una sola página scrolleable.
2. ❌ **Hamburger menu en iPad** — hay espacio. Sidebar visible.
3. ❌ **Modales centrados grandes** — sheets desde abajo siempre.
4. ❌ **Bordes pesados entre cards** — espacio blanco + tipografía.
5. ❌ **Gráficas de "trends" en la ficha** — María no usa eso.
6. ❌ **Botones de "compartir" / "exportar" prominentes** — accesibles vía `⋯`, no primary.
7. ❌ **"AI assistant" como avatar con nombre** — la IA es invisible.
8. ❌ **Onboarding tour** — la app se explica sola.
9. ❌ **Empty states con ilustraciones grandes** — texto invitando, máximo un ícono pequeño.
10. ❌ **Colores brillantes para "engagement"** — sobriedad gana.

---

## 12. Inspiración visual de referencia

Si necesitas mostrar a stakeholders cómo se siente esto:

| App | Qué tomar | Qué evitar |
|---|---|---|
| **Things 3** | Listas, tipografía, jerarquía suave, headers de sección | Densidad de check items |
| **Linear** | Command bar, atajos de teclado, sidebar colapsible, sutileza | Estética "developer-first" oscura |
| **Superhuman** | Velocidad percibida, keyboard-first, AI sugerencias | Curva de aprendizaje |
| **Stripe Dashboard** | Cards de KPI, tipografía, espaciado, profesionalismo | Densidad B2B |
| **Apple Mail (iPad)** | Split view master-detail, navegación | Look corporativo Apple |
| **Notion** | AI inline (recomendaciones que aparecen al escribir), bloques | Complejidad de configuración |
| **Raycast** | Command palette con grupos, IA inline | No es para iPad |

**Mood board en una frase:** Things 3 + Linear command bar + Stripe profesionalismo + IA al estilo Notion (susurrante).

---

## 13. Checklist de validación visual

Antes de declarar lista una pantalla, debe pasar todas:

- [ ] ¿Hay UNA sola estrella en la pantalla? (Un solo elemento dominante.)
- [ ] ¿Las 3 cosas más importantes están en el primer viewport?
- [ ] ¿Cada elemento tocable es ≥44×44pt?
- [ ] ¿La información está agrupada en ≤9 bloques?
- [ ] ¿La jerarquía tipográfica usa ≤3 tamaños?
- [ ] ¿Existe el estado loading, empty, error y offline?
- [ ] ¿Cumple WCAG AA de contraste?
- [ ] ¿La animación más larga dura ≤240ms?
- [ ] ¿Quitarías algo si pudieras? (Si sí, **quítalo**.)
- [ ] ¿María lo entendería en 3 segundos sin que le expliques?

---

## 14. Siguiente paso

Este documento describe el **qué y dónde** de la UI. Lo que sigue:

1. **Mockups en alta fidelidad** (Pencil/Figma) de las 5 pantallas críticas siguiendo esta guía.
2. **Tokens de diseño** en código (`tokens.css` o `theme.ts`) implementando la sección 4.
3. **Storybook** (o Ladle) con los 9 componentes custom de la sección 5.3 — cada uno con sus 5 estados (sección 6).
4. **Friction log semanal**: validar que cada pantalla pasa el checklist de la sección 13.

---

> *La UI no es decoración del producto. La UI es el producto que María toca.*
> Cada decisión arriba se mide contra una pregunta: **¿esto la hace mejor en su trabajo, o solo se ve bonito?**
