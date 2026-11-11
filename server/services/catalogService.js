const fs = require('fs');
const path = require('path');

const datosFilePath = path.resolve(__dirname, '../../datos.js');
const paquetesFilePath = path.resolve(__dirname, '../../paquetes.js');

function readCatalogFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const sandbox = {};
  const fn = new Function('sandbox', `
    ${fileContent}
    sandbox.paquetesData = typeof paquetesData !== 'undefined' ? paquetesData : undefined;
    sandbox.artistasData = typeof artistasData !== 'undefined' ? artistasData : undefined;
    sandbox.testimoniosData = typeof testimoniosData !== 'undefined' ? testimoniosData : undefined;
  `);
  fn(sandbox);
  return sandbox;
}

function getCatalogData() {
  try {
    const siteData = readCatalogFile(datosFilePath);
    const packageData = readCatalogFile(paquetesFilePath);
    
    return {
      paquetes: siteData.paquetesData !== undefined ? siteData.paquetesData : packageData.paquetesData || [],
      artistas: siteData.artistasData || [],
      testimonios: siteData.testimoniosData || [],
      marca: {
        nombre: 'Artes y Entretenimiento',
        slogan: 'Vive tu Experiencia. Nosotros ponemos la Magia.',
        telefono: '+57 320 245 90 32',
        whatsapp: '573202459032',
        ciudad: 'Bogotá, Colombia',
        direccion: 'Calle 16 h Bis #112A-14, Bogotá'
      }
    };
  } catch (err) {
    console.error('Error al leer datos.js:', err.message);
    return {
      paquetes: [],
      artistas: [],
      testimonios: [],
      marca: {
        nombre: 'Artes y Entretenimiento',
        telefono: '+57 320 245 90 32',
        whatsapp: '573202459032',
        ciudad: 'Bogotá, Colombia'
      }
    };
  }
}

module.exports = { getCatalogData };
