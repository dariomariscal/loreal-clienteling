# UX Vision — L'Oréal Clienteling

> *"Design is not just what it looks like. Design is how it works."* — Steve Jobs
>
> Este documento describe la experiencia **antes que la implementación**. Cuenta cómo se siente, qué se ve, qué se escucha, qué pasa en la mente de la consultora — sin una sola línea de código. Los ingenieros lo harán posible después.

---

## 0. Para quién diseñamos

No diseñamos para "consultoras de belleza en general". Diseñamos para **María**.

María tiene 34 años. Trabaja en el counter de L'Oréal en un Liverpool de Polanco. Lleva 6 años en belleza. Conoce a sus top 40 clientas por nombre, perfume y conversaciones pasadas. Tiene una libreta Moleskine donde apunta cosas como *"Sra. Patricia — alérgica a fragancias cítricas, le gusta el rojo mate, viene siempre los jueves antes de comer"*. La libreta es su tesoro.

Su sábado promedio: 11:00am, la tienda llena. Una clienta nueva entra preguntando por una rutina. Mientras la atiende, llega la Sra. Patricia — su clienta de hace 4 años — sin cita. Sigue una llamada de WhatsApp de otra clienta preguntando si llegó el labial nuevo. María tiene **30 segundos** entre cada interacción para recordar, anotar y prepararse.

**Hoy María no usa el CRM corporativo.** Lo intentó. Tarda en cargar, le pide 12 campos, y para cuando termina la clienta ya se fue.

Esta app es **para María**. Si funciona para ella en su sábado peor, funcionará para todas.

---

## 1. La tesis central

> **La app no es la protagonista. María y su clienta son las protagonistas. La app desaparece para que la relación brille.**

Cada decisión de diseño se mide contra una sola pregunta:

> **¿Esto hace que la próxima interacción con la clienta se sienta más fluida — o solo se ve bonito en una demo?**

Si la respuesta no es claramente lo primero: fuera.

---

## 2. Los 7 principios que rigen todo

### 2.1. Invisible como un buen mayordomo
La app no pide atención. No celebra sus propias acciones. No tiene notificaciones de "¡bienvenida!". No tiene tours. Si ves la app, fallamos. Si solo ves a la clienta, ganamos.

### 2.2. Diseñada para María, no para un mercado
Cada pantalla se prueba contra el sábado de María. Si en su sábado no aporta — no existe.

### 2.3. Velocidad es respeto
Cada milisegundo de lag es una micro-falta de respeto a María. **Las 5 acciones críticas responden en menos de 200ms**, percibido como instantáneo. No negociable.

### 2.4. Menos, pero mejor
3 features perfectas vencen a 30 mediocres. La duda no agrega — quita.

### 2.5. El idioma es el de María
"Clienta", no "lead". "Ficha", no "perfil de usuario". "Cita", no "appointment". "Nota", no "annotation". El idioma de la app es el idioma del piso.

### 2.6. La IA susurra, nunca grita
La IA aparece como sugerencia inline donde María ya está trabajando. Nunca como chatbot. Nunca decide sola. Siempre editable. Siempre reversible.

### 2.7. Los detalles invisibles son la diferencia
El estado vacío. El hover. El timing de la transición. El feedback del auto-save. Ahí vive la magia. Devour them.

---

## 3. La experiencia, paso a paso

A continuación se describe **lo que María vive** al abrir la app un sábado a las 11am. Sin pantallas, sin componentes — solo la experiencia.

### 3.1. El momento cero — María saca el iPad

María saca el iPad de debajo del counter. Lo desbloquea. La app **ya está abierta donde la dejó**. No hay pantalla de carga. No hay splash. No hay "bienvenida María". No hay notificación de "tienes 12 mensajes nuevos".

Lo que ve: **la pantalla del día**.

> *Sensación buscada: continuidad. La app respeta que su tiempo ya empezó.*

---

### 3.2. La pantalla del día — el centro de gravedad

En la mitad superior de la pantalla, una sola pregunta respondida:

> **"Hoy importan estas 5 clientas."**

No 50. No 200. **5.** Priorizadas por la IA, pero presentadas como sugerencia humana, no como ranking.

Cada una se muestra como una **tarjeta** que cabe en el campo visual sin scroll. Cada tarjeta tiene:

- **Foto** (si existe) o iniciales con color suave.
- **Nombre** como María lo diría: "Patricia González" o "Sra. Patricia" si así está guardada.
- **Una sola línea de contexto humano**, generada por IA: *"Compró rutina anti-edad hace 58 días. Probablemente se le está acabando el sérum."*
- **Una acción sugerida**, redactada en lenguaje natural: *"Mandarle un mensaje hoy."*

La tarjeta no tiene 8 botones. Tiene una zona principal (tap → abre la ficha) y un gesto secundario (swipe → "ya la contacté").

> *Sensación buscada: claridad inmediata. María en 3 segundos sabe a quién contactar primero.*

En la mitad inferior, otro bloque silencioso:

> **"3 citas hoy."**

Lista simple, hora y nombre. Tap → abre la ficha de esa clienta **ya preparada** para la cita.

Nada más. Sin métricas. Sin dashboards. Sin "tu progreso semanal". María no es una vendedora con cuota — es una consultora con clientas. La app la trata como tal.

---

### 3.3. Buscar a una clienta — el momento más frecuente del día

María toca la barra de búsqueda. El teclado aparece. **El cursor ya está activo.** (Detalle invisible #1.)

Mientras escribe, los resultados aparecen instantáneamente — no después de un debounce de 300ms. Aparecen en **80ms**. (Detalle invisible #2.)

La búsqueda es **fuzzy y tolerante**:
- "patty" encuentra a "Patricia González".
- "la señora del labial rojo" encuentra a Patricia (búsqueda semántica sobre notas).
- "patrcia" (con typo) encuentra a Patricia.
- "55 1234" encuentra a quien tenga ese teléfono.

Si María titubea, después de 2 segundos sin escribir, aparece **una sugerencia suave** abajo:

> *"¿Buscas a Patricia González? La viste hace 58 días."*

No un pop-up. No un modal. Un susurro.

> *Sensación buscada: la app conoce a sus clientas tanto como ella.*

---

### 3.4. La ficha de la clienta — la pantalla más importante de la app

Esta es **la pantalla del producto**. Si solo perfeccionas una, perfecciona esta.

María toca a Patricia González. La ficha se abre con una **transición de 220ms** que da continuidad — no un corte abrupto, no una animación presumida. (Detalle invisible #3.)

**Lo primero que ve**, antes de cualquier otra cosa, son **3 líneas de contexto** generadas por IA, escritas como las escribiría una colega:

> *"Patricia, 47 años. Última visita hace 58 días. Compra cada 60 días en promedio.*
> *Le gustan los tonos cálidos y el sérum vitamina C. Es alérgica a fragancias cítricas.*
> *Probablemente busca reabastecer el sérum. Mencionó interés en el labial rojo mate la última vez."*

Estas 3 líneas son **el corazón del clienteling**. María en 4 segundos ya sabe qué decir.

Debajo, la ficha se organiza en **4 secciones, no más**, en este orden:

**1. Próximo paso sugerido**
Una sola tarjeta. *"Mandarle un mensaje sobre el sérum vitamina C."* Botón: *"Ver borrador"*. Al tocarlo, la IA muestra un mensaje pre-redactado en el tono de María (aprendido de sus mensajes pasados). María edita 2 palabras. Envía.

**2. Notas**
Lista vertical, cronológica inversa. Cada nota es una línea o dos. La más reciente arriba. Para agregar una nota: **un solo tap en el área de notas, el teclado aparece, el cursor ya está activo**. María escribe: *"Le gustó muchísimo la nueva línea de Lancôme, pero dijo que el precio le parecía alto"*. **No hay botón de guardar.** A los 2 segundos sin escribir, aparece un texto gris muy sutil: *"Guardado."* (Detalle invisible #4.)

Alternativa: María toca el ícono del micrófono. Habla. *"Patricia mencionó que su hija va a cumplir 15 y está buscando un regalo, le interesa algo de Lancôme rosa."* Al terminar, la IA muestra la nota **estructurada**:

> *Mencionó: cumpleaños hija (15 años), busca regalo. Producto de interés: Lancôme línea rosa.*

María revisa. Toca confirmar. La nota queda guardada **y** los datos relevantes (cumpleaños de hija, intención de compra) se asocian al perfil de Patricia.

**3. Historia de compras**
Lista visual, no tabla. Cada compra es una línea con la foto del producto, la fecha en lenguaje humano (*"hace 58 días"*, no *"2026-03-25"*), y el precio. Tap a una compra → ve el ticket completo.

**4. Próximas citas / contactos**
Si hay cita agendada, aparece. Si no, una zona vacía elegante que dice: *"Agenda un follow-up"*. Tap → calendario simple. Sin modal de 6 campos. Solo: cuándo, opcional una nota de "¿de qué?".

**Lo que no está en la ficha:**
- Tabs. La ficha es una sola página scrolleable.
- "Más opciones" con submenús. Si una acción importa, está visible. Si no, no existe.
- Métricas. ("LTV de la clienta", "score de engagement"). María no necesita eso para atender bien.
- Botones de exportar, compartir, imprimir. No es lo que importa hoy.

> *Sensación buscada: María se siente más inteligente al usarla. No abrumada — empoderada.*

---

### 3.5. Capturar una nueva clienta — la primera vez que se conocen

Una clienta nueva llega al counter. María quiere registrarla **sin interrumpir la conversación**.

Toca un único botón flotante: **+ Clienta nueva**. Aparece una pantalla **deliberadamente mínima**:

- **Un solo campo activo**: nombre.
- Tres campos más abajo, **opcionales, en gris suave**: teléfono, email, cumpleaños.
- Un área de notas, vacía, etiquetada solo como: *"Lo que quieres recordar de ella."*

María escribe el nombre. No llena nada más. Toca *"Guardar"* (o simplemente sale — auto-save). La clienta está registrada. **Todo lo demás se va llenando con el tiempo, cuando importe.**

No hay un wizard de 5 pasos. No hay "tipo de cliente / segmento / canal preferido". Eso lo decide la IA con el tiempo, o María lo agrega cuando lo necesite.

> *Sensación buscada: cero fricción para empezar una relación. La relación crece, los datos también — no al revés.*

---

### 3.6. La cita — el momento del valor real

Patricia tiene cita hoy a las 4pm. A las 3:55, María abre la ficha de Patricia.

Arriba aparece un **bloque sutil**, distinto al normal:

> **"Cita en 5 minutos."**
>
> *Última vez le interesó: sérum vitamina C, labial rojo mate.*
> *Le platicaste de la nueva línea Lancôme.*
> *Su hija cumple 15 pronto.*

Estos son **los 3 datos de contexto** que María necesita para que la cita se sienta personal — no una transacción.

Durante la cita, María puede tocar un botón discreto: **"Empezar nota de cita"**. Eso abre el dictado por voz **en modo escucha pasiva** — María atiende normal, hablando con Patricia. Al final de la cita, toca *"Terminar"*. La IA presenta una nota estructurada con lo que extrajo:

- Productos discutidos.
- Decisiones de compra.
- Cosas a recordar.
- Próximo follow-up sugerido.

María revisa. Edita. Confirma. **Cero formularios.**

> *Sensación buscada: la app captura la conversación sin estorbarla.*

---

### 3.7. Los mensajes — la mayor parte del clienteling fuera de tienda

María quiere mandarle un mensaje a Patricia.

Desde la ficha, toca *"Mensaje"*. Aparece **una pantalla de conversación tipo WhatsApp**, no un módulo de "campaign". Toda la historia de mensajes con Patricia está ahí — SMS, WhatsApp, email — unificada.

Arriba del input de mensaje, **3 sugerencias** generadas por IA, en formato chip:

- *"Hola Patricia, ¿cómo te ha ido con el sérum? Ya casi se debe estar acabando."*
- *"Patricia, llegó un labial rojo mate nuevo que creo te va a encantar."*
- *"Empezar de cero."*

María toca la primera. El texto aparece en el input — **editable**. María cambia *"Hola"* por *"Buenas tardes"*. Envía.

El mensaje sale. **La conversación se actualiza al instante** — no después de un round-trip de 800ms. (Detalle invisible #5: optimistic UI.)

> *Sensación buscada: mensajear se siente personal, no como "hacer marketing".*

---

### 3.8. Cuando algo se rompe — el momento de la verdad

Internet se cae. La tienda tiene mala señal.

La app **sigue funcionando**. María puede:
- Buscar clientas (caché local).
- Ver fichas completas.
- Agregar notas (se sincronizan cuando vuelva el internet).
- Agendar citas.

Lo único que no puede hacer: enviar mensajes. Y ahí aparece un texto sutil arriba: *"Sin conexión. Los mensajes se enviarán cuando vuelva."* No un banner rojo de error. No un modal bloqueante. Un susurro informativo.

Cuando vuelve la conexión: **nada explota**. Todo se sincroniza solo. María nunca pierde una nota. (Detalle invisible #6.)

> *Sensación buscada: la app es confiable como una libreta. La libreta nunca se rompe.*

---

## 4. La estética — cómo se ve sin describir colores

La app **se siente como un objeto de lujo discreto**: como un cuaderno Moleskine, no como un dashboard.

- **Espacios amplios**. Cada elemento respira. No hay densidad de información innecesaria.
- **Tipografía con jerarquía clara**: 3 tamaños máximo en una pantalla. El nombre de la clienta es lo más grande. Todo lo demás es secundario.
- **Color usado con avaricia**. Los acentos son raros, por eso pesan. El gris elegante es el rey. El blanco es el lienzo. El color marca **una sola cosa**: la acción sugerida del momento.
- **Sin sombras decorativas. Sin gradientes presumidos. Sin glassmorphism.** Esa estética envejece. Buscamos atemporal: Rams, no Dribbble.
- **Animaciones de 180-240ms** en transiciones, con curva de easing natural. Nunca más rápidas (se sienten bruscas), nunca más lentas (se sienten torpes).
- **Iconos solo cuando ayudan a entender**. Nunca decorativos.
- **Foto del producto siempre que se hable de un producto**. Las consultoras piensan en visual, no en SKUs.

> *Referencia visual mental: Linear + Stripe + Things 3, ejecutado para piso de venta de belleza.*

---

## 5. El sonido y el háptico

Sí, esto importa. Los detalles invisibles incluyen los sonidos.

- **Auto-save**: háptico sutil de "tick" cuando se guarda. Sin sonido.
- **Mensaje enviado**: un solo "swoosh" muy suave. Una vez. Nunca repetido.
- **Sugerencia de IA aceptada**: háptico de confirmación leve.
- **Error real** (pago rechazado, no internet flaky): un sonido descendente discreto. No alarma.
- **Todo lo demás: silencio.** La app no hace ruido en piso.

---

## 6. Lo que la app NO hace — la lista del "no"

Tan importante como lo que hace, es lo que **se niega a hacer**:

- **No tiene gamification.** María no gana puntos por agregar clientas. Es una profesional, no una niña.
- **No tiene leaderboards.** Las consultoras se comparan en la vida real — no necesitan que la app las jerarquice.
- **No tiene "modo experto" vs "modo principiante".** Una sola app, bien diseñada.
- **No tiene configuración para personalizar el dashboard.** La opinión del producto es la opinión.
- **No tiene chat con IA.** La IA sirve en contexto, no como interlocutora.
- **No tiene exportación a Excel** desde el primer día. Si alguien lo pide, pregúntate por qué.
- **No tiene notificaciones push** que no sean iniciadas por una clienta real (un mensaje recibido). Nada de *"María, no has contactado a 5 clientas hoy"*. Eso es ansiedad disfrazada de productividad.
- **No tiene onboarding tour.** Si requiere tour, está mal diseñada.
- **No tiene tema oscuro como prioridad.** Optimizamos un solo tema, perfecto, antes de duplicar el trabajo.
- **No tiene customización de campos** del cliente. Diseñamos los 5 campos que importan. Bien.

---

## 7. Las 5 acciones críticas que deben ser perfectas

Si tienes que decidir dónde poner energía obsesiva — aquí:

1. **Buscar una clienta** — la acción más frecuente. <100ms. Fuzzy. Semántica.
2. **Abrir la ficha de una clienta** — la pantalla más vista. <200ms. Resumen IA arriba.
3. **Agregar una nota** — el comportamiento más valioso. Cero fricción. Voz o texto. Auto-save.
4. **Mandar un mensaje** — el output principal. Sugerencias IA. Optimistic UI.
5. **Registrar una clienta nueva** — la puerta de entrada. Un solo campo obligatorio.

Todo lo demás es secundario. Si las 5 anteriores son joyas, la app es buena.

---

## 8. El rol de la IA — el copiloto invisible

La IA no es una feature. **La IA es un asistente invisible** que hace 4 cosas, todas dentro del flujo natural:

### 8.1. Captura sin formularios
María habla o escribe libre. La IA extrae estructura. Nunca al revés.

### 8.2. Resumen contextual
Al abrir una ficha, las 3 líneas de contexto son IA. Nunca María tiene que leer 50 datos.

### 8.3. Sugerencias inline
En la pantalla del día: a quién contactar. En mensajes: qué decir. En notas: cómo estructurar lo que dictó.

### 8.4. Búsqueda semántica
Encuentra clientas por descripción difusa, no solo por nombre exacto.

**Lo que la IA NO hace:**
- No envía mensajes sola.
- No decide citas sola.
- No clasifica clientas en segmentos sin que María lo vea.
- No corrige a María.
- No habla en primera persona ("Hola, soy tu asistente").
- No tiene un avatar. No tiene un nombre. **No existe como personaje.** Solo existe como ayuda.

---

## 9. La filosofía en una línea

> **Diseñamos para María, en un sábado real, con una clienta que importa. La app es invisible, rápida y honesta. Menos, pero mejor.**

---

## 10. Cómo medimos si lo logramos

No con dashboards de adopción. Con **3 preguntas a María después de 2 semanas de uso**:

1. *"¿Tu libreta Moleskine sigue ganándole a la app?"*
   Si dice sí, fallamos.

2. *"¿Hay algo en la app que te haya hecho sentir bruta o lenta?"*
   Si dice sí, hay que arreglarlo esta semana.

3. *"¿Le recomendarías la app a tu compañera del counter de al lado?"*
   Si lo dice sin dudar — ganamos.

---

## 11. Próximos pasos (lo que sigue después de este documento)

Este documento es la **constitución de la UX**. Lo que sigue, en orden:

1. **Validar la persona** (María). Idealmente con una consultora real, aunque sea 30 minutos. Si no es posible para la demo: validar al menos con stakeholders de L'Oréal que conocen el piso.
2. **Diseñar las 5 pantallas críticas** en alta fidelidad (Pencil/Figma):
   - Pantalla del día
   - Búsqueda
   - Ficha de clienta
   - Conversación de mensajes
   - Registro de clienta nueva
3. **Auditar el código existente** contra esta visión. Identificar qué quitar, qué pulir, qué construir.
4. **Implementar las 5 acciones críticas** primero. Todo lo demás puede esperar.
5. **Friction log semanal**: el equipo usa la app simulando ser María. Cada fricción se cierra antes de la siguiente.

---

> *"Get closer than ever to your customers. So close that you tell them what they need well before they realize it themselves."* — Steve Jobs

Esta app le dice a María lo que necesita antes de que ella tenga que pedirlo.
