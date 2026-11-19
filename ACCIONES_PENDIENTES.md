# Acciones pendientes — ARTY / Posicionamiento local

> Estado verificado el 2026-11-18.
> **Local:** auditoría 0 errores, 2 advertencias esperadas, 95/100 de salud ponderada.
> **En vivo:** publicado. `/no-existe-arty` devuelve 404 real; sitemap, robots y
> llms.txt responden 200; el hero WebP, el canonical y el JSON-LD están presentes.

---

## 1. Publicar en Cloudflare (se hace con `git push`)

Cloudflare toma el sitio desde `https://github.com/Edgarv2025/artyento`.
`D:\ARTYENTO\artyento` es el repositorio local de trabajo. El flujo es:

```powershell
cd D:\ARTYENTO\artyento
git add -A
git commit -m "ARTY SEO: 404 real, WebP, JSON-LD unificado, motor local Bogotá"
git push origin main
```

Al hacer push, Cloudflare ejecuta `node build-static.js` (definido en `wrangler.jsonc`)
y publica el contenido de `public/`. **No hace falta autenticar `wrangler` en esta máquina**
para el flujo normal; `npx wrangler deploy` queda solo como salida manual de emergencia.

> Ojo: `public/` está en `.gitignore`, salvo los archivos que ya estaban versionados.
> Eso es correcto: Cloudflare regenera todo en el build. Nunca subas `public/` a mano.

### Verificación obligatoria después del push

```powershell
$urls = @(
  'https://artesyentretenimiento.com/no-existe-arty',
  'https://artesyentretenimiento.com/sitemap.xml',
  'https://artesyentretenimiento.com/robots.txt',
  'https://artesyentretenimiento.com/llms.txt'
)
foreach ($u in $urls) {
  try { $r = Invoke-WebRequest -Uri $u -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop; "OK $($r.StatusCode) $u" }
  catch { "ERR $([int]$_.Exception.Response.StatusCode) $u" }
}
```

Resultado esperado: `ERR 404` para `/no-existe-arty` y `OK 200` para los otros tres.
Además, `robots.txt` debe terminar con `Sitemap: https://artesyentretenimiento.com/sitemap.xml`.

---

## 2. Activar la indexación en Google Search Console

"Activar la página en Search Console" no se hace con código: el dominio ya está
verificado y lo que falta es que Google **descubra e indexe** las 6 URLs.

### Paso A — Confirmar la propiedad

1. Entrar a https://search.google.com/search-console con la cuenta del negocio.
2. En el selector de propiedades, usar la **propiedad de dominio**
   `artesyentretenimiento.com` (es la recomendada; cubre `www` y HTTPS).
3. Si pidiera verificación, hacerla con un registro **TXT en Cloudflare DNS**.
   No hace falta tocar el sitio ni subir archivos.

### Paso B — Enviar el sitemap

1. Menú lateral → **Sitemaps**.
2. En *Agregar un sitemap nuevo* escribir solo `sitemap.xml` → **Enviar**.
3. Estado esperado: **Correcto** (puede tardar varias horas en aparecer).

El sitemap ya está publicado y contiene exactamente estas 6 URLs:

```
https://artesyentretenimiento.com/
https://artesyentretenimiento.com/dj-bogota
https://artesyentretenimiento.com/sonido-eventos-bogota
https://artesyentretenimiento.com/iluminacion-eventos-bogota
https://artesyentretenimiento.com/dj-bodas-bogota
https://artesyentretenimiento.com/eventos-empresariales-bogota
```

### Paso C — Solicitar indexación de cada URL

1. Barra superior → **Inspección de URL**.
2. Pegar una URL de la lista → **Solicitar indexación**.
3. Repetir con las 6 URLs.

Es una solicitud **manual** y con límite. No existe una API legítima para forzar
la indexación general: la Indexing API de Google solo aplica a ofertas de empleo
y eventos de difusión. Cualquier servicio que prometa "indexación forzada por API"
está vendiendo algo que Google no ofrece.

### Paso D — Verificar el resultado

- Menú **Páginas** → revisar *Páginas indexadas*.
- Volver a **Inspección de URL**: debe decir **"La URL está en Google"**.
- Si dice *"Rastreada pero no indexada"*, no es un error técnico: Google ya vio
  la página pero decidió no incluirla todavía. Se refuerza con contenido real,
  enlazado interno y señales locales, no con más solicitudes.

### Paso E — Enlazado interno (ya está hecho)

La portada ya enlaza a las 5 páginas de servicio con texto descriptivo, y el
sitemap incluye `lastmod` real. No hace falta agregar enlaces ni páginas nuevas.

### Estado confirmado en Search Console (2026-11-18)

Inspección de URL de la portada:

- **La página está indexada.**
- Detección: **Sitemap** `https://artesyentretenimiento.com/sitemap.xml` (ya está dado de alta: no hace falta enviarlo de nuevo).
- Rastreo permitido: **Sí**. Indexación permitida: **Sí**. Obtención de página: **Correcto**.
- Canónica declarada: `https://artesyentretenimiento.com/`. Canónica elegida por Google: la URL inspeccionada.
- Último rastreo: **13 nov 2026**, es decir, **antes** del deploy de los cambios de esta fase.

Acción inmediata: pulsar **Solicitar indexación** en esa misma inspección para que
Google vuelva a rastrear la versión nueva (404 real, WebP, JSON-LD). Repetir la
inspección en las otras 5 URLs de la lista del sitemap.

> *Página de referencia: no se ha detectado ninguna* es normal en la portada.
> En las páginas de servicio sí debe aparecer la portada como referencia: el
> enlazado interno ya está implementado y se confirma con `npm run seo:full`.

### Caso: `/iluminacion-eventos-bogota` — "Rastreada: actualmente sin indexar"

Inspección del 2026-11-18: detectada por sitemap, **último rastreo 17 nov 2026
3:00:49**, rastreo permitido, obtención correcta, pero **canónico declarado y
elegido: N/D**. Es decir, Google evaluó la versión anterior a nuestro deploy del
18 nov, que no tenía canonical.

La URL actual sí responde 200, lleva canonical propio, `index, follow`, un H1,
JSON-LD, está en el sitemap y recibe enlaces desde las otras 5 páginas.

**Acción ejecutada:** se solicitó indexación de las 6 URLs del sitemap y las
solicitudes fueron aceptadas (2026-11-18). Falta que Google efectúe el nuevo
rastreo y reevalúe la versión publicada.

**Nota sobre el error de conexión:** la inspección mostró *"No se ha podido
conectar al servidor"* a las 19:03:50, pero las pruebas con user-agent de
Googlebot (smartphone Android e iPhone) devuelven 200 en las 6 URLs. Fue un
fallo puntual de la herramienta de inspección, no un bloqueo del sitio.

**Si tras el nuevo rastreo sigue sin indexar:** hay un riesgo real de duplicidad.
La estructura HTML de las 5 páginas de servicio es 85-91 % idéntica y tres de
ellas comparten `assets/optimized/hero.webp` como imagen principal. Google
llegó a elegir `/dj-bodas-bogota` como canónica de `/iluminacion-eventos-bogota`.
El siguiente paso sería usar `assets/optimized/iluminacion.webp` en esa página
y ampliar sus textos y FAQs con información real ya existente en el sitio, sin
cambiar diseño ni funcionalidad y sin inventar casos ni rellenar palabras clave.

---

## 3. Conectar el agente ARTY a Search Console (bloqueado por credenciales)

El dominio ya está verificado, pero el agente necesita acceso por API. No hay
`gcloud` instalado, así que esta parte es manual en la consola web.

1. **Google Cloud Console** → proyectos → crear proyecto `arty-seo` (o usar uno existente).
2. **APIs y servicios → Biblioteca** → habilitar *Google Search Console API*.
3. **IAM y administración → Cuentas de servicio → Crear cuenta de servicio**
   (nombre: `arty-gsc-reader`). No le des roles de proyecto: el permiso se da en GSC.
4. En la cuenta creada: **Claves → Añadir clave → Crear clave nueva → JSON**. Se descarga un `.json`.
5. Guarda el JSON **fuera del repo** (ya está ignorado por Git):

```powershell
New-Item -ItemType Directory -Force 'D:\ARTYENTO\artyento\.secrets'
# Copia el JSON descargado a D:\ARTYENTO\artyento\.secrets\gsc.json
```

6. **Search Console** → propiedad `artesyentretenimiento.com` →
   *Configuración → Usuarios y permisos → Agregar usuario*.
   Pega el `client_email` del JSON con permiso **Ver** (lectura).
7. Crea el archivo `.env` (ignorado por Git):

```ini
GSC_SERVICE_ACCOUNT_JSON=D:\ARTYENTO\artyento\.secrets\gsc.json
GSC_SITE_URL=https://artesyentretenimiento.com/
```

8. Ejecuta y revisa el reporte:

```powershell
npm run seo:gsc
Get-Content reports\seo-audit.md
```

Con eso el motor deja de auditar solo archivos y empieza a priorizar con búsquedas,
clics, impresiones, posición e indexación reales.

> La URL Inspection API solo **inspecciona**. No existe una API legítima para forzar
> la indexación general. El botón "Solicitar indexación" de Search Console es manual.

---

## 4. Google Business Profile (requiere acción humana)

Es la palanca más fuerte para *"DJ Bogotá"*; el local pack del mapa no depende del código.

**Perfil identificado:** https://share.google/Prz4WWHFgLRpAebrs
ID interno (kgmid): `/g/11zz48479v`.

Ese enlace ya está publicado en la sección de contacto, en el pie de página de
las 6 páginas y en el widget de ARTY.

> Nota: Google bloquea la lectura automatizada de este panel, así que los campos
> del perfil deben confirmarse desde la cuenta del negocio o con una captura.

**Datos que el sitio publica hoy (deben coincidir exactamente con el perfil):**

| Campo | Valor en el sitio |
|---|---|
| Nombre | Artes y Entretenimiento (marca: ARTY) |
| Dirección | Calle 16 h Bis #112A-14, Bogotá D.C., Colombia |
| Teléfono principal | +57 320 245 9032 |
| Teléfono secundario | +57 312 843 1149 |
| Sitio web | https://artesyentretenimiento.com/ |
| Redes verificadas | @artyento en Instagram, TikTok y Facebook |
| Coordenadas en schema | 4.66598, -74.15654 (datos originales del sitio) |

**Verificación hecha sobre la captura del perfil (2026-11-18):**

- El botón *Sitio web* apunta correctamente a `https://artesyentretenimiento.com/`.
- Las redes del perfil coinciden con el `sameAs` del schema: Facebook, TikTok e Instagram `@artyento`. Las tres URL responden 200.
- Categoría visible: *DJ en Bogotá*. Correcta.
- El perfil tiene 1 opinión de 5 estrellas y 53 interacciones con clientes. No se copian al sitio: las reseñas propias solo se gestionan en Google.
- **Decisión del negocio:** la dirección real es `Calle 16 h Bis #112A-14`. El sitio y el schema están bien y **no se modifican**.
- **Dirección corregida por el negocio el 2026-11-18** en el perfil de Google. Antes aparecía `Cl. 16h Bis #112 a 09` porque la vía es cerrada y Maps no la ubicaba.

**Referencia por si Google aún no refleja el cambio o pide ajustes:**

1. *Editar perfil → Información → Dirección*: poner `Calle 16 h Bis #112A-14, Bogotá`.
2. Si Maps no ubica el número, usar **Ajustar ubicación en el mapa** para colocar el pin exacto y escribir la referencia en *Información adicional de la dirección*.
3. Si no se puede mostrar una dirección física localizable, configurar el perfil como **empresa de área de servicio** (dirección oculta) y declarar Bogotá y la Sabana como zonas atendidas.
4. Nunca poner un número de puerta falso: rompe la coherencia NAP y puede llevar a la suspensión del perfil.
5. Mantener teléfono `320 245 9032` y sitio web sin cambios.

- [ ] Categoría principal: *Servicio de entretenimiento* o *DJ*. Categorías secundarias: *Servicio de sonido*, *Alquiler de iluminación*.
- [ ] NAP exacto y repetido igual en web, GBP y directorios:
  **Artes y Entretenimiento · Calle 16 h Bis #112A-14, Bogotá D.C. · +57 320 245 9032**.
- [ ] Fotos reales del trabajo (equipo, montajes, eventos) y logo ARTY.
- [ ] Horario de atención y zona de cobertura.
- [ ] Pedir reseñas reales a clientes de Bogotá y responderlas.
- [ ] publicaciones (posts) periódicas desde GBP.

---

## 5. Proveedor de IA para ARTY (opcional)

Sin clave, ARTY funciona en modo determinista y **no cuesta nada**. El SEO, la
indexación y el build de Cloudflare tampoco tienen costo.

Para activar razonamiento:

1. Entrar a https://aistudio.google.com/apikey con tu cuenta de Google.
2. Crear una clave de API y copiarla.
3. Guardarla en `D:\ARTYENTO\artyento\.env` (ignorado por Git):

```ini
GEMINI_API_KEY=tu_clave        # se intenta primero; capa gratuita suficiente
OPENAI_API_KEY=tu_clave        # respaldo opcional, de pago pero consumo mínimo
```

4. Ejecutar `npm run seo:ai` y verificar en `reports/seo-audit.md` que aparece
   `provider: Gemini 3.8 Flash`.

La clave la puedes pegar aquí y yo la escribo en el `.env`, o crear el archivo
tú mismo. No puedo generarla yo: requiere tu inicio de sesión en Google. Las
claves nunca se escriben en el sitio ni en los reportes.

---

## 6. Contenido local con casos reales (nunca generación automática)

El motor ya detecta brechas, pero **no publica**. Antes de crear contenido para una
zona (Chía, Usaquén, Sabana, etc.), confirma con datos verificables:

- [ ] ¿Se trabajó realmente allí? ¿Qué venue y qué fecha?
- [ ] ¿Hay fotos autorizadas del evento?
- [ ] ¿Hay testimonio real autorizado?
- [ ] ¿Cuál es el tiempo real de traslado desde la dirección de Bogotá?

Solo con esas respuestas se redacta una página única y revisada por una persona.
**No** generar páginas de ciudad por plantilla: Google las trata como *doorway pages*.

---

## 7. Verificación final del agente

```powershell
npm run seo:full
npm test
```

Esperado: `0 errores, 2 advertencias, salud 90/100` y `95/100` ponderada.
Las dos advertencias son: archivos grandes usados como fuente (no se publican)
y, hasta que configures el paso 2, la falta de credenciales de GSC.
