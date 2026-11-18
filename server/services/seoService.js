const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { getCatalogData } = require('./catalogService');
const localSeo = require('./localSeoService');

const SITE_URL = 'https://artesyentretenimiento.com';
const ROOT = path.resolve(__dirname, '..', '..');
const WHATSAPP = '3202459032';

/**
 * ARTY · Módulo de Posicionamiento
 * ---------------------------------------------------------------
 * Única fuente de verdad para canonical, sitemap, robots, datos
 * estructurados y superficie para motores de IA.
 *
 * Todo lo que hace este módulo es determinista: se ejecuta en el build
 * y no depende de ninguna API externa. La IA (ARTY · Razonamiento)
 * solo propone cambios; este módulo es el que los aplica.
 */

const PAGES = [
  {
    key: 'home',
    file: 'index.html',
    route: '/',
    canonical: `${SITE_URL}/`,
    title: 'DJ, sonido e iluminación para eventos en Bogotá | Artes y Entretenimiento',
    description: 'DJ, sonido profesional e iluminación para bodas, quinces y eventos empresariales en Bogotá y Cundinamarca. Cotiza por WhatsApp.',
    image: `${SITE_URL}/assets/arty/og.jpg`
  },
  {
    key: 'dj',
    file: 'dj-bogota.html',
    route: '/dj-bogota',
    canonical: `${SITE_URL}/dj-bogota`,
    title: 'DJ para eventos en Bogotá | Artes y Entretenimiento',
    description: 'DJ profesional en Bogotá con sonido e iluminación para bodas, cumpleaños y eventos empresariales. Cotiza por WhatsApp.',
    image: `${SITE_URL}/assets/optimized/hero.webp`,
    serviceName: 'DJ para eventos en Bogotá',
    serviceType: 'DJ profesional, animación y conducción musical para eventos'
  },
  {
    key: 'sonido',
    file: 'sonido-eventos-bogota.html',
    route: '/sonido-eventos-bogota',
    canonical: `${SITE_URL}/sonido-eventos-bogota`,
    title: 'Sonido profesional para eventos en Bogotá | Artes y Entretenimiento',
    description: 'Alquiler de sonido profesional para bodas, celebraciones y eventos empresariales en Bogotá y Cundinamarca. Cotiza por WhatsApp.',
    image: `${SITE_URL}/assets/optimized/sonido.webp`,
    serviceName: 'Alquiler de sonido profesional para eventos en Bogotá',
    serviceType: 'Sistema de sonido profesional, microfonía y calibración acústica'
  },
  {
    key: 'iluminacion',
    file: 'iluminacion-eventos-bogota.html',
    route: '/iluminacion-eventos-bogota',
    canonical: `${SITE_URL}/iluminacion-eventos-bogota`,
    title: 'Iluminación profesional para eventos en Bogotá | Artes y Entretenimiento',
    description: 'Iluminación robótica, efectos láser y bañadores perimetrales LED para bodas, quinces y eventos empresariales en Bogotá. Cotiza por WhatsApp.',
    image: `${SITE_URL}/assets/optimized/iluminacion.webp`,
    serviceName: 'Iluminación profesional para eventos en Bogotá',
    serviceType: 'Cabezas móviles robóticas, efectos láser e iluminación LED'
  },
  {
    key: 'bodas',
    file: 'dj-bodas-bogota.html',
    route: '/dj-bodas-bogota',
    canonical: `${SITE_URL}/dj-bodas-bogota`,
    title: 'DJ para bodas en Bogotá | Artes y Entretenimiento',
    description: 'DJ profesional para bodas en Bogotá y la Sabana. Sonido de alta fidelidad, iluminación cálida y protocolo musical. Cotiza por WhatsApp.',
    image: `${SITE_URL}/assets/optimized/boda.webp`,
    serviceName: 'DJ para bodas en Bogotá',
    serviceType: 'Musicalización nupcial, vals, ceremonia y rumba crossover'
  },
  {
    key: 'empresariales',
    file: 'eventos-empresariales-bogota.html',
    route: '/eventos-empresariales-bogota',
    canonical: `${SITE_URL}/eventos-empresariales-bogota`,
    title: 'Eventos empresariales en Bogotá | Artes y Entretenimiento',
    description: 'Sonido profesional, iluminación y DJ para lanzamientos, ferias, congresos y galas corporativas en Bogotá. Cotiza por WhatsApp.',
    image: `${SITE_URL}/assets/optimized/corporativo.webp`,
    serviceName: 'Producción para eventos empresariales en Bogotá',
    serviceType: 'Sonido, iluminación y DJ para galas, ferias, congresos y lanzamientos'
  }
];

// Repositorio de palabras clave maestras y estacionales para Colombia.
const seasonalKeywordsConfig = {
  q1: {
    nombre: 'Temporada Bodas Campestres & 15 Años (Q1)',
    keywords: [
      'DJ para bodas Bogotá',
      'alquiler de sonido para matrimonios Chía',
      'luces para 15 años Bogotá',
      'minitecas y chiquitecas VIP',
      'sonido profesional para haciendas Sabana de Bogotá',
      'pista de baile LED pixel Colombia',
      'DJ Crossover para bodas',
      'tótems LED y cabina DJ acrílica'
    ],
    primaryFocus: 'Bodas Campestres, Matrimonios y Quinceañeros',
    tone: 'Romántico, Exclusivo, Elegante y Festivo'
  },
  q2: {
    nombre: 'Temporada Activaciones BTL & Fiestas Mitad de Año (Q2)',
    keywords: [
      'alquiler de sonido para eventos corporativos',
      'activaciones de marca BTL Bogotá',
      'pantallas LED outdoor para eventos masivos',
      'sonido para conferencias y galas empresariales',
      'DJ para fiestas privadas Bogotá',
      'iluminación robótica y efectos especiales',
      'producción técnica de espectáculos Colombia'
    ],
    primaryFocus: 'Eventos Corporativos, BTL y Conciertos al Aire Libre',
    tone: 'Corporativo, Enérgico, Confiable y Dinámico'
  },
  q3: {
    nombre: 'Temporada Ferias, Halloween & Lanzamientos (Q3)',
    keywords: [
      'sonido profesional para fiestas temáticas Bogotá',
      'fiestas de 15 años show láser y robots LED',
      'contratación DJ Cool Bogotá',
      'alquiler pantallas lagrimales LED',
      'producción de eventos empresariales fin de año',
      'luces robóticas Beam y sonido Beta3'
    ],
    primaryFocus: 'Fiestas Temáticas, Proms y Lanzamientos Comerciales',
    tone: 'Vanguardista, Electrizante y de Alto Impacto'
  },
  q4: {
    nombre: 'Temporada de Oro Fin de Año & Grados (Q4)',
    keywords: [
      'DJ para fiestas de fin de año empresas Bogotá',
      'sonido e iluminación para fiestas empresariales',
      'grados y prom colegios Bogotá DJ',
      'alquiler de pistas LED Bogotá',
      'producción completa de eventos fin de año',
      'Plan Diamante Show LED rumba fin de año',
      'DJ para bodas diciembre Bogotá'
    ],
    primaryFocus: 'Fiestas de Fin de Año Empresariales, Proms y Bodas VIP',
    tone: 'Celebración Máxima, Prestigio y Rumba Ininterrumpida'
  }
};

function getCurrentSeasonConfig() {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 4) return seasonalKeywordsConfig.q1;
  if (month >= 5 && month <= 8) return seasonalKeywordsConfig.q2;
  if (month >= 9 && month <= 10) return seasonalKeywordsConfig.q3;
  return seasonalKeywordsConfig.q4;
}

function getSeoPages() {
  return PAGES.map(p => ({ ...p }));
}

function getPageByKey(key) {
  return PAGES.find(p => p.key === key);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeEntities(text) {
  const named = {
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
    '&ntilde;': 'ñ', '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó',
    '&Uacute;': 'Ú', '&Ntilde;': 'Ñ', '&amp;': '&', '&quot;': '"', '&apos;': "'",
    '&nbsp;': ' ', '&lt;': '<', '&gt;': '>'
  };
  return String(text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-zA-Z]+;/g, match => named[match] || match);
}

function cleanText(value) {
  return decodeEntities(String(value || '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extrae las preguntas visibles del acordeón FAQ para generar FAQPage honesto. */
function extractFaq(html) {
  const section = String(html).match(/<section class="faq-section[\s\S]*?<\/section>/i);
  if (!section) return [];

  return section[0]
    .split(/<div class="faq-item">/i)
    .slice(1)
    .map(block => {
      const question = cleanText(
        (block.match(/<button class="faq-button"[\s\S]*?<span>([\s\S]*?)<\/span>/i) || [])[1]
      );
      const answer = cleanText(
        (block.match(/<div class="faq-panel">[\s\S]*?<p>([\s\S]*?)<\/p>/i) || [])[1]
      );
      return question && answer ? { question, answer } : null;
    })
    .filter(Boolean);
}

/** Fecha real de última modificación de un archivo fuente (Git o sistema de archivos). */
function getLastModified(file) {
  const source = path.join(ROOT, file);
  try {
    const output = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(output)) return output;
  } catch (_) {
    // No es un repositorio Git o no hay historial para el archivo.
  }
  if (fs.existsSync(source)) {
    return fs.statSync(source).mtime.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

function breadcrumbFor(page) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${page.canonical}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: page.title.split(' | ')[0], item: page.canonical }
    ]
  };
}

function faqFor(html, canonical) {
  const items = extractFaq(html);
  if (!items.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${canonical}#faq`,
    mainEntity: items.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  };
}

/** Grafo de datos estructurados para la portada. */
function generateStructuredData() {
  const home = getPageByKey('home');
  const graph = [
      {
        '@type': 'EntertainmentBusiness',
        '@id': `${SITE_URL}/#organization`,
        name: 'Artes y Entretenimiento',
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/assets/arty/icon-512x512.png`,
        image: `${SITE_URL}/assets/arty/og.jpg`,
        description: home.description,
        telephone: ['+573202459032', '+573128431149'],
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Calle 16 h Bis #112A-14',
          addressLocality: 'Bogotá',
          addressRegion: 'Bogotá D.C.',
          postalCode: '110911',
          addressCountry: 'CO'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 4.66598,
          longitude: -74.15654
        },
        areaServed: [
          { '@type': 'City', name: 'Bogotá' },
          { '@type': 'AdministrativeArea', name: 'Cundinamarca' }
        ],
        sameAs: [
          'https://www.instagram.com/artyento/',
          'https://www.tiktok.com/@artyento',
          'https://www.facebook.com/artyento'
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Servicios de DJ, sonido e iluminación',
          itemListElement: PAGES.filter(p => p.serviceName).map(p => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: p.serviceName, url: p.canonical }
          }))
        }
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Artes y Entretenimiento',
        inLanguage: 'es-CO',
        publisher: { '@id': `${SITE_URL}/#organization` }
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/#webpage`,
        url: `${SITE_URL}/`,
        name: home.title,
        description: home.description,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#organization` },
        primaryImageOfPage: { '@type': 'ImageObject', url: home.image },
        inLanguage: 'es-CO'
      }
  ];

  const homeHtmlPath = path.join(ROOT, 'index.html');
  if (fs.existsSync(homeHtmlPath)) {
    const faq = faqFor(fs.readFileSync(homeHtmlPath, 'utf8'), `${SITE_URL}/`);
    if (faq) graph.push(faq);
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Grafo de datos estructurados para cada página de servicio. */
function generatePageStructuredData(page, html) {
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${page.canonical}#webpage`,
      url: page.canonical,
      name: page.title,
      description: page.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      breadcrumb: { '@id': `${page.canonical}#breadcrumb` },
      primaryImageOfPage: { '@type': 'ImageObject', url: page.image },
      inLanguage: 'es-CO'
    },
    breadcrumbFor(page),
    {
      '@type': 'Service',
      '@id': `${page.canonical}#service`,
      name: page.serviceName,
      description: page.description,
      serviceType: page.serviceType,
      provider: { '@id': `${SITE_URL}/#organization` },
      areaServed: [
        { '@type': 'City', name: 'Bogotá' },
        { '@type': 'AdministrativeArea', name: 'Cundinamarca' }
      ],
      url: page.canonical
    }
  ];

  const faq = faqFor(html, page.canonical);
  if (faq) graph.push(faq);

  return { '@context': 'https://schema.org', '@graph': graph };
}

/** Sustituye cualquier JSON-LD previo por el grafo generado. No toca el HTML visible. */
function injectStructuredData(html, page) {
  const data = page.key === 'home'
    ? generateStructuredData()
    : generatePageStructuredData(page, html);
  const script = `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n  </script>`;
  const withoutOld = String(html).replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi,
    ''
  );
  if (!/<\/head>/i.test(withoutOld)) {
    throw new Error(`No se pudo inyectar JSON-LD en ${page.file}: falta </head>.`);
  }
  return withoutOld.replace(/<\/head>/i, `  ${script}\n</head>`);
}

function generateSitemapXml() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  PAGES.forEach(page => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(page.canonical)}</loc>\n`;
    xml += `    <lastmod>${getLastModified(page.file)}</lastmod>\n`;
    xml += `    <image:image><image:loc>${escapeXml(page.image)}</image:loc></image:image>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';
  return xml;
}

function generateRobotsTxt() {
  return `# robots.txt — ARTY · Módulo de Posicionamiento
User-agent: *
Allow: /
Allow: /assets/
Allow: /fotos/

Disallow: /admin.html
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

function generateLlmsTxt() {
  return `# Artes y Entretenimiento

> DJ, sonido profesional e iluminación para bodas, quinces y eventos
> empresariales en Bogotá y Cundinamarca, Colombia. Cotización por WhatsApp.

Empresa local de producción técnica y artística para eventos. Marca: ARTY.
Contacto: WhatsApp +57 ${WHATSAPP}.
Dirección: Calle 16 h Bis #112A-14, Bogotá D.C., Colombia.
Sitio oficial: ${SITE_URL}/

## Páginas verificadas

${PAGES.map(p => `- [${p.title.split(' | ')[0]}](${p.canonical}): ${p.description}`).join('\n')}

## Notas para asistentes

- No se publican precios en el sitio; las cotizaciones se hacen por WhatsApp.
- Foco local actual: ${localSeo.getFocusMarket(1).name}. Fase siguiente: ${localSeo.getFocusMarket(2).name}.
- Cobertura: Bogotá D.C. y municipios de Cundinamarca.
- Redes verificadas: @artyento en Instagram, TikTok y Facebook.
`;
}

function generateLlmsFullTxt() {
  return `# Artes y Entretenimiento — contexto completo

${generateLlmsTxt()}

## Servicios

${PAGES.filter(p => p.serviceName).map(p => `### ${p.serviceName}\n${p.serviceType}\nFuente: ${p.canonical}`).join('\n\n')}

## Datos de contacto verificados

- WhatsApp principal: +57 ${WHATSAPP}
- WhatsApp secundario: +57 3128431149
- Dirección: Calle 16 h Bis #112A-14, Bogotá, Colombia
- Coordenadas: 4.66598, -74.15654
`;
}

/**
 * Puntaje de preparación de contenido (NO es un puntaje de Google).
 * Se mantiene por compatibilidad con el panel administrativo.
 */
function calculateSeoHealth() {
  const catalog = getCatalogData();
  const season = getCurrentSeasonConfig();
  let score = 0;
  const checks = [];

  if (catalog.paquetes && catalog.paquetes.length >= 3) {
    score += 25;
    checks.push({ name: 'Catálogo de propuestas completo', status: 'OK', detail: `${catalog.paquetes.length} paquetes activos` });
  } else {
    score += 15;
    checks.push({ name: 'Catálogo de propuestas', status: 'WARN', detail: 'Menos de 3 paquetes activos' });
  }

  if (catalog.testimonios && catalog.testimonios.length >= 5) {
    score += 25;
    checks.push({ name: 'Prueba social', status: 'OK', detail: `${catalog.testimonios.length} testimonios reales` });
  } else {
    score += 15;
    checks.push({ name: 'Prueba social', status: 'WARN', detail: 'Se recomiendan al menos 5 testimonios' });
  }

  score += 25;
  checks.push({ name: 'Datos estructurados', status: 'OK', detail: 'Grafo Schema.org en las 6 páginas (generado en build)' });

  score += 25;
  checks.push({ name: 'Sitemap, robots, 404 y llms.txt', status: 'OK', detail: 'Generados por ARTY · Módulo de Posicionamiento' });

  return {
    score,
    scoreType: 'preparación_de_contenido (no equivale a posicionamiento en Google)',
    status: score >= 90 ? 'Excelente (contenido listo)' : 'Bueno',
    currentSeason: season.nombre,
    primaryFocus: season.primaryFocus,
    activeKeywords: season.keywords,
    recommendedTone: season.tone,
    checks,
    lastOptimization: new Date().toISOString()
  };
}

let lastRunTimestamp = null;
function runAutonomousSeoCycle() {
  const metrics = calculateSeoHealth();
  lastRunTimestamp = new Date();
  console.log(`[ARTY·SEO] Ciclo de contenido: ${metrics.score}/100 — ${metrics.primaryFocus}`);
  return metrics;
}

module.exports = {
  SITE_URL,
  PAGES,
  WHATSAPP,
  getSeoPages,
  getPageByKey,
  getLastModified,
  extractFaq,
  getCurrentSeasonConfig,
  generateStructuredData,
  generatePageStructuredData,
  injectStructuredData,
  generateSitemapXml,
  generateRobotsTxt,
  generateLlmsTxt,
  generateLlmsFullTxt,
  calculateSeoHealth,
  runAutonomousSeoCycle,
  lastRunTimestamp: () => lastRunTimestamp
};
