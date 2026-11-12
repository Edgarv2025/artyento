const fs = require('fs');
const path = require('path');
const { SITE_URL, generateStructuredData } = require('./server/services/seoService');

const root = __dirname;
const publicDir = path.join(root, 'public');
const files = [
  'admin.html',
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
const canonicalUrls = {
  'index.html': `${SITE_URL}/`,
  'dj-bogota.html': `${SITE_URL}/dj-bogota`,
  'sonido-eventos-bogota.html': `${SITE_URL}/sonido-eventos-bogota`,
  'iluminacion-eventos-bogota.html': `${SITE_URL}/iluminacion-eventos-bogota`,
  'dj-bodas-bogota.html': `${SITE_URL}/dj-bodas-bogota`,
  'eventos-empresariales-bogota.html': `${SITE_URL}/eventos-empresariales-bogota`
};

function prepareSeoHtml(html, canonicalUrl, isHomepage = false) {
  if (!/<head\b/i.test(html) || !/<\/head>/i.test(html)) {
    throw new Error('No se pudo generar canonical: el documento no contiene un elemento head completo.');
  }

  const withoutCanonicals = html.replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>\s*/gi, '');
  const robotsMeta = /<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*>/i;
  if (!robotsMeta.test(withoutCanonicals)) {
    throw new Error('No se pudo generar canonical: falta la etiqueta meta robots.');
  }

  const lineBreak = html.includes('\r\n') ? '\r\n' : '\n';
  let preparedHtml = withoutCanonicals.replace(
    robotsMeta,
    match => `${match}${lineBreak}  <link rel="canonical" href="${canonicalUrl}">`
  );
  preparedHtml = preparedHtml.replace(
    /<meta\b(?=[^>]*\bproperty\s*=\s*["']og:url["'])[^>]*>/i,
    `<meta property="og:url" content="${canonicalUrl}">`
  );

  if (!isHomepage) {
    return preparedHtml;
  }

  const title = 'DJ, sonido e iluminación para eventos en Bogotá | Artes y Entretenimiento';
  const description = 'DJ, sonido profesional e iluminación para bodas, quinces y eventos empresariales en Bogotá y Cundinamarca. Cotiza por WhatsApp.';
  const keywords = 'DJ Bogotá, sonido profesional eventos Bogotá, iluminación robótica Bogotá, bodas, quinces, eventos empresariales';
  const structuredData = JSON.stringify(generateStructuredData(), null, 2);

  return preparedHtml
    .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${description}">`)
    .replace(/<meta name="keywords" content="[^"]*">/i, `<meta name="keywords" content="${keywords}">`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script type="application/ld+json">\n    ${structuredData}\n    </script>`);
}

fs.rmSync(publicDir, { recursive: true, force: true });
fs.mkdirSync(publicDir, { recursive: true });

for (const file of files) {
  const sourcePath = path.join(root, file);
  const targetPath = path.join(publicDir, file);
  if (Object.prototype.hasOwnProperty.call(canonicalUrls, file)) {
    const sourceHtml = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(targetPath, prepareSeoHtml(sourceHtml, canonicalUrls[file], file === 'index.html'), 'utf8');
  } else if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
  }
}

for (const directory of directories) {
  const sourceDirectory = path.join(root, directory);
  if (fs.existsSync(sourceDirectory)) {
    fs.cpSync(sourceDirectory, path.join(publicDir, directory), { recursive: true });
  }
}

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/dj-bogota</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/sonido-eventos-bogota</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/iluminacion-eventos-bogota</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/dj-bodas-bogota</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${SITE_URL}/eventos-empresariales-bogota</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>
`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /server/\nSitemap: ${SITE_URL}/sitemap.xml\n`, 'utf8');
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

console.log(`Archivos estaticos preparados en ${publicDir}`);
