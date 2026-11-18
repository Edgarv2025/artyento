require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

// Inicializar base de datos
require('./database');

const marketingRoutes = require('./routes/marketingRoutes');
const { generateSitemapXml, generateRobotsTxt, runAutonomousSeoCycle } = require('./services/seoService');

const app = express();
const PORT = process.env.PORT || 3000;
// La vista local debe coincidir con lo que Cloudflare publica (carpeta public/).
const publicPath = path.resolve(__dirname, '..', 'public');

// Middlewares
app.use(cors());
app.use(compression({ level: 9, threshold: 0 }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const isHtml = req.path.endsWith('.html') || req.path === '/';
  res.setHeader('Cache-Control', isHtml ? 'no-cache' : 'public, max-age=31536000, immutable');
  next();
});

// --- Rutas SEO Dinámicas para Google Search Console ---
app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.send(generateSitemapXml());
});

app.get('/robots.txt', (req, res) => {
  res.header('Content-Type', 'text/plain');
  res.send(generateRobotsTxt());
});

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(publicPath, 'manifest.json'));
});

app.get('/schema/local-business.json', (req, res) => {
  res.sendFile(path.join(publicPath, 'schema', 'local-business.json'));
});

const seoPages = [
  ['/', 'index.html'],
  ['/dj-bogota', 'dj-bogota.html'],
  ['/sonido-eventos-bogota', 'sonido-eventos-bogota.html'],
  ['/iluminacion-eventos-bogota', 'iluminacion-eventos-bogota.html'],
  ['/dj-bodas-bogota', 'dj-bodas-bogota.html'],
  ['/eventos-empresariales-bogota', 'eventos-empresariales-bogota.html']
];

seoPages.forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(publicPath, file));
  });
});

// Endpoints de administración del catálogo y contenido del sitio.
app.use('/api/marketing', marketingRoutes);

app.use(express.static(publicPath, {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// Rutas no encontradas: 404 real, igual que en Cloudflare.
app.use((req, res) => {
  res.status(404).sendFile(path.join(publicPath, '404.html'));
});

app.listen(PORT, () => {
  // Revisión de preparación de contenido al iniciar (no es un puntaje de Google).
  const seoStatus = runAutonomousSeoCycle();

  // La generación SEO real ocurre en el build; aquí solo se reporta el estado.
  setInterval(() => {
    try {
      runAutonomousSeoCycle();
    } catch (e) {
      console.error('[SEO Engine] Error en ciclo continuo:', e.message);
    }
  }, 86400000);

  console.log('====================================================');
  console.log(' ✨ ARTES & ENTRETENIMIENTO - PLATAFORMA INTEGRAL');
  console.log(` 🌐 Sitio Web Público:       http://localhost:${PORT}/`);
  console.log(` 🛠️ Panel Administrativo:   http://localhost:${PORT}/admin.html`);
  console.log(` 🔍 Sitemap Google (SEO):    http://localhost:${PORT}/sitemap.xml`);
  console.log(` 🤖 Robots.txt (SEO):        http://localhost:${PORT}/robots.txt`);
  console.log(` 📈 Salud SEO Actual:        ${seoStatus.score}/100 (${seoStatus.currentSeason})`);
  console.log('====================================================');
});
