# AI Infrastructure — L'Oréal Clienteling

> Este documento define **qué proveedores y frameworks** harán posible la visión de IA descrita en `09-ux-vision.md`.
> No es teoría: cada elección está mapeada a un caso de uso real del documento de UX.

---

## 1. Principios para elegir infraestructura

Antes de proveedores, los principios que guían cada decisión:

1. **Latencia es UX.** Si la IA tarda >2s en responder, rompe la sensación "invisible". Cada elección debe optimizar para tiempo a primer token, no solo throughput.
2. **Streaming por default.** Nada bloqueante. Todo se ve aparecer mientras se genera.
3. **Stack alineado con el repo actual.** Next.js 15 + React 19 + TanStack Query → la elección natural es la que se integra sin fricción.
4. **Calidad de outputs estructurados.** La mayoría de los casos de uso (notas, resúmenes, sugerencias) exigen JSON consistente. Modelos que no lo hacen bien quedan fuera.
5. **Costo controlable a escala.** Una consultora top abrirá 200 fichas/día. Las llamadas IA se multiplican rápido.
6. **Privacidad de datos de clientas.** Datos personales (alergias, preferencias, compras) — el proveedor debe tener controles de retención y opt-out de entrenamiento. **No negociable.**
7. **Caching agresivo.** Resúmenes que no cambian no se regeneran. Embeddings que no cambian no se recalculan.

---

## 2. Mapa: casos de uso → tecnología

Cada caso de uso del documento de UX necesita una pieza distinta. Esta es la correspondencia:

| Caso de uso (de `09-ux-vision.md`) | Tecnología | Justificación corta |
|---|---|---|
| 3.4 Resumen contextual del cliente (3 líneas IA) | **Claude Sonnet 4.6** vía Anthropic SDK + Vercel AI SDK | Consistencia en outputs estructurados |
| 3.4 Captura por voz → nota estructurada | **Deepgram Nova-3** (transcripción) + **Claude Sonnet 4.6** (estructuración) | Deepgram lidera en español para audio ruidoso de piso |
| 3.6 Cita: modo escucha pasiva | **Deepgram streaming** (real-time) | Streaming WebSocket sub-segundo |
| 3.3 Búsqueda semántica de clientas | **pgvector** (Postgres) + embeddings **OpenAI text-embedding-3-small** | Stack ya tiene Postgres; pgvector es la opción de menor fricción <10M vectores |
| 3.2 "5 clientas importan hoy" (Opportunity Engine) | **Cron job + Claude Sonnet 4.6 batch** | Pre-computado nocturno, no en runtime |
| 3.7 Sugerencias de mensajes inline | **Claude Haiku 4.5** (rápido) vía Vercel AI SDK streaming | Haiku 4.5 da latencia <500ms primer token |
| 3.5 Auto-extracción de datos al crear clienta | **Claude Sonnet 4.6** con structured outputs | Mejor consistencia JSON del mercado |
| Tono de marca aprendido | **Few-shot prompts con caching** (Anthropic prompt caching) | Reduce costo 90% en prompts repetitivos |

---

## 3. La capa de orquestación — Vercel AI SDK

### Por qué Vercel AI SDK y no LangChain

El stack ya es Next.js 15. Vercel AI SDK fue diseñado exactamente para este caso:

- **Reduce ~100 líneas de boilerplate de streaming a ~20.** Hooks como `useChat`, `useCompletion`, `useObject` eliminan estado manual.
- **Latencia menor en producción**: ~30ms p99 vs ~50ms p99 de LangChain en benchmarks de 100 req concurrentes.
- **No es opinionado sobre el provider.** Cambias de Claude a GPT a Gemini con una línea.
- **Streaming objects estructurados** (no solo texto) — perfecto para nota dictada → JSON estructurado en tiempo real.
- **Server Actions de Next.js 15 funcionan nativo** — el resultado del LLM viaja por el mismo canal que el resto de los datos.

### Lo que NO usamos

- **LangChain / LangGraph**: pesado, abstracciones que no necesitamos para los flujos de esta app. Solo tendría sentido si construyéramos agentes multi-step complejos, que **no es el caso aquí** (la visión es IA susurrante, no agéntica).
- **OpenAI SDK directo**: amarra a un solo proveedor; perdemos flexibilidad.

### Patrón canónico que aplicaremos

```
Cliente (React 19) 
  → useChat / useObject (Vercel AI SDK)
  → Server Action (Next.js 15)
  → streamObject() con schema Zod
  → Anthropic provider
  → Claude Sonnet 4.6 / Haiku 4.5
```

Todo streaming. Todo type-safe con Zod (que ya está en el repo).

---

## 4. Los modelos — qué LLM para qué cosa

### Claude Sonnet 4.6 — el caballo de batalla

**Cuándo usarlo:**
- Resúmenes contextuales del cliente (las 3 líneas que ve María al abrir la ficha).
- Extracción estructurada de notas dictadas (audio → JSON con campos: alergias, preferencias, próximo follow-up).
- Sugerencias del Opportunity Engine (batch nocturno: qué 5 clientes priorizar mañana).
- Cualquier tarea que necesite **consistencia JSON** sobre múltiples llamadas.

**Por qué:**
- Lidera consistencia de structured outputs en benchmarks 2026.
- Anthropic Constitutional AI produce outputs predecibles — crítico cuando el JSON va directo a UI.
- 79.6% en SWE-bench Verified vs ~33% de GPT-4o — el ecosistema entero apunta a Sonnet para tareas serias.

**Costo aproximado:** ~$3 input / $15 output por 1M tokens. Con caching de prompts (ver §7), baja ~90% en prompts repetitivos.

### Claude Haiku 4.5 — la velocidad

**Cuándo usarlo:**
- Sugerencias inline de mensajes (los 3 chips arriba del input). María necesita ver el primer chip en <500ms.
- Búsqueda semántica re-ranking (sobre resultados de pgvector).
- Cualquier UI donde la latencia percibida sea más importante que la profundidad.

**Por qué:**
- Tiempo a primer token <300ms típico.
- Calidad suficiente para sugerencias cortas.
- ~12x más barato que Sonnet.

### OpenAI text-embedding-3-small — los embeddings

**Cuándo usarlo:**
- Vectorizar notas, perfiles de clientes, descripciones de productos.
- Solo embeddings — no generación. Aquí OpenAI sigue siendo el estándar por costo/calidad.

**Por qué:**
- 1536 dims, $0.02 por 1M tokens (despreciable).
- Calidad competitiva con embeddings más caros para nuestra escala.
- Compatible con cualquier vector store.

### Lo que NO usamos (y por qué)

- **GPT-4o** como modelo principal: superado por Sonnet 4.6 en structured outputs, que es lo que más hacemos.
- **Gemini**: excelente para contexto masivo (1M tokens), pero **no es nuestro problema** — no procesamos documentos largos.
- **Modelos open-source locales (Llama, Mistral)**: el ahorro de costo no compensa la operación. Si el costo se vuelve problema, evaluamos en fase 2.

---

## 5. Voz — el componente más subestimado

La visión describe captura por voz en dos modos: **activa** (nota dictada después) y **pasiva** (escucha durante cita). La diferencia técnica importa.

### Deepgram Nova-3 — la elección

**Por qué Deepgram y no Whisper ni AssemblyAI:**

- **Español rioplatense + mexicano**: Deepgram tiene optimización específica por dialecto. Whisper degrada en audio ruidoso de piso.
- **Streaming real-time** (WebSocket): para el modo escucha pasiva durante cita. Whisper API no es streaming nativo.
- **WER <7%** en audio del mundo real (no benchmarks limpios).
- **Diarización** (separar quién habla): la consultora vs la clienta — clave para que las notas extraídas sean correctas.
- **Latencia <300ms** para chunks de audio en streaming.

**Costo:** ~$0.0043/min de audio. Una cita de 20 min cuesta ~9 centavos. Despreciable.

### Patrón de uso

**Modo activo (María dicta una nota):**
1. Botón micrófono → graba audio local.
2. Al terminar → envía blob a Deepgram (batch, no streaming).
3. Transcripción regresa en ~2-3s.
4. Texto va a Claude Sonnet con prompt: *"extrae preferencias, alergias, productos mencionados, próximo follow-up de esta nota: {texto}"*.
5. UI muestra nota estructurada para confirmar.

**Modo pasivo (escucha durante cita):**
1. María toca *"Empezar nota de cita"*.
2. Audio se streamea a Deepgram via WebSocket — transcripción en vivo (no se muestra, solo se acumula).
3. Diarización separa consultora vs clienta.
4. Al terminar → texto completo va a Claude Sonnet con prompt de extracción enriquecido (incluye contexto del perfil de la clienta).
5. UI muestra resumen estructurado.

**Privacidad:** Deepgram tiene HIPAA/SOC2; configuramos retención = 0 (no guardan audio después de procesarlo).

---

## 6. Búsqueda semántica — pgvector, no Pinecone

### Por qué pgvector

El stack ya usa Postgres (vía Drizzle, según `@loreal/database`). Agregar otra base de datos vectorial es complejidad innecesaria.

**Ventajas concretas:**
- **JOIN con tablas relacionales**: buscar *"clientas que compraron sérum vitamina C en últimos 60 días Y mencionan piel sensible"* es una query nativa SQL + vector. En Pinecone tendrías que orquestar dos sistemas.
- **Latencia 8-25ms p95** para <10M vectores. Vamos a estar muy por debajo.
- **Costo: ~$30/mes** vs ~$180/mes Pinecone para mismo workload.
- **Una transacción atómica**: nota nueva + embedding nuevo + perfil actualizado, todo en una transacción. Imposible con vector store separado.

### Cuándo migraríamos a Pinecone / Turbopuffer

Solo si llegamos a **>10M vectores** (probablemente nunca para este caso de uso) o si necesitamos multi-region con latencia <50ms global. **Para L'Oréal México, pgvector sobra.**

### Qué se vectoriza

- **Perfil agregado del cliente** (1 embedding por clienta, regenerado cuando cambia): incluye nombre, alias, notas recientes, preferencias extraídas. Habilita búsqueda *"la señora del labial rojo"*.
- **Cada nota individual** (1 embedding por nota): habilita búsqueda *"qué clientas mencionaron sensibilidad cutánea"*.
- **Productos del catálogo** (1 embedding por producto): habilita recomendaciones *"qué producto le va a esta clienta"*.

### Hybrid search

pgvector + búsqueda textual de Postgres (`tsvector`) combinadas: tolerancia a typos en nombre + búsqueda semántica en notas. Esto cubre todos los casos descritos en §3.3 del documento de UX.

---

## 7. Caching — donde se gana el costo

Anthropic lanzó **prompt caching** en 2025. Para esta app es crítico.

### Qué cacheamos

**Tier 1 — System prompts** (cambian raramente):
- Instrucciones de extracción ("extrae alergias, preferencias..." — siempre la misma).
- Tono de marca L'Oréal (descripción larga, se carga una vez).
- Few-shot examples para cada tipo de tarea.

Esto puede llegar a 4000-8000 tokens. Sin cache: $0.024/llamada. Con cache: $0.0024/llamada. **90% de ahorro** en prompts que se reusan.

**Tier 2 — Contexto del cliente** (cambia con notas/compras):
- Cada llamada para resumen de un cliente reutiliza el contexto agregado.
- TTL: 5 minutos (Anthropic default). Si María abre 10 fichas en una sesión, solo paga el contexto completo una vez.

**Tier 3 — Respuestas finales** (cuando el output es determinístico):
- Resúmenes del cliente: cachear en Redis/Upstash por 24h con clave = hash(estado_del_cliente). Si el cliente no cambia, no se regenera.
- Embeddings: cachear por contenido. Si una nota no cambia, no se re-embebe.

### Stack de caching propuesto

- **Anthropic prompt caching**: nativo del SDK, cero infra adicional.
- **Upstash Redis** (serverless): para outputs finales + embeddings cacheados. Encaja con Next.js + Vercel.

---

## 8. Privacidad y compliance — no negociable

Las clientas de L'Oréal son personas reales. Sus datos incluyen alergias, preferencias, conversaciones privadas. Esto manda sobre cualquier elección técnica.

### Reglas duras

- **Anthropic + Deepgram + OpenAI embeddings**: los tres ofrecen contratos enterprise con:
  - Opt-out de entrenamiento (datos no se usan para entrenar modelos).
  - Retención configurable a 0 días.
  - DPA (Data Processing Agreement) firmado.
- **Encripción en tránsito**: TLS 1.3 obligatorio en todas las llamadas.
- **Encripción en reposo**: Postgres con encryption at rest (ya cubierto si usamos Supabase/Neon/RDS).
- **Logging**: nunca loguear prompts completos con PII en producción. Solo metadata (latencia, tokens, modelo).
- **PII redaction antes de enviar a LLM**: cuando sea posible, sustituir nombre/email/teléfono por placeholders. Reduce exposición.

### Región de procesamiento

- **Anthropic**: Bedrock AWS us-east-1 o europe-west-1 (más cercano a México: us-east-1 con ~50ms RTT desde CDMX).
- **Deepgram**: tiene endpoints regionales; usar el más cercano.
- **Importante**: si L'Oréal requiere procesamiento en México específicamente, **Bedrock no tiene región MX**. Alternativa: GCP Vertex AI con Claude (tiene region us-south1 más cercano que us-east-1). Decidir con legal.

---

## 9. Telemetría — sin esto, manejamos a ciegas

Toda llamada a LLM se instrumenta:

- **Latencia** (tiempo total, tiempo a primer token).
- **Tokens** (input, output, cached).
- **Costo estimado** (calculado en runtime).
- **Calidad subjetiva**: cuando el usuario edita la sugerencia, se loguea el delta. Es la señal más valiosa que tendremos.

**Stack sugerido:** **Helicone** o **Langfuse** (self-hosted vía Docker). Ambos hacen proxy de Anthropic/OpenAI y dan dashboards listos. Helicone es más simple, Langfuse más completo.

---

## 10. Arquitectura completa — una vista de pájaro

Así se ve el flujo end-to-end para los 3 casos más críticos:

### Caso A: María abre la ficha de Patricia

```
React 19 component (ficha)
  → TanStack Query fetch /api/customers/[id]/summary
  → Next.js API route
  → Check Upstash Redis cache (clave: hash(customer_state))
       ├── HIT → return cached summary (50ms total)
       └── MISS:
            → Fetch customer + notes + purchases from Postgres
            → Anthropic SDK (Claude Sonnet 4.6)
            → System prompt CACHED (Anthropic prompt cache)
            → User prompt: structured customer data
            → streamObject() returns 3-line summary
            → Cache result in Upstash (TTL 24h)
            → Return to client (1.2s primera vez, 50ms con cache)
```

### Caso B: María dicta una nota

```
React component → MediaRecorder API → audio blob
  → POST /api/notes/transcribe (multipart)
  → Server: Deepgram Nova-3 (batch, español-MX)
  → Transcript (2-3s)
  → Anthropic Claude Sonnet 4.6 (streamObject with Zod schema)
  → Extracted fields: { preferences, allergies, products, followUp }
  → Stream to client via Vercel AI SDK useObject hook
  → UI shows structured fields appearing in real-time
  → María confirms → save to Postgres + generate embedding (OpenAI)
  → Insert into pgvector
```

### Caso C: María busca "la señora del labial rojo"

```
React (Search input) → debounced 150ms
  → Server Action searchCustomers(query)
  → OpenAI text-embedding-3-small (vectorize query)
  → Parallel:
       ├── pgvector: ORDER BY embedding <=> query_vector LIMIT 10
       └── tsvector: full-text on name + aliases LIMIT 10
  → Merge + dedupe + Haiku 4.5 re-rank (top 5)
  → Return to client (~200ms total)
```

---

## 11. Costos estimados — escenario realista

Asumiendo **20 consultoras activas, 8 horas/día, 50 fichas abiertas/día por consultora, 10 notas dictadas/día**:

| Item | Volumen/mes | Costo |
|---|---|---|
| Claude Sonnet 4.6 (resúmenes, con cache 80%) | ~6M tokens | ~$30 |
| Claude Haiku 4.5 (sugerencias inline) | ~10M tokens | ~$8 |
| Deepgram Nova-3 | ~80 horas audio | ~$21 |
| OpenAI embeddings | ~5M tokens | ~$0.10 |
| Postgres + pgvector (Neon/Supabase) | normal usage | ~$50 |
| Upstash Redis caching | normal usage | ~$10 |
| Helicone observability | free tier | $0 |
| **TOTAL** | | **~$120/mes** |

Para 200 consultoras: ~$1,200/mes. Para 2,000: ~$12,000/mes. **Escala lineal y predecible.**

Comparado con Salesfloor/Endear (precios típicos de $50-200/usuario/mes solo de licencia), construir esto in-house tiene economía dramáticamente mejor a escala.

---

## 12. La pila final — resumen ejecutable

Para que esto entre en un slide:

**Orquestación**
- Vercel AI SDK (frontend hooks + server streaming)
- Next.js 15 Server Actions

**Modelos LLM**
- Claude Sonnet 4.6 (tareas críticas, structured outputs)
- Claude Haiku 4.5 (latencia baja, UI inline)
- *Acceso vía Anthropic API directo*

**Voz**
- Deepgram Nova-3 (transcripción ES-MX, streaming opcional)

**Embeddings**
- OpenAI text-embedding-3-small

**Búsqueda vectorial**
- pgvector (sobre Postgres existente)

**Caching**
- Anthropic prompt caching (nativo)
- Upstash Redis (outputs finales)

**Observabilidad**
- Helicone (proxy + dashboards)

**Compliance**
- DPAs firmados con Anthropic, Deepgram, OpenAI
- PII redaction antes de logs
- Encripción TLS 1.3 + at-rest

---

## 13. Lo que NO compramos / construimos

Tan importante como lo anterior:

- **NO** LangChain / LangGraph (overhead innecesario).
- **NO** Pinecone / Weaviate / Qdrant (pgvector basta).
- **NO** Whisper API (Deepgram gana en español de piso).
- **NO** un agente multi-tool (la visión rechaza explícitamente IA agéntica).
- **NO** modelos open-source self-hosted en fase 1 (operación > ahorro).
- **NO** RAG con documentos largos (no es el problema; cada cliente cabe en contexto).

---

## 14. Riesgos y cómo los mitigamos

| Riesgo | Mitigación |
|---|---|
| Anthropic baja de calidad / sube precio | Vercel AI SDK abstrae el provider — swap a OpenAI/Gemini en horas |
| Deepgram falla en algún acento | Tener fallback a Whisper API; UI permite editar transcripción siempre |
| Latencia >2s rompe UX | Streaming everywhere; caché agresivo; pre-cómputo de resúmenes nocturnos |
| Costo crece más rápido que adopción | Telemetría desde día 1; alertas por consultora/mes; degradar a Haiku donde aplique |
| L'Oréal exige procesamiento en México | Migrar a Vertex AI (Claude vía GCP, región us-south1) |
| Filtración de datos de clientas | DPAs + retención=0 + PII redaction + auditoría de logs |

---

## 15. Plan de implementación sugerido (orden)

Si tienes que entregar una demo pronto, este es el orden:

**Fase demo (1-2 semanas):**
1. Vercel AI SDK + Anthropic provider configurado.
2. Resumen del cliente (Sonnet 4.6) en la ficha — el feature más impresionante visualmente.
3. Sugerencias de mensaje (Haiku 4.5) en la pantalla de conversación.
4. Mock de captura por voz si Deepgram no está integrado a tiempo.

**Fase post-demo (4-6 semanas):**
5. Deepgram integrado para captura real.
6. pgvector + búsqueda semántica.
7. Opportunity Engine (batch nocturno).
8. Caching completo + observabilidad.

**Fase escala (después):**
9. Migración a Bedrock/Vertex si compliance lo pide.
10. Fine-tuning de prompts con feedback real de consultoras.

---

> *La filosofía de UX dicta que la IA debe ser invisible. La infraestructura debe ser igualmente invisible para el equipo que la opera. Elegimos siempre la pieza que requiere menos pensamiento de fondo — no la más sofisticada.*
