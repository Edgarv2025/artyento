# ARTY — Agente principal de la marca

> ARTY no es un complemento del sitio: es la identidad que lo atraviesa todo.
> Atención al cliente, marketing, posicionamiento y futura operación comercial
> son capacidades del mismo agente.

---

## 1. Estado actual (implementado)

| Capacidad | Dónde vive | Qué hace |
|---|---|---|
| **ARTY · Posicionamiento** | `server/services/seoService.js`, `build-static.js` | Genera canonical, JSON-LD en las 6 páginas, sitemap con `lastmod` real, robots, `404.html`, `llms.txt` y `llms-full.txt`. Determinista: no depende de IA. |
| **ARTY · Auditoría** | `scripts/seo-agent.js` | Corre después del build, revisa 6 páginas + sitio, y escribe `reports/seo-audit.json` y `.md`. |
| **ARTY · Motor de priorización** | `scripts/seo-engine.js` | Convierte auditoría + Search Console en una cola de acciones: striking distance, brechas de contenido, enlazado interno, tendencia diaria y salud ponderada. |
| **ARTY · Percepción** | `scripts/gsc-client.js` | Consulta Google Search Console con cuenta de servicio: consultas reales, clics, impresiones, posición y estado de indexación por URL. |
| **ARTY · Razonamiento** | `scripts/ai-advisor.js` | Convierte la auditoría + GSC en propuestas priorizadas. **Nunca publica**: solo escribe en `reports/`. |
| **ARTY · Conversación** | `server/services/aiService.js` + WhatsApp corporativo | Generación de contenido comercial con datos reales y atención actual en WhatsApp (en desarrollo). |

### Cómo piensa el motor de priorización

1. **Striking distance:** si una búsqueda está en posición 4-20, moverla pocos puestos cambia mucho el CTR. Esa página se marca para optimizar título, descripción y contenido.
2. **Brecha de contenido:** si una búsqueda tiene impresiones pero ninguna página existente coincide lo suficiente, se registra como contenido nuevo **propuesto**, nunca publicado automáticamente.
3. **Peso de oportunidad:** `impresiones × (1 − CTR) × peso`, donde el peso es mayor en posiciones 4-20. Así se ordena por impacto real, no por corazonadas.
4. **Enlazado interno:** detecta páginas con menos de dos enlaces entrantes desde el propio sitio.
5. **Tendencia:** guarda una instantánea diaria en `reports/history/` y compara clics, impresiones, consultas y URLs indexadas contra la ejecución anterior.
6. **Salud ponderada:** técnica 50 %, contenido 30 %, estructura 20 %. Es una métrica interna de gestión, **no** un puntaje de Google.

### Correcciones aplicadas en esta fase

- `not_found_handling` cambiado de `single-page-application` a `404-page`: las URLs inexistentes ahora devuelven 404 real con una página con tu diseño y `noindex`.
- Hero principal: de `hero.jpg` (4 MB) a `hero-lcp.webp` (239 KB), generado desde el mismo JPG para conservar el encuadre.
- Galería: `galeria_4`, `galeria_6` y `social_6` ahora usan WebP generados desde los JPG originales.
- Los 5 JPG grandes dejaron de publicarse en Cloudflare (−17 MB de despliegue).
- Se unificaron las dos fuentes de verdad del JSON-LD (antes el build borraba el `postalCode`).
- El sitemap usa la fecha real de cada archivo según Git, no la fecha del build.
- Las 5 páginas de servicio ahora tienen `Service`, `BreadcrumbList`, `WebPage` y `FAQPage` generados desde el FAQ visible.

El diseño y la funcionalidad de las páginas existentes **no se modificaron**.

---

## 2. Cómo ejecutarlo

```powershell
cd D:\ARTYENTO\artyento

# Generar el sitio y auditarlo
npm run seo:full

# Solo auditoría (sin rebuild)
npm run seo:audit

# Auditoría + Search Console
npm run seo:gsc

# Auditoría + Search Console + propuestas de ARTY
npm run seo:ai
```

Resultados: `reports/seo-audit.json`, `reports/seo-audit.md`.
El comando termina con código de error si hay errores **bloqueantes** (útil para CI).

Para publicar:

```powershell
npm run build
npx wrangler deploy
```

---

## 3. Conectar Google Search Console

El dominio ya está verificado, pero el agente necesita su propio acceso por API:

1. En Google Cloud Console, crea una **cuenta de servicio** y descarga su JSON de clave.
2. En Search Console → **Configuración → Usuarios y permisos**, agrega el `client_email` de esa cuenta de servicio como usuario con permiso de **Ver** (Lectura).
3. Guarda el JSON **fuera del repositorio** (ya está ignorado por Git). Ejemplo: `D:\ARTYENTO\artyento\.secrets\gsc.json`.
4. Crea un `.env` (ignorado por Git) con:

```
GSC_SERVICE_ACCOUNT_JSON=D:\ARTYENTO\artyento\.secrets\gsc.json
GSC_SITE_URL=https://artesyentretenimiento.com/
```

5. Ejecuta `npm run seo:gsc`.

Con eso ARTY ve, por ejemplo: qué búsquedas traen impresiones pero pocos clics, y si Google indexó cada una de las 6 URLs. Esa es la señal real que falta hoy.

> Nota: la URL Inspection API permite **inspeccionar**, no enviar URLs a indexar. El "botón de indexación" de Search Console es manual y no existe una API general para forzar indexación (la Indexing API solo aplica a ofertas de empleo y eventos de difusión). Cualquier servicio que prometa "indexación forzada" con API está vendiendo algo que Google no ofrece.

---

## 4. Activar el razonamiento de IA (opcional)

Sin clave, ARTY genera propuestas deterministas con los datos del reporte. Para activar la capa de IA, agrega una de estas variables al `.env`:

```
GEMINI_API_KEY=tu_clave
# o
OPENAI_API_KEY=tu_clave
```

El agente intenta Gemini primero, luego OpenAI, y cae al modo determinista si fallan. Las claves **nunca** se escriben en el sitio ni en los reportes.

Reglas fijas del prompt de ARTY:

- No inventar precios, servicios, clientes ni datos de contacto.
- Solo proponer; nunca publicar ni modificar archivos.
- Priorizar por impacto y separar corrección técnica de oportunidad de contenido.
- Voz de marca: cercana, profesional, colombiana, festiva.

---

## 5. Cómo "alimentar" a ARTY diariamente

No se entrena un modelo desde cero ni se reentrena cada noche. Se usa **RAG** (generación aumentada por recuperación): el modelo base permanece fijo y su conocimiento cambiable vive en una biblioteca que se actualiza.

```
Fuentes verificadas (diarias)
├─ datos.js / paquetes.js / galería      → catálogo real
├─ schema/local-business.json            → identidad y NAP
├─ Search Console                        → búsquedas reales
├─ Reseñas y preguntas de WhatsApp       → objeciones reales (con consentimiento)
└─ Calendario de temporada (Q1-Q4)       → estacionalidad
              │
              ▼
     Validación + deduplicación
              │
              ▼
     Índice de conocimiento de ARTY
              │
              ▼
     ARTY responde / propone (con guardrails)
              │
              ▼
     Revisión humana → publicación
```

**Qué NO hacer:** reentrenar diariamente (olvido catastrófico), ingestar conversaciones sin anonimizar (riesgo de Habeas Data en Colombia), o dejar que la IA publique páginas nuevas sin revisión (Google lo penaliza como contenido generado a escala).

Para empezar no hace falta una base vectorial: con un corpus pequeño basta un índice JSON + búsqueda por palabras clave. Se migra a embeddings solo cuando el volumen lo justifique.

---

## 6. ARTY como orquestador — hoja de ruta

La visión es que ARTY maneje toda la página. Orden recomendado, de menor a mayor riesgo:

| Fase | Capacidad | Qué implica |
|---|---|---|
| ✅ 1 | Cimiento técnico y SEO | Ya implementado arriba. Sin IA visible para el visitante. |
| 2 | **ARTY Observa** | Dashboard diario: indexación, consultas, reseñas y conversiones. Ya hay base (`reports/`). |
| 3 | **ARTY Propone** | Borradores de títulos, FAQs, artículos y campañas con revisión humana. Ya hay base (`ai-advisor.js`). |
| 4 | **ARTY Habla** | Widget de chat en la web con identidad ARTY, conectado a WhatsApp y a la biblioteca de conocimiento. Requiere API key y diseño del personaje animado. |
| 5 | **ARTY Se mueve** | Personaje animado (SVG/Lottie o WebGL) con expresiones y microinteracciones. Requiere diseño; no debe penalizar Core Web Vitals. |
| 6 | **ARTY Vende y asesora** | Cotización, agendamiento, contratos y pago dentro del sitio. Requiere pasarela de pagos, backend real y cumplimiento legal. |
| 7 | **ARTY Opera el marketplace** | Agentes por proveedor/categoría, todos coordinados por ARTY. Requiere moderación estricta y arquitectura anti-duplicados. |

**Importante:** las fases 4-7 necesitan un backend en producción (hoy Cloudflare solo sirve archivos estáticos) y un proveedor de IA contratado. OpenCode es la herramienta con la que construimos estas fases, no el motor que debe correr dentro de la web.

---

## 7. Lo que Google no permite (para no tropezar)

- Comprar o intercambiar enlaces para "posicionar rápido".
- Generar cientos de páginas de proveedores con plantillas sin valor real.
- Publicar reseñas falsas o schemas de `AggregateRating` inventados.
- Cloaking (mostrar contenido distinto a Google que al usuario).
- Texto invisible o relleno de palabras clave.

El crecimiento del marketplace debe apoyarse en páginas reales, revisadas, con datos estructurados honestos (`Product`, `Offer`, `Seller`) y canonical bien definido.

---

## 8. Pendientes que requieren tu acción

1. Configurar la cuenta de servicio de Search Console (sección 3). Es lo de mayor impacto.
2. Revisar/crear el **Google Business Profile** y mantener reseñas reales: es el acelerador más fuerte para búsquedas locales tipo "DJ Bogotá".
3. Decidir proveedor de IA (Gemini tiene capa gratuita) para activar las fases 4-5.
4. Verificar que las fotos usadas en el sitio tengan autorización de uso.
