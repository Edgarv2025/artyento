/**
 * ARTY · Módulo de Posicionamiento Local
 * ---------------------------------------------------------------
 * Enfoca la plataforma en búsquedas locales, empezando por Bogotá.
 * No crea páginas automáticamente: mide intención local, valida NAP
 * y produce candidatas que un humano revisa antes de publicar.
 */

const MARKETS = [
  {
    key: 'bogota',
    phase: 1,
    name: 'Bogotá D.C.',
    status: 'Foco actual',
    cities: ['Bogotá', 'Bogota'],
    neighborhoods: ['Usaquén', 'Chapinero', 'Santa Fe', 'La Candelaria', 'Teusaquillo', 'Chaparral', 'Suba', 'Engativá', 'Fontibón', 'Kennedy', 'Tunjuelito', 'Usme', 'Ciudad Bolívar']
  },
  {
    key: 'cundinamarca',
    phase: 2,
    name: 'Sabana de Bogotá y Cundinamarca',
    status: 'Siguiente fase',
    cities: ['Chía', 'Chia', 'Soacha', 'Zipaquirá', 'Zipaquira', 'Mosquera', 'Funza', 'Madrid', 'Facatativá', 'Facatativa', 'Sopó', 'Sopo', 'Cajicá', 'Cajica', 'Girardot', 'La Calera']
  },
  {
    key: 'colombia',
    phase: 3,
    name: 'Colombia',
    status: 'Futuro',
    cities: ['Medellín', 'Medellin', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales', 'Villavicencio']
  }
];

const SERVICE_TOKENS = [
  'dj', 'sonido', 'audio', 'iluminacion', 'luces', 'luces roboticas', 'laser',
  'alquiler', 'arriendo', 'contratacion', 'produccion', 'eventos', 'bodas',
  'matrimonios', 'quinces', 'cumpleanos', 'fiestas', 'corporativo', 'empresarial',
  'gala', 'conferencia', 'pista', 'led', 'pantallas', 'catering', 'decoracion'
];

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokens(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function getFocusMarket(phase = 1) {
  return MARKETS.find(market => market.phase === phase) || MARKETS[0];
}

/** Detecta si una consulta tiene intención local y qué zona menciona. */
function detectLocalIntent(query) {
  const queryTokens = tokens(query);
  const locations = [];

  MARKETS.forEach(market => {
    market.cities.concat(market.neighborhoods || []).forEach(place => {
      const placeTokens = tokens(place);
      const matched = placeTokens.length && placeTokens.every(token => queryTokens.includes(token));
      if (matched && !locations.includes(place)) locations.push(place);
    });
  });

  const services = SERVICE_TOKENS.filter(token => {
    const tokenParts = tokens(token);
    return tokenParts.length && tokenParts.some(part => queryTokens.includes(part));
  });

  return {
    query,
    isLocal: locations.length > 0,
    locations,
    services: services.slice(0, 4),
    market: locations.some(place => getFocusMarket(1).cities.concat(getFocusMarket(1).neighborhoods).includes(place))
      ? 'bogota'
      : locations.length ? 'cundinamarca_o_otro' : null
  };
}

/** Área servida para Schema.org según la fase comercial activa. */
function buildAreaServed(phase = 1) {
  return MARKETS
    .filter(market => market.phase <= phase)
    .map(market => ({
      '@type': market.key === 'bogota' ? 'City' : market.key === 'colombia' ? 'Country' : 'AdministrativeArea',
      name: market.name
    }));
}

/** Servicios que aún no tienen una página que responda una zona. */
function findCoverageGaps(localQueries, pages) {
  const pageText = pages.map(page => normalize(`${page.title} ${page.description}`)).join(' ');
  const gaps = new Map();

  localQueries.forEach(row => {
    (row.locations || []).forEach(place => {
      if (pageText.includes(normalize(place))) return;
      const key = normalize(place);
      if (!gaps.has(key)) {
        gaps.set(key, {
          location: place,
          mentions: 0,
          impressions: 0,
          exampleQueries: []
        });
      }
      const entry = gaps.get(key);
      entry.mentions += 1;
      entry.impressions += row.impressions || 0;
      if (entry.exampleQueries.length < 3) entry.exampleQueries.push(row.query);
    });
  });

  return [...gaps.values()].sort((a, b) => b.impressions - a.impressions);
}

/** Checklist accionable: lo que se puede automatizar y lo que no. */
function localChecklist() {
  return [
    {
      owner: 'negocio',
      priority: 1,
      action: 'Google Business Profile: categoría principal "Servicio de entretenimiento" / "DJ", nombre, dirección, teléfono, horario y fotos reales.',
      why: 'El local pack del mapa depende del perfil, no del sitio. Es la palanca más rápida.'
    },
    {
      owner: 'negocio',
      priority: 1,
      action: 'Pedir reseñas reales a clientes de Bogotá y responderlas desde GBP.',
      why: 'Volumen y frescura de reseñas son señales locales fuertes.'
    },
    {
      owner: 'sitio',
      priority: 2,
      action: 'Mantener NAP idéntico (Artes y Entretenimiento · Calle 16 h Bis #112A-14 · +57 320 245 9032) en sitio, GBP y directorios.',
      why: 'Una coma distinta rompe la coincidencia de entidad local.'
    },
    {
      owner: 'sitio',
      priority: 2,
      action: 'Publicar contenido local solo con información real: ubicaciones donde se ha trabajado, tiempos de traslado, venue, casos verificables.',
      why: 'Evita páginas doorway: Google penaliza páginas de ciudad casi idénticas.'
    },
    {
      owner: 'negocio',
      priority: 3,
      action: 'Conseguir menciones y enlaces desde medios, proveedores y cámaras de comercio de Bogotá.',
      why: 'La relevancia local se refuerza con señales locales reales.'
    }
  ];
}

module.exports = {
  MARKETS,
  SERVICE_TOKENS,
  normalize,
  tokens,
  getFocusMarket,
  detectLocalIntent,
  buildAreaServed,
  findCoverageGaps,
  localChecklist
};
