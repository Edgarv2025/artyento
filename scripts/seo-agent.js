require('dotenv').config();
const fs = require('fs');
const path = require('path');
const seo = require('../server/services/seoService');
const engine = require('./seo-engine');

/**
 * ARTY · Módulo de Posicionamiento — Auditoría
 * ---------------------------------------------------------------
 * Corre después del build. No modifica el sitio: solo genera un
 * reporte accionable en reports/.
 *
 *   node scripts/seo-agent.js            → auditoría local
 *   node scripts/seo-agent.js --gsc      → + datos reales de Search Console
 *   node scripts/seo-agent.js --ai       → + propuestas de ARTY (requiere API key)
 */

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const REPORTS = path.join(ROOT, 'reports');
const args = new Set(process.argv.slice(2));

const issues = [];
const report = {
  generatedAt: new Date().toISOString(),
  site: seo.SITE_URL,
  mode: 'local',
  pages: [],
  siteChecks: [],
  issues: [],
  gsc: null,
  engine: null,
  proposals: null,
  summary: {}
};

function add(severity, scope, check, message) {
  issues.push({ severity, scope, check, message });
}

function read(relativePath) {
  const full = path.join(PUBLIC, relativePath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

function firstMatch(html, regex) {
  const match = String(html || '').match(regex);
  return match ? match[1].trim() : null;
}

function meta(html, name, attribute = 'name') {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return firstMatch(html, new RegExp(`<meta[^>]*${attribute}=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i'))
    || firstMatch(html, new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attribute}=["']${escaped}["'][^>]*>`, 'i'));
}

function parseLdJson(html) {
  const blocks = [...String(html).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  const parsed = [];
  blocks.forEach((block, index) => {
    try {
      parsed.push(JSON.parse(block[1]));
    } catch (error) {
      add('error', 'html', 'json-ld', `Bloque JSON-LD #${index + 1} inválido: ${error.message}`);
    }
  });
  return parsed;
}

function auditPage(page) {
  const html = read(page.file);
  const result = {
    key: page.key,
    file: page.file,
    url: page.canonical,
    checks: {}
  };
  if (!html) {
    add('error', page.file, 'archivo', 'No existe en public/ (¿se ejecutó npm run build?)');
    return result;
  }

  const title = firstMatch(html, /<title>([\s\S]*?)<\/title>/i);
  const description = meta(html, 'description');
  const canonical = firstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
  const robots = meta(html, 'robots');
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const ld = parseLdJson(html);
  const graph = ld.length ? (ld[0]['@graph'] || [ld[0]]) : [];
  const types = graph.map(node => node['@type']);
  const visibleFaq = seo.extractFaq(html);
  const schemaFaq = graph.find(node => node['@type'] === 'FAQPage');
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map(match => match[0]);

  result.checks = {
    title: title || null,
    titleLength: title ? title.length : 0,
    description: description || null,
    descriptionLength: description ? description.length : 0,
    canonical: canonical || null,
    robots: robots || null,
    h1Count,
    jsonLdTypes: types,
    visibleFaqCount: visibleFaq.length,
    schemaFaqCount: schemaFaq ? schemaFaq.mainEntity.length : 0,
    imageCount: images.length,
    imagesWithoutAlt: images.filter(tag => !/\balt\s*=/.test(tag)).length,
    imagesWithoutDimensions: images.filter(tag => /\bsrc=["'][^"']+["']/.test(tag) && (!/\bwidth\s*=/.test(tag) || !/\bheight\s*=/.test(tag))).length,
    heavyImageRefs: images
      .map(tag => firstMatch(tag, /src=["'](assets\/[^"']+)["']/i))
      .filter(Boolean)
      .filter(src => {
        const full = path.join(PUBLIC, src);
        return fs.existsSync(full) && fs.statSync(full).size > 300 * 1024;
      })
  };

  if (!title) add('error', page.file, 'title', 'Falta <title>.');
  else if (title.length < 20 || title.length > 75) add('warning', page.file, 'title', `Título de ${title.length} caracteres (recomendado 20-75).`);

  if (!description) add('error', page.file, 'description', 'Falta meta description.');
  else if (description.length < 70 || description.length > 165) add('warning', page.file, 'description', `Descripción de ${description.length} caracteres (recomendado 70-165).`);

  if (canonical !== page.canonical) add('error', page.file, 'canonical', `Esperado ${page.canonical}, encontrado ${canonical}.`);
  if (!robots || !/index/.test(robots)) add('warning', page.file, 'robots', 'Falta meta robots index,follow.');
  if (h1Count !== 1) add(h1Count === 0 ? 'error' : 'warning', page.file, 'h1', `Se encontraron ${h1Count} etiquetas H1 (debe haber 1).`);

  if (!types.length) add('error', page.file, 'json-ld', 'No hay datos estructurados.');
  if (page.key === 'home' && !types.includes('EntertainmentBusiness')) {
    add('error', page.file, 'json-ld', 'Falta EntertainmentBusiness en la portada.');
  }
  if (page.key !== 'home' && (!types.includes('Service') || !types.includes('BreadcrumbList'))) {
    add('error', page.file, 'json-ld', 'Falta Service o BreadcrumbList en la página de servicio.');
  }
  if (visibleFaq.length && (!schemaFaq || schemaFaq.mainEntity.length !== visibleFaq.length)) {
    add('warning', page.file, 'faq', `FAQ visible (${visibleFaq.length}) y FAQ en Schema (${schemaFaq ? schemaFaq.mainEntity.length : 0}) no coinciden.`);
  }

  ['og:title', 'og:description', 'og:image', 'og:url'].forEach(property => {
    if (!meta(html, property, 'property')) add('warning', page.file, 'open-graph', `Falta ${property}.`);
  });
  if (meta(html, 'og:url', 'property') && meta(html, 'og:url', 'property') !== page.canonical) {
    add('warning', page.file, 'open-graph', 'og:url no coincide con el canonical.');
  }

  if (result.checks.imagesWithoutAlt) {
    add('warning', page.file, 'imagenes', `${result.checks.imagesWithoutAlt} imagen(es) sin atributo alt.`);
  }
  if (result.checks.imagesWithoutDimensions) {
    add('warning', page.file, 'imagenes', `${result.checks.imagesWithoutDimensions} imagen(es) sin width/height.`);
  }
  if (result.checks.heavyImageRefs.length) {
    add('error', page.file, 'imagenes', `Referencias JPG/PNG pesadas: ${result.checks.heavyImageRefs.join(', ')}.`);
  }

  return result;
}

function auditSite() {
  const wrangler = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8');
  const notFound = /"not_found_handling"\s*:\s*"([^"]+)"/.exec(wrangler)?.[1];
  report.siteChecks.push({ check: 'not_found_handling', value: notFound });
  if (notFound !== '404-page') {
    add('error', 'sitio', 'soft-404', `not_found_handling = ${notFound}; debe ser "404-page".`);
  }

  const notFoundHtml = read('404.html');
  if (!notFoundHtml) add('error', 'sitio', '404', 'Falta public/404.html.');
  else if (!/noindex/i.test(notFoundHtml)) add('warning', 'sitio', '404', 'La página 404 debería llevar noindex.');

  const robots = read('robots.txt');
  report.siteChecks.push({ check: 'robots.txt', ok: Boolean(robots && /Sitemap:/i.test(robots)) });
  if (!robots) add('error', 'sitio', 'robots.txt', 'No se generó robots.txt.');
  else {
    if (!/Sitemap:\s*https:\/\//i.test(robots)) add('error', 'sitio', 'robots.txt', 'Falta la directiva Sitemap.');
    if (!/Disallow:\s*\/admin\.html/i.test(robots)) add('warning', 'sitio', 'robots.txt', 'No se bloquea /admin.html.');
  }

  const sitemap = read('sitemap.xml');
  if (!sitemap) add('error', 'sitio', 'sitemap.xml', 'No se generó sitemap.xml.');
  else {
    const canonicals = seo.getSeoPages().map(p => p.canonical);
    canonicals.forEach(url => {
      if (!sitemap.includes(`<loc>${url}</loc>`)) add('error', 'sitio', 'sitemap.xml', `Falta ${url} en el sitemap.`);
    });
    const today = new Date().toISOString().split('T')[0];
    [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].forEach(match => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(match[1]) || match[1] > today) {
        add('error', 'sitio', 'sitemap.xml', `lastmod inválido o futuro: ${match[1]}.`);
      }
    });
  }

  if (!read('llms.txt')) add('warning', 'sitio', 'llms.txt', 'No se generó llms.txt para motores de IA.');

  const heavy = [];
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        const size = fs.statSync(full).size;
        if (size > 1024 * 1024) heavy.push({ file: path.relative(PUBLIC, full).replace(/\\/g, '/'), mb: Number((size / 1048576).toFixed(2)) });
      }
    }
  }
  walk(PUBLIC);
  report.siteChecks.push({ check: 'archivos > 1MB', items: heavy.sort((a, b) => b.mb - a.mb) });
  if (heavy.length) {
    add('warning', 'sitio', 'peso', `${heavy.length} archivo(s) superan 1 MB en public/ (inflan el despliegue).`);
  }
}

function renderMarkdown(data) {
  const lines = [
    '# Reporte de posicionamiento — ARTY',
    '',
    `Generado: ${data.generatedAt}`,
    `Sitio: ${data.site}`,
    `Modo: ${data.mode}`,
    '',
    '## Resumen',
    '',
    `- Errores: ${data.summary.errors}`,
    `- Advertencias: ${data.summary.warnings}`,
    `- Páginas auditadas: ${data.pages.length}`,
    '',
    '## Hallazgos priorizados',
    ''
  ];

  if (!data.issues.length) lines.push('Sin hallazgos. Todo correcto.', '');
  data.issues.forEach(issue => {
    lines.push(`- **[${issue.severity.toUpperCase()}]** \`${issue.scope}\` · ${issue.check}: ${issue.message}`);
  });

  lines.push('', '## Páginas', '');
  data.pages.forEach(page => {
    lines.push(`- ${page.url} — H1: ${page.checks.h1Count}, Schema: ${(page.checks.jsonLdTypes || []).join(', ')}, FAQ: ${page.checks.schemaFaqCount}/${page.checks.visibleFaqCount}`);
  });

  if (data.engine) {
    lines.push('', '## Motor de priorización ARTY', '');
    lines.push(`- Salud ponderada: **${data.engine.score.overall}/100 (${data.engine.score.label})** — técnica ${data.engine.score.technical}, contenido ${data.engine.score.content}, estructura ${data.engine.score.structure}`);
    if (data.engine.history.delta) {
      const d = data.engine.history.delta;
      lines.push(`- Tendencia vs. ejecución anterior: clics ${d.clicks >= 0 ? '+' : ''}${d.clicks}, impresiones ${d.impressions >= 0 ? '+' : ''}${d.impressions}, URLs indexadas ${d.indexed >= 0 ? '+' : ''}${d.indexed}.`);
    } else {
      lines.push('- Tendencia: primera ejecución. Se guardó una instantánea en `reports/history/` para comparar mañana.');
    }
    lines.push('', '### Cola de acciones', '');
    if (!data.engine.queue.length) lines.push('- Sin acciones pendientes.');
    data.engine.queue.slice(0, 15).forEach(item => {
      lines.push(`- **P${item.priority}** · ${item.type}: ${item.detail}`);
    });
  }

  if (data.engine?.local) {
    const local = data.engine.local;
    lines.push('', '## Enfoque local — Bogotá primero', '');
    lines.push(`- Foco actual: **${local.focus.name}** (${local.focus.status}).`);
    lines.push(`- Consultas con intención local: ${local.localQueries} de ${local.totalQueries} (${Math.round(local.share * 100)}%).`);
    if (local.topQueries.length) {
      lines.push('', '### Búsquedas locales con más impresiones', '');
      local.topQueries.forEach(query => {
        lines.push(`- ${query.query} — posición ${query.position}, ${query.impressions} impresiones (${query.locations.join(', ')})`);
      });
    } else {
      lines.push('- Sin datos locales todavía: conecta Search Console para medir la intención local real.');
    }
    const napBad = local.nap.filter(item => !item.ok);
    lines.push('', `### Coherencia NAP (${local.nap.length - napBad.length}/${local.nap.length} archivos correctos)`, '');
    if (napBad.length) napBad.forEach(item => lines.push(`- ${item.file}: le falta teléfono o dirección coherente.`));
    else lines.push('- Nombre, dirección y teléfono coherentes en todos los archivos publicados.');
    lines.push('', '### Checklist local', '');
    local.checklist.forEach(item => lines.push(`- [${item.owner}] ${item.action} — ${item.why}`));
  }

  if (data.gsc) {
    lines.push('', '## Google Search Console', '', `Propiedad: ${data.gsc.siteUrl}`, '', '### Consultas principales', '');
    data.gsc.queries.slice(0, 15).forEach(row => {
      lines.push(`- ${row.query} — ${row.clicks} clics, ${row.impressions} impresiones, posición ${row.position}`);
    });
    lines.push('', '### Estado de indexación', '');
    data.gsc.inspection.forEach(row => {
      lines.push(`- ${row.url} — ${row.verdict} / ${row.coverageState}`);
    });
  }

  if (data.proposals) {
    lines.push('', '## Propuestas de ARTY', '', data.proposals.markdown || 'Sin propuestas.');
  }

  return lines.join('\n') + '\n';
}

async function main() {
  if (!fs.existsSync(PUBLIC)) {
    console.error('No existe public/. Ejecuta primero: npm run build');
    process.exitCode = 1;
    return;
  }

  seo.getSeoPages().forEach(page => report.pages.push(auditPage(page)));
  auditSite();

  if (args.has('--gsc')) {
    report.mode = 'local + gsc';
    try {
      const gsc = require('./gsc-client');
      report.gsc = await gsc.fetchGscData(seo.getSeoPages());
    } catch (error) {
      add('warning', 'gsc', 'conexión', error.message);
      report.mode = 'local (gsc no disponible)';
    }
  }

  report.summary = {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    score: Math.max(0, 100 - issues.filter(i => i.severity === 'error').length * 15 - issues.filter(i => i.severity === 'warning').length * 5)
  };
  report.issues = issues;

  report.engine = engine.analyze({
    report,
    pages: seo.getSeoPages(),
    publicDir: PUBLIC,
    reportsDir: REPORTS
  });

  if (args.has('--ai')) {
    try {
      const advisor = require('./ai-advisor');
      report.proposals = await advisor.generate({
        report,
        season: seo.getCurrentSeasonConfig(),
        pages: seo.getSeoPages()
      });
      report.mode += ' + ia';
    } catch (error) {
      add('warning', 'ia', 'conexión', error.message);
      report.proposals = { markdown: `No se pudieron generar propuestas: ${error.message}` };
    }
  }

  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(path.join(REPORTS, 'seo-audit.json'), JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(path.join(REPORTS, 'seo-audit.md'), renderMarkdown(report), 'utf8');

  console.log(`ARTY · Auditoría: ${report.summary.errors} errores, ${report.summary.warnings} advertencias, salud ${report.summary.score}/100`);
  console.log(`Reportes: reports/seo-audit.json y reports/seo-audit.md`);
  issues.forEach(issue => console.log(`  [${issue.severity.toUpperCase()}] ${issue.scope} · ${issue.check}: ${issue.message}`));

  if (report.summary.errors > 0) process.exitCode = 1;
}

main().catch(error => {
  console.error('ARTY · Error en la auditoría:', error);
  process.exitCode = 1;
});
