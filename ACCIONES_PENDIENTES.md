# Acciones pendientes — ARTY / Posicionamiento local

> Estado verificado el 2026-11-18.
> **Local:** auditoría 0 errores, 2 advertencias esperadas, 95/100 de salud ponderada.
> **En vivo:** el sitio todavía devuelve `200` para URLs inexistentes, así que los
> cambios de esta fase **aún no están publicados**.

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

## 2. Conectar Google Search Console (bloqueado por credenciales)

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

## 3. Google Business Profile (requiere acción humana)

Es la palanca más fuerte para *"DJ Bogotá"*; el local pack del mapa no depende del código.

**Perfil identificado:** https://share.google/Prz4WWHFgLRpAebrs
ID interno (kgmid): `/g/11zz48479v`.

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

- [ ] Categoría principal: *Servicio de entretenimiento* o *DJ*. Categorías secundarias: *Servicio de sonido*, *Alquiler de iluminación*.
- [ ] NAP exacto y repetido igual en web, GBP y directorios:
  **Artes y Entretenimiento · Calle 16 h Bis #112A-14, Bogotá D.C. · +57 320 245 9032**.
- [ ] Fotos reales del trabajo (equipo, montajes, eventos) y logo ARTY.
- [ ] Horario de atención y zona de cobertura.
- [ ] Pedir reseñas reales a clientes de Bogotá y responderlas.
- [ ] publicaciones (posts) periódicas desde GBP.

---

## 4. Proveedor de IA para ARTY (opcional)

Sin clave, ARTY funciona en modo determinista. Para activar razonamiento:

```ini
# .env
GEMINI_API_KEY=tu_clave        # se intenta primero; Gemini 2.0 Flash tiene capa gratuita
OPENAI_API_KEY=tu_clave        # respaldo si Gemini falla
```

Luego: `npm run seo:ai`. Las claves nunca se escriben en el sitio ni en los reportes.

---

## 5. Contenido local con casos reales (nunca generación automática)

El motor ya detecta brechas, pero **no publica**. Antes de crear contenido para una
zona (Chía, Usaquén, Sabana, etc.), confirma con datos verificables:

- [ ] ¿Se trabajó realmente allí? ¿Qué venue y qué fecha?
- [ ] ¿Hay fotos autorizadas del evento?
- [ ] ¿Hay testimonio real autorizado?
- [ ] ¿Cuál es el tiempo real de traslado desde la dirección de Bogotá?

Solo con esas respuestas se redacta una página única y revisada por una persona.
**No** generar páginas de ciudad por plantilla: Google las trata como *doorway pages*.

---

## 6. Verificación final del agente

```powershell
npm run seo:full
npm test
```

Esperado: `0 errores, 2 advertencias, salud 90/100` y `95/100` ponderada.
Las dos advertencias son: archivos grandes usados como fuente (no se publican)
y, hasta que configures el paso 2, la falta de credenciales de GSC.
