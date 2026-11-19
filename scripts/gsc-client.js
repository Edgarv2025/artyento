require('dotenv').config();
const fs = require('fs');
const crypto = require('crypto');

/**
 * ARTY · Percepción
 * Cliente de Google Search Console sin dependencias externas.
 * Requiere una cuenta de servicio con acceso al dominio en GSC.
 *
 * Variables de entorno:
 *   GSC_SERVICE_ACCOUNT_JSON = ruta al JSON de la cuenta de servicio
 *   GSC_SITE_URL             = https://artesyentretenimiento.com/ (opcional)
 */

const DEFAULT_SITE = 'https://artesyentretenimiento.com/';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function readCredentials() {
  const credentialsPath = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!credentialsPath) {
    throw new Error('Falta GSC_SERVICE_ACCOUNT_JSON (ruta al JSON de la cuenta de servicio).');
  }
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`No se encontró el archivo de credenciales: ${credentialsPath}`);
  }
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('El JSON de credenciales no tiene client_email o private_key.');
  }
  return credentials;
}

async function getAccessToken() {
  const credentials = readCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: credentials.private_key_id || undefined
  };
  const claims = {
    iss: credentials.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(credentials.private_key)
    .toString('base64url');
  const assertion = `${signingInput}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`No se pudo autenticar con Google (${response.status}): ${detail}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function apiRequest(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Search Console API (${response.status}): ${detail}`);
  }
  return response.json();
}

function getSiteUrl() {
  return process.env.GSC_SITE_URL || DEFAULT_SITE;
}

function isoDate(date) {
  return date.toISOString().split('T')[0];
}

async function listSites(token) {
  const data = await apiRequest(token, 'https://searchconsole.googleapis.com/webmasters/v3/sites');
  return (data.siteEntry || []).map(entry => ({
    siteUrl: entry.siteUrl,
    permissionLevel: entry.permissionLevel
  }));
}

async function queryTopQueries(token, siteUrl, days = 28, rowLimit = 25) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const data = await apiRequest(
    token,
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      body: JSON.stringify({
        startDate: isoDate(start),
        endDate: isoDate(end),
        dimensions: ['query'],
        type: 'WEB',
        rowLimit
      })
    }
  );
  return (data.rows || []).map(row => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: Number((row.ctr || 0).toFixed(4)),
    position: Number((row.position || 0).toFixed(1))
  }));
}

async function inspectUrls(token, siteUrl, urls) {
  const results = [];
  for (const url of urls) {
    try {
      const data = await apiRequest(
        token,
        'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
        {
          method: 'POST',
          body: JSON.stringify({ inspectionUrl: url, siteUrl })
        }
      );
      const result = data.inspectionResult || {};
      const indexStatus = result.indexStatusResult || {};
      const pageIndexing = result.pageIndexingInfo || {};
      results.push({
        url,
        verdict: indexStatus.verdict || result.verdict || 'UNKNOWN',
        coverageState: indexStatus.coverageState || pageIndexing.pageIndexingState || 'UNKNOWN',
        canonical: indexStatus.canonicalResult?.userDeclaredCanonical || null,
        googleCanonical: indexStatus.canonicalResult?.googleCanonical || null,
        lastCrawl: result.crawlInfo?.lastCrawlTime || null
      });
    } catch (error) {
      results.push({ url, verdict: 'ERROR', coverageState: error.message });
    }
  }
  return results;
}

async function fetchGscData(pages) {
  const token = await getAccessToken();
  const siteUrl = getSiteUrl();
  const [sites, queries] = await Promise.all([
    listSites(token),
    queryTopQueries(token, siteUrl)
  ]);
  const inspection = await inspectUrls(token, siteUrl, pages.map(p => p.canonical));
  return { siteUrl, sites, queries, inspection, collectedAt: new Date().toISOString() };
}

module.exports = {
  getAccessToken,
  listSites,
  queryTopQueries,
  inspectUrls,
  fetchGscData,
  getSiteUrl
};
