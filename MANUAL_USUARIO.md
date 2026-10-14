# Manual de usuario: Artes y Entretenimiento

## Componentes

- **Página pública** (`index.html`): servicios de DJ, sonido e iluminación, eventos, galería y contacto por WhatsApp.
- **Panel administrativo** (`admin.html`): administración de propuestas, artistas y testimonios.

## Iniciar el sitio

Requisitos: Node.js 18 o superior.

1. Abre PowerShell en la carpeta del proyecto:
   ```powershell
   cd D:\ARTYENTO\artyento
   ```
2. Instala las dependencias la primera vez:
   ```powershell
   npm install
   ```
3. Inicia el servidor:
   ```powershell
   npm start
   ```
4. Abre:
   - Página pública: `http://localhost:3000/`
   - Panel administrativo: `http://localhost:3000/admin.html`

La contraseña del panel está configurada en `admin.html`.

## Panel administrativo

El panel permite gestionar propuestas comerciales, perfiles de artistas y testimonios. Para guardar cambios, usa **Descargar archivo datos.js** y reemplaza el archivo local con la versión descargada.

## Actualizar la galería

Las fotos fuente de las dos posiciones agregadas están en:

- Pantalla LED: `assets/outdor 3x2.png`
- Montaje de DJ y sonido: `assets/bar_3.jpg`

Las versiones optimizadas que utiliza la página están en `assets/optimized/galeria_7.webp` y `assets/optimized/galeria_8.webp`. Para actualizarlas, reemplaza las fotos fuente y ejecuta:

```powershell
node scripts\optimize-images.js
npm run build
```

`npm run build` regenera la carpeta `public` para publicación. Realiza los cambios en los archivos fuente, no directamente en esa carpeta generada.

## Publicar cambios

Después de verificar el sitio localmente, confirma en Git los archivos fuente y recursos necesarios y súbelos al repositorio. No incluyas archivos temporales ni reportes de diagnóstico que no sean parte del sitio.

## Preguntas frecuentes

- **¿La página necesita conexión a internet?** La página carga localmente, pero las fuentes externas, los mapas y los enlaces de WhatsApp necesitan conexión.
- **¿Dónde cambio la contraseña del panel?** En la configuración de acceso de `admin.html`.
- **¿Dónde reemplazo las fotos?** Conserva las fotos fuente en `assets/` y vuelve a generar las imágenes optimizadas antes de compilar.
