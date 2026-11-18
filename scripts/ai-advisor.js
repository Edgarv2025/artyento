/**
 * ARTY · Razonamiento (opcional)
 * ---------------------------------------------------------------
 * Propone acciones de posicionamiento usando datos reales del reporte
 * y de Search Console. NUNCA escribe en el sitio ni publica por su cuenta.
 *
 * Proveedores soportados (sin dependencias nuevas):
 *   GEMINI_API_KEY  → Gemini 2.0 Flash
 *   OPENAI_API_KEY  → gpt-4o-mini
 * Sin clave: genera propuestas deterministas con los datos disponibles.
 */

function buildContext({ report, season, pages }) {
  const issues = report.issues.slice(0, 20).map(i => `- [${i.severity}] ${i.scope}: ${i.message}`).join('\n');
  const queries = report.gsc?.queries?.slice(0, 20)
    .map(q => `- "${q.query}" (${q.clicks} clics, ${q.impressions} impresiones, posición ${q.position})`)
    .join('\n') || '- Sin datos de Search Console en esta ejecución.';
  const urls = pages.map(p => `${p.canonical} → ${p.title}`).join('\n');
  return {
    issues,
    queries,
    urls,
    season: `${season.nombre}. Enfoque: ${season.primaryFocus}. Tono: ${season.tone}.`,
    keywords: season.keywords.join(', ')
  };
}

function buildPrompt(context) {
  return `Eres ARTY, el agente principal de la marca Artes y Entretenimiento (DJ, sonido e iluminación para eventos en Bogotá, Colombia).

Tu tarea es proponer acciones de posicionamiento para el responsable del sitio. NO tienes permiso para publicar ni modificar archivos.

REGLAS ESTRICTAS:
- No inventes precios, servicios, fechas, clientes, premios ni datos de contacto.
- Usa SOLO la información de contexto. Si algo no está en el contexto, no lo afirmes.
- Prioriza por impacto. Distingue "corrección técnica" de "oportunidad de contenido".
- Escribe en español de Colombia, con tono cercano, profesional y festivo propio de ARTY.
- Devuelve Markdown con estas secciones: 1) Acciones inmediatas, 2) Oportunidades de contenido, 3) Preguntas que el negocio debe responder.

CONTEXTO — Hallazgos de la auditoría:
${context.issues}

CONTEXTO — Consultas reales de Google Search Console:
${context.queries}

CONTEXTO — Temporada actual:
${context.season}

CONTEXTO — Palabras clave de temporada:
${context.keywords}

CONTEXTO — Páginas existentes:
${context.urls}`;
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2500 }
      })
    }
  );
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
  if (!text) throw new Error('Gemini devolvió una respuesta vacía.');
  return text;
}

async function callOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('OpenAI devolvió una respuesta vacía.');
  return text;
}

function deterministicProposals(context, report) {
  const errors = report.issues.filter(i => i.severity === 'error');
  const warnings = report.issues.filter(i => i.severity === 'warning');

  const opportunities = report.gsc?.queries?.length
    ? report.gsc.queries
      .filter(q => q.position >= 4 && q.position <= 30 && q.impressions >= 10)
      .slice(0, 10)
      .map(q => `- **${q.query}** — posición ${q.position}, ${q.impressions} impresiones. Revisar si alguna página existente responde esta búsqueda; si no, proponer contenido nuevo con revisión humana.`)
    : ['- Sin datos de Search Console: conecta la cuenta de servicio para priorizar con búsquedas reales.'];

  return [
    '## 1. Acciones inmediatas',
    '',
    ...(errors.length ? errors.map(i => `- **${i.scope} · ${i.check}**: ${i.message}`) : ['- No hay errores técnicos pendientes.']),
    '',
    '## 2. Oportunidades de contenido',
    '',
    ...opportunities,
    '',
    `Temporada activa: ${context.season}`,
    '',
    '## 3. Preguntas que el negocio debe responder',
    '',
    '- ¿Qué zona geográfica se quiere atender primero con contenido nuevo (Bogotá, Chía, Sabana)?',
    '- ¿Qué servicios tienen mayor margen y deberían priorizarse?',
    '- ¿Se cuenta con casos reales y fotos autorizadas para reforzar cada página?',
    '',
    '_Propuestas generadas en modo determinista (sin API de IA). ARTY no publica cambios por su cuenta._'
  ].join('\n');
}

async function generate({ report, season, pages }) {
  const context = buildContext({ report, season, pages });
  const prompt = buildPrompt(context);

  if (process.env.GEMINI_API_KEY) {
    try {
      return { provider: 'Gemini 2.0 Flash', markdown: await callGemini(prompt) };
    } catch (error) {
      console.warn(`[ARTY·IA] Gemini falló (${error.message}); probando OpenAI.`);
    }
  }
  if (process.env.OPENAI_API_KEY) {
    try {
      return { provider: 'OpenAI gpt-4o-mini', markdown: await callOpenAI(prompt) };
    } catch (error) {
      console.warn(`[ARTY·IA] OpenAI falló (${error.message}); usando modo determinista.`);
    }
  }

  return { provider: 'determinista (sin API key)', markdown: deterministicProposals(context, report) };
}

module.exports = { generate };
