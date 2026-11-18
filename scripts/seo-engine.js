const fs = require('fs');
const path = require('path');
const localSeo = require('../server/services/localSeoService');

/**
 * ARTY · Motor de priorización SEO
 * ---------------------------------------------------------------
 * Convierte datos reales (Search Console + auditoría) en una cola de
 * acciones ordenada por impacto. Sin API de IA: es aritmética y lógica
 * sobre hechos verificables.
 *
 * La "potencia" del algoritmo está en decidir QUÉ hacer mañana:
 *   1. Striking distance → optimizar la página que ya casi posiciona.
 *   2. Brecha de contenido → no hay página que responda esa búsqueda.
 *   3. Enlazado interno → páginas huérfanas o débilmente conectadas.
 *   4. Tendencia → comparar con la ejecución anterior.
 */

const STOPWORDS = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'en', 'y', 'a', 'o',
  'por', 'para', 'con', 'sin', 'se', 'su', 'sus', 'mi', 'tu', 'al', 'del', 'como',
  'que', 'qué', 'cuándo', 'cuando', 'dónde', 'donde', 'cómo', 'cuánto', 'cuanto',
  'es', 'son', 'ser', 'hay', 'más', 'mas', 'mejor', 'cerca', 'sobre', 'para'
]);

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

/** Coincidencia entre una búsqueda y una página, 0 a 1. */
function matchScore(query, page) {
  const queryTokens = tokenize(query);
  const pageTokens = tokenize([page.title, page.serviceName || '', page.description].join(' '));
  if (!queryTokens.length || !pageTokens.length) return 0;
  const hits = queryTokens.filter(token => pageTokens.includes(token)).length;
  return Number((hits / queryTokens.length).toFixed(2));
}

function classify(query, bestMatch) {
  const position = Number(query.position) || 0;
  if (position >= 4 && position <= 20) return 'optimizar_pagina_existente';
  if (bestMatch < 0.25) return 'brecha_de_contenido';
  return 'monitorear';
}

function analyzeOpportunities(queries, pages) {
  if (!Array.isArray(queries) || !queries.length) return [];

  return queries.map(query => {
    const position = Number(query.position) || 0;
    // Peso mayor en posiciones 4-20: pequeños cambios pueden mover mucho el CTR.
    const weight = position <= 3 ? 1 : position <= 10 ? 2.5 : position <= 20 ? 2 : 0.8;
    const score = Math.round((query.impressions || 0) * (1 - (query.ctr || 0)) * weight);
    const matches = pages
      .map(page => ({ url: page.canonical, key: page.key, score: matchScore(query.query, page) }))
      .sort((a, b) => b.score - a.score);
    const best = matches[0] || { url: null, score: 0 };

    return {
      query: query.query,
      clicks: query.clicks,
      impressions: query.impressions,
      ctr: query.ctr,
      position,
      opportunityScore: score,
      bestPage: best.url,
      match: best.score,
      action: classify(query, best.score)
    };
  }).sort((a, b) => b.opportunityScore - a.opportunityScore);
}

function analyzeInternalLinks(publicDir, pages) {
  const contents = pages.map(page => {
    const file = path.join(publicDir, page.file);
    return { page, html: fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '' };
  });

  return pages.map(page => {
    const pathname = new URL(page.canonical).pathname;
    const sources = contents
      .filter(other => other.page.key !== page.key && other.html.includes(`href="${pathname}"`))
      .map(other => other.page.key);
    return { url: page.canonical, inbound: sources.length, sources };
  });
}

function snapshot(report) {
  const queries = report.gsc?.queries || [];
  const inspection = report.gsc?.inspection || [];
  return {
    date: new Date().toISOString(),
    score: report.summary?.score ?? null,
    queries: queries.length,
    clicks: queries.reduce((sum, row) => sum + (row.clicks || 0), 0),
    impressions: queries.reduce((sum, row) => sum + (row.impressions || 0), 0),
    indexed: inspection.filter(row => row.verdict === 'PASS').length,
    urlsInspected: inspection.length
  };
}

function trackHistory(report, reportsDir) {
  const historyDir = path.join(reportsDir, 'history');
  const lastFile = path.join(historyDir, 'last.json');
  let previous = null;
  if (fs.existsSync(lastFile)) {
    try {
      previous = JSON.parse(fs.readFileSync(lastFile, 'utf8'));
    } catch (_) {
      previous = null;
    }
  }

  const current = snapshot(report);
  fs.mkdirSync(historyDir, { recursive: true });
  fs.writeFileSync(lastFile, JSON.stringify(current, null, 2), 'utf8');
  fs.appendFileSync(path.join(historyDir, 'history.jsonl'), JSON.stringify(current) + '\n', 'utf8');

  const delta = previous ? {
    clicks: current.clicks - previous.clicks,
    impressions: current.impressions - previous.impressions,
    queries: current.queries - previous.queries,
    indexed: current.indexed - previous.indexed,
    score: current.score - previous.score
  } : null;

  return { current, previous, delta };
}

function weightedScore({ report, opportunities, links }) {
  const errors = report.summary?.errors || 0;
  const warnings = report.summary?.warnings || 0;
  const technical = Math.max(0, 100 - errors * 15 - warnings * 5);
  const gaps = opportunities.filter(o => o.action === 'brecha_de_contenido').length;
  const optimizable = opportunities.filter(o => o.action === 'optimizar_pagina_existente').length;
  const content = Math.max(0, 100 - gaps * 8 - optimizable * 3);
  const weakLinks = links.filter(link => link.inbound < 2).length;
  const structure = Math.max(0, 100 - weakLinks * 10);
  const overall = Math.round(technical * 0.5 + content * 0.3 + structure * 0.2);
  return {
    technical,
    content,
    structure,
    overall,
    label: overall >= 85 ? 'Excelente' : overall >= 70 ? 'Bueno' : overall >= 50 ? 'Mejorable' : 'Crítico'
  };
}

/** Coherencia de nombre, dirección y teléfono en los archivos publicados. */
function checkNap(publicDir, pages) {
  const phone = '3202459032';
  const altPhone = '3128431149';
  const address = localSeo.normalize('Calle 16 h Bis #112A-14');
  // NAP debe coincidir en la portada, el schema local y la superficie para IA.
  // El sitemap y las páginas de servicio no están obligados a repetirlo.
  const files = ['index.html', 'schema/local-business.json', 'llms.txt'];

  return files.map(file => {
    const full = path.join(publicDir, file);
    const content = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
    const checks = {
      exists: Boolean(content),
      phone: content.includes(phone),
      address: localSeo.normalize(content).includes(address)
    };
    return {
      file,
      ...checks,
      ok: checks.exists && checks.phone && checks.address,
      hasAltPhone: content.includes(altPhone)
    };
  });
}

/** Análisis de intención local, empezando por Bogotá. */
function analyzeLocal({ queries, pages, publicDir }) {
  const allQueries = Array.isArray(queries) ? queries : [];
  const localRows = allQueries
    .map(query => ({ ...query, ...localSeo.detectLocalIntent(query.query) }))
    .filter(row => row.isLocal)
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

  return {
    focus: localSeo.getFocusMarket(1),
    markets: localSeo.MARKETS,
    totalQueries: allQueries.length,
    localQueries: localRows.length,
    share: allQueries.length ? Number((localRows.length / allQueries.length).toFixed(2)) : 0,
    topQueries: localRows.slice(0, 12),
    coverageGaps: localSeo.findCoverageGaps(localRows, pages),
    nap: checkNap(publicDir, pages),
    checklist: localSeo.localChecklist()
  };
}

function analyze({ report, pages, publicDir, reportsDir }) {
  const opportunities = analyzeOpportunities(report.gsc?.queries, pages);
  const links = analyzeInternalLinks(publicDir, pages);
  const local = analyzeLocal({ queries: report.gsc?.queries, pages, publicDir });
  const history = trackHistory(report, reportsDir);
  const score = weightedScore({ report, opportunities, links });

  const queue = [
    ...report.issues
      .filter(issue => issue.severity === 'error')
      .map(issue => ({ priority: 1, type: 'correccion_tecnica', detail: `${issue.scope}: ${issue.message}` })),
    ...report.issues
      .filter(issue => issue.severity === 'warning')
      .map(issue => ({ priority: 2, type: 'mejora', detail: `${issue.scope}: ${issue.message}` })),
    ...local.nap
      .filter(item => !item.ok)
      .map(item => ({ priority: 1, type: 'nap_local', detail: `${item.file}: falta teléfono o dirección local coherente` })),
    ...local.checklist
      .filter(item => item.priority === 1)
      .map(item => ({ priority: 1, type: 'google_business_profile', detail: item.action })),
    ...local.coverageGaps
      .slice(0, 5)
      .map(gap => ({ priority: 3, type: 'contenido_local', detail: `"${gap.location}" aparece ${gap.mentions} vez/veces sin página propia; validar con caso real antes de crearla` })),
    ...opportunities
      .filter(item => item.action === 'optimizar_pagina_existente')
      .slice(0, 8)
      .map(item => ({ priority: 2, type: 'optimizar_pagina', detail: `"${item.query}" → ${item.bestPage} (pos ${item.position}, score ${item.opportunityScore})` })),
    ...links
      .filter(link => link.inbound < 2)
      .map(link => ({ priority: 3, type: 'enlazado_interno', detail: `${link.url} solo tiene ${link.inbound} enlace(s) entrante(s)` })),
    ...opportunities
      .filter(item => item.action === 'brecha_de_contenido')
      .slice(0, 8)
      .map(item => ({ priority: 4, type: 'contenido_nuevo', detail: `"${item.query}" (sin página que responda; requiere revisión humana)` }))
  ].sort((a, b) => a.priority - b.priority);

  return { opportunities, links, local, history, score, queue };
}

module.exports = {
  normalize,
  tokenize,
  matchScore,
  analyzeOpportunities,
  analyzeInternalLinks,
  analyze
};
