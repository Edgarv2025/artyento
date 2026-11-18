const fs = require('fs');
const path = require('path');
const seo = require('./server/services/seoService');

const root = __dirname;
const publicDir = path.join(root, 'public');
const files = [
  'admin.html',
  '404.html',
  'datos.js',
  'index.html',
  'main.js',
  'style.css',
  'dj-bogota.html',
  'sonido-eventos-bogota.html',
  'iluminacion-eventos-bogota.html',
  'dj-bodas-bogota.html',
  'eventos-empresariales-bogota.html',
  'gallery.json',
  'redes.json',
  'paquetes.js'
];
const directories = ['assets', 'fotos', 'schema'];

// JPGs de 4-5 MB que ya no referencia ninguna página: se conservan como
// fuente para regenerar WebP, pero no se publican en Cloudflare.
const excludedFromPublish = new Set([
  'assets/optimized/hero.jpg',
  'assets/optimized/hero - mobile.jpg',
  'assets/optimized/galeria_4.jpg',
  'assets/optimized/galeria_6.jpg',
  'assets/optimized/social_6.jpg'
]);

/** Ajusta canonical y og:url sin tocar ningún elemento visible de la página. */
function prepareSeoHtml(html, canonicalUrl) {
  if (!/<head\b/i.test(html) || !/<\/head>/i.test(html)) {
    throw new Error(`No se pudo generar el canonical: el documento no contiene un head completo.`);
  }

  const withoutCanonicals = html.replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>\s*/gi, '');
  const robotsMeta = /<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*>/i;
  if (!robotsMeta.test(withoutCanonicals)) {
    throw new Error('No se pudo generar el canonical: falta la etiqueta meta robots.');
  }

  const lineBreak = html.includes('\r\n') ? '\r\n' : '\n';
  let prepared = withoutCanonicals.replace(
    robotsMeta,
    match => `${match}${lineBreak}  <link rel="canonical" href="${canonicalUrl}">`
  );
  prepared = prepared.replace(
    /<meta\b(?=[^>]*\bproperty\s*=\s*["']og:url["'])[^>]*>/i,
    `<meta property="og:url" content="${canonicalUrl}">`
  );
  // Permite a los buscadores mostrar la mejor versión de la imagen y el snippet.
  prepared = prepared.replace(
    /(<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*content\s*=\s*["'])([^"']*)(["'][^>]*>)/i,
    (match, prefix, value, suffix) => {
      if (!/index/i.test(value) || /max-image-preview/i.test(value)) return match;
      return `${prefix}${value}, max-image-preview:large, max-snippet:-1${suffix}`;
    }
  );
  return prepared;
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const file of files) {
  const sourcePath = path.join(root, file);
  const targetPath = path.join(publicDir, file);
  if (!fs.existsSync(sourcePath)) continue;

  const page = seo.getSeoPages().find(p => p.file === file);
  if (page) {
    let html = fs.readFileSync(sourcePath, 'utf8');
    html = prepareSeoHtml(html, page.canonical);
    html = seo.injectStructuredData(html, page);
    fs.writeFileSync(targetPath, html, 'utf8');
  } else {
    fs.copyFileSync(sourcePath, targetPath);
  }
}

for (const directory of directories) {
  const sourceDirectory = path.join(root, directory);
  if (fs.existsSync(sourceDirectory)) {
    fs.cpSync(sourceDirectory, path.join(publicDir, directory), {
      recursive: true,
      filter: source => {
        const relative = path.relative(root, source).replace(/\\/g, '/');
        return !excludedFromPublish.has(relative);
      }
    });
  }
}

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), seo.generateSitemapXml(), 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), seo.generateRobotsTxt(), 'utf8');
fs.writeFileSync(path.join(publicDir, 'llms.txt'), seo.generateLlmsTxt(), 'utf8');
fs.writeFileSync(path.join(publicDir, 'llms-full.txt'), seo.generateLlmsFullTxt(), 'utf8');
fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify({
  name: 'Artes y Entretenimiento',
  short_name: 'Artes y Entretenimiento',
  description: 'DJ, sonido profesional e iluminación para eventos en Bogotá, Colombia.',
  start_url: '/',
  display: 'standalone',
  background_color: '#0A0A0D',
  theme_color: '#C9A85C',
  icons: [
    { src: '/assets/arty/icon-512x512.png', sizes: '512x512', type: 'image/png' }
  ]
}, null, 2), 'utf8');

console.log(`Archivos estáticos preparados en ${publicDir}`);
console.log('ARTY · Posicionamiento: canonical, JSON-LD, sitemap, robots, 404 y llms.txt generados.');
