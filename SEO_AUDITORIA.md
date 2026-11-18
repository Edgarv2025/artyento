# Auditoría de posicionamiento — Artes y Entretenimiento

Fecha: 2026-11-18
Sitio: https://artesyentretenimiento.com
Repositorio: D:\ARTYENTO\artyento
Estado: **evaluación previa**. Los hallazgos 1.1 a 2.4 ya fueron corregidos el 2026-11-18 sin cambiar diseño ni funcionalidad. Ver `ARTY_AGENTE.md` para el estado actual y los comandos del agente.

---

## 0. Realidad importante (para no perder tiempo ni dinero)

Ningún algoritmo puede **obligar** a Google, Bing o ChatGPT a posicionar un sitio. Las tácticas que prometen "posicionamiento rápido" (intercambios de enlaces, páginas generadas en masa, tráfico falso, cloaking) vulneran las políticas de spam y producen penalizaciones difíciles de revertir.

Lo que **sí** acelera resultados de forma legítima:

1. Que Google pueda rastrear, entender e indexar el sitio sin ambigüedad (técnico).
2. Que la página cargue rápido en móvil (Core Web Vitals).
3. Que existan señales de entidad local coherentes (Google Business Profile + NAP + reseñas).
4. Que haya contenido real que responda búsquedas concretas de la Sabana de Bogotá.
5. Que la autoridad crezca con menciones y enlaces reales.

La IA no cambia esas reglas. La IA sirve para **decidir mejor y más rápido** qué hacer, no para saltarse las reglas.

---

## 1. Hallazgos críticos (esto frena la indexación hoy)

### 1.1 Soft-404: todas las URLs inexistentes devuelven HTTP 200 con la home

Evidencia:

```
GET https://artesyentretenimiento.com/esta-pagina-no-existe
→ STATUS 200
→ <title>DJ, sonido e iluminación para eventos en Bogotá | ...</title>
```

Causa: `wrangler.jsonc` tiene `assets.not_found_handling: "single-page-application"`. Cloudflare sirve `index.html` con código 200 para cualquier ruta no encontrada.

Consecuencia: para Google, tu sitio tiene un número infinito de páginas duplicadas con el mismo contenido. Se diluye la señal de las 6 páginas reales y se degrada la percepción de calidad. Además, los errores 404 reales parecen exitosos.

Corrección: cambiar a `"404-page"` y añadir un `404.html` con el mismo `style.css` (mismo diseño, nueva página; las existentes no se tocan).

Prioridad: **P0**. Impacto: alto. Riesgo visual: nulo.

---

### 1.2 La imagen principal de la home pesa 4 MB y hay una versión de 136 KB ya generada

Evidencia:

| Archivo | Tamaño | Dimensiones |
|---|---:|---:|
| `assets/optimized/hero.jpg` (usado en `<img class="hero-bg" fetchpriority="high">`) | 4.040.009 bytes | 4624×3468 |
| `assets/optimized/hero.webp` (preload en `<head>`) | 135.742 bytes | 1024×1024 |

El navegador descarga el WebP del preload y **después descarga el JPG de 4 MB** porque el `<img>` apunta al JPG. Es el elemento LCP (mayor pintado de contenido), Justo lo que Google mide.

Corrección: apuntar el `<img>` a `hero.webp`. No cambia el diseño; usa un archivo que ya existe y que el propio `<head>` ya intenta precargar.

Prioridad: **P0**. Impacto: alto en velocidad y conversión.

---

### 1.3 Tres imágenes de galería suman ~13 MB

Evidencia:

| Archivo usado en `index.html` | Tamaño |
|---|---:|
| `assets/optimized/galeria_4.jpg` | 5.279.731 bytes |
| `assets/optimized/galeria_6.jpg` | 4.524.569 bytes |
| `assets/optimized/social_6.jpg` | 3.794.197 bytes |

`scripts/optimize-images.js` ya genera versiones WebP para esas posiciones, pero el HTML sigue referenciando los JPG antiguos. El ahorro potencial es de ~17 MB en la carga de la home (4 MB del hero + 13 MB de galería).

Prioridad: **P0**. Impacto: alto.

---

### 1.4 El "algoritmo SEO continuo" actual no se ejecuta en producción

Evidencia: `runAutonomousSeoCycle()` vive en `server/index.js` (Express, `localhost:3000`). Pero `wrangler.jsonc` despliega solo `./public` como activos estáticos en Cloudflare Workers. No hay `main` (Worker) en la configuración.

En producción ese ciclo nunca corre. Además, la función solo calcula un número y lo imprime por consola: no corrige nada, no genera nada y no lee datos de Google.

Corrección: trasladar la lógica al **build** y a un agente que produzca un reporte accionable. El build es el único momento garantizado en este despliegue.

Prioridad: **P0**. Impacto: alto (es la base del agente que pides).

---

## 2. Hallazgos importantes (oportunidades)

### 2.1 Las 5 páginas de servicio no tienen datos estructurados

Solo `index.html` incluye JSON-LD. `dj-bogota`, `sonido-eventos-bogota`, `iluminacion-eventos-bogota`, `dj-bodas-bogota` y `eventos-empresariales-bogota` no tienen ninguno.

Cada una tiene un `<h1>`, una descripción y un acordeón de preguntas frecuentes en HTML visible. Con eso se pueden generar automáticamente:

- `Service` + `ServiceType` (qué ofreces)
- `BreadcrumbList` (estructura del sitio)
- `WebPage` (relación con la organización)
- `FAQPage` (las preguntas ya visibles)

Matiz honesto: Google restringió los *rich results* de FAQ a sitios gubernamentales y de salud (2023). El schema no te dará estrellas ni cajas especiales por eso, pero sí ayuda a los motores y a los asistentes de IA a entender la oferta.

Prioridad: **P1**. Impacto: medio-alto.

---

### 2.2 El build sobrescribe el JSON-LD de la home y pierde datos

`build-static.js` reemplaza el bloque JSON-LD de `index.html` con `generateStructuredData()`. El resultado publicado **no incluye `postalCode`**, que sí está en el `index.html` fuente. Dos fuentes de verdad compitiendo.

Corrección: una sola función generadora usada por el build, con todos los datos verificados (incluido `postalCode: 110911`).

Prioridad: **P1**. Impacto: medio.

---

### 2.3 `lastmod` del sitemap es falso

El sitemap publicado dice `lastmod: 2026-11-12` para las 6 URLs porque el build usa `new Date()` para todas. Ese día fue el último deploy, no la última edición de cada página.

`changefreq` ya es ignorado por Google. Un `lastmod` incorrecto es ruido y puede hacer que Google ignore la señal de frescura.

Corrección: derivar `lastmod` del historial real de Git por archivo (o de la fecha de modificación real), con fallback.

Prioridad: **P2**. Impacto: bajo-medio.

---

### 2.4 No hay `llms.txt` ni superficie para motores de IA

No existe `llms.txt`, `llms-full.txt` ni un resumen legible para modelos. ChatGPT, Perplexity y Gemini están ganando peso como canal de descubrimiento local ("¿quién hace DJ para bodas en Bogotá?").

Hoy esos motores solo tienen el HTML + GTM. Un `llms.txt` con enlaces a las páginas reales y descripciones precisas es barato y no afecta el diseño.

Prioridad: **P2**. Impacto: medio a mediano plazo.

---

### 2.5 Sin señal de verificación de Search Console en el HTML

No aparece `google-site-verification` en ningún HTML. Puede estar en GTM o en DNS, pero no se puede confirmar desde el código.

Sin Search Console no sabes:

- qué páginas están indexadas,
- por qué consultas apareces,
- si hay errores de rastreo o cobertura.

Es el único dato real que puede alimentar al agente. Sin él, el agente solo puede auditar archivos.

Prioridad: **P1**. Requiere acción tuya (verificar el dominio en GSC).

---

### 2.6 La rama Gemini de `aiService.js` está rota

`server/services/aiService.js:244` hace `require('@google/generative-ai')`, pero ese paquete no está en `package.json`. Si algún día configuras `GEMINI_API_KEY`, la llamada fallará y caerá silenciosamente al generador local.

Corrección: llamar a la API REST de Gemini con `fetch` (como ya se hace con OpenAI), sin dependencias nuevas.

Prioridad: **P2**. Impacto: relevante solo cuando actives IA.

---

### 2.7 Deuda menor

- `robots.txt` difiere entre el generador del servidor y el del build. Unificar.
- `server/index.js` declara dos veces la ruta `/` y usa `publicPath` antes de declararlo (funciona por closures, pero es frágil).
- `hero - mobile.jpg`, `hero.jpg` y otros JPG grandes quedan en `public/` aunque no se usen: inflan el despliegue.

---

## 3. Lo que ya está bien (no tocar)

- `lang="es"`, viewport, theme-color.
- Títulos y descripciones únicos por página, con intención local.
- Canonical correcto en las 6 URLs (el build lo inyecta).
- `meta robots: index, follow` en todas.
- Open Graph y Twitter Cards completos, con `og.jpg` de 1200×630 válido.
- Un solo `<h1>` por página.
- Imágenes con `alt`, `width` y `height` (evitan CLS).
- Latitud/longitud, NAP y `sameAs` de redes coherentes.
- `sitemap.xml` y `robots.txt` ya se sirven y apuntan al dominio correcto.
- Compresión gzipLevel 9 y cabeceras de caché en el servidor local.

---

## 4. Arquitectura propuesta del agente (ARTY como núcleo)

ARTY ya es el personaje principal y el agente de WhatsApp. El módulo SEO **no compite** con ARTY: es una capacidad más del mismo agente.

```
                    ARTY (agente principal)
                           │
   ┌──────────────┬────────┼─────────┬──────────────┐
   │              │        │         │              │
Percepción   Posicionamiento Razonamiento  Acción   Conversación
(datos reales)  (auditoría)   (IA opcional) (build)   (WhatsApp actual)
   │              │        │         │              │
datos.js      canonical   GSC +      sitemap       arty en
schema/       schema      keywords   robots        WhatsApp
GSC (si hay)  404         borradores 404.html
              imgs        (revisión) llms.txt
              lastmod                  reporte
```

**Principios de diseño:**

1. **Lo técnico es determinista.** No depende de IA: canonical, schema, sitemap, robots y 404 se generan igual en cada build. Nunca alucinan.
2. **La IA propone, no publica.** Genera propuestas de títulos, descripciones, FAQ y nuevas páginas; un humano las aprueba. Esto evita el *scaled content abuse* que Google penaliza.
3. **Sin API key también funciona.** El modo local hace toda la auditoría y el reporte. La IA se activa solo si hay credenciales.
4. **ARTY mantiene la voz.** Toda salida (reportes, propuestas, textos) usa el tono y los datos reales de la marca; nunca inventa precios ni servicios.
5. **El reporte es accionable.** Prioriza por impacto y esfuerzo, y distingue "corregido automáticamente" de "requiere decisión tuya".

**Acceso a Google Search Console:** el agente puede consultar la Search Console API con una cuenta de servicio (credenciales en `.env`, nunca en el repo). Sin eso, el agente funciona igual pero no ve consultas reales.

---

## 5. Orden de implementación recomendado

| Fase | Acción | Cambia diseño | Cambia funcionalidad |
|---|---|---|---|
| 1 | Corregir soft-404 (`404-page` + `404.html`) | No | Solo URLs inválidas (bug fix) |
| 2 | Corregir imágenes (hero + galería → WebP) | No | No |
| 3 | Unificar generador SEO: schema en las 6 páginas, sitemap con `lastmod` real, robots, `llms.txt` | No | No |
| 4 | Crear `ARTY SEO`: auditor en build + reporte + conector GSC opcional + modo IA opcional | No | No |
| 5 | Configurar Google Business Profile y verificar GSC | No | No |

---

## 6. Expectativas realistas de tiempo

- Indexación y corrección técnica: días a 2 semanas.
- Respuesta de Google Business Profile y reseñas: semanas.
- "DJ Bogotá" y términos competitivos: 3–6 meses de contenido y autoridad.
- Marketplace tipo Amazon: años, y depende de oferta real, logística, pagos y confianza; no de un algoritmo.

**Nota para el marketplace:** generar páginas automáticamente por cada proveedor/producto es exactamente el patrón que Google penala como contenido generado a escala. La arquitectura correcta es plantillas controladas, revisión humana, canonical bien definido y datos estructurados `Product`/`Offer`/`Seller` solo cuando el producto exista de verdad.

---

## 7. Lo que necesito de ti para ejecutar

1. Autorización para las fases 1–4 (respetan diseño y funcionalidad).
2. Confirmar si el dominio ya está verificado en Google Search Console (si no, verificarlo; es la acción de mayor impacto que no puedo hacer por código).
3. Decidir si quieres el conector de IA habilitado ahora o dejarse preparado para cuando contrates Gemini/OpenAI.
