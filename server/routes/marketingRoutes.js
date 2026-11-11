const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const uploadDir = path.resolve(__dirname, '../../campanas');
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const base = (path.basename(file.originalname || 'campaign-image', ext) || 'campaign-image')
        .replace(/\s+/g, '-')
        .toLowerCase();
      cb(null, `${Date.now()}-${base}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.'));
  }
});

const assetUploadDir = path.resolve(__dirname, '../../assets');
const assetUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, assetUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const base = (path.basename(file.originalname || 'asset', ext) || 'asset')
        .replace(/\s+/g, '-')
        .toLowerCase();
      cb(null, `${base}-${Date.now()}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.'));
  }
});

const { getCatalogData } = require('../services/catalogService');
const { getAudiences, getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign } = require('../services/campaignService');
const { generateCommercialContent } = require('../services/aiService');
const { createContentAndPublication, getPublications, getPublicationById, updatePublicationStatus, updatePublicationDetails, deletePublication } = require('../services/publicationService');
const { getLeads, getLeadById, createLead, updateLeadStatus, updateLead, addLeadActivity, getLeadStats, generateWhatsAppResponse } = require('../services/leadService');
const { syncMediaFiles, getMediaItems, updateMediaItem } = require('../services/mediaService');
const { getSocialAccounts, createSocialAccount, updateSocialAccount, recordManualMetric, formatContentForClipboard } = require('../services/socialService');
const { getDashboardAnalytics } = require('../services/analyticsService');

// --- 1. Catálogo Real (datos.js) ---
router.get('/catalog', (req, res) => {
  try {
    const data = getCatalogData();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Listar imágenes disponibles en la carpeta assets/
router.get('/catalog/assets', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const assetsDir = path.resolve(__dirname, '../../assets');
    if (!fs.existsSync(assetsDir)) return res.json({ success: true, data: [] });

    const files = fs.readdirSync(assetsDir)
      .filter(f => ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(path.extname(f).toLowerCase()))
      .map(f => ({
        filename: f,
        path: `assets/${f}`
      }));

    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Subir imagen directamente a assets/
router.post('/catalog/upload-asset', assetUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se recibió ninguna imagen' });
    }
    const relativePath = `assets/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        path: relativePath
      },
      message: 'Imagen subida exitosamente a assets/'
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/catalog/save', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { paquetes, artistas, testimonios } = req.body;
    
    if (!paquetes || !artistas || !testimonios) {
      return res.status(400).json({ success: false, error: 'Faltan datos del catálogo' });
    }

    const fileContent = `const paquetesData = ${JSON.stringify(paquetes, null, 2)};\n\nconst artistasData = ${JSON.stringify(artistas, null, 2)};\n\nconst testimoniosData = ${JSON.stringify(testimonios, null, 2)};\n`;
    
    const datosFilePath = path.resolve(__dirname, '../../datos.js');
    fs.writeFileSync(datosFilePath, fileContent, 'utf8');

    // Sincronizar también con public/datos.js si la carpeta public existe
    const publicDatosPath = path.resolve(__dirname, '../../public/datos.js');
    if (fs.existsSync(path.dirname(publicDatosPath))) {
      try {
        fs.writeFileSync(publicDatosPath, fileContent, 'utf8');
      } catch (e) {}
    }

    res.json({ success: true, message: 'Archivo datos.js actualizado exitosamente en el servidor' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 2. Audiencias ---
router.get('/audiences', (req, res) => {
  try {
    const data = getAudiences();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/campaigns/upload', upload.array('files', 20), (req, res) => {
  try {
    const files = (req.files || []).map(file => ({
      name: file.originalname,
      filename: file.filename,
      url: `/campanas/${file.filename}`
    }));

    res.json({ success: true, data: files });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- 3. Campañas ---
router.get('/campaigns', (req, res) => {
  try {
    const data = getCampaigns();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/campaigns/:id', (req, res) => {
  try {
    const data = getCampaignById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/campaigns', (req, res) => {
  try {
    const data = createCampaign(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/campaigns/:id', (req, res) => {
  try {
    const data = updateCampaign(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, error: 'Campaña no encontrada' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/campaigns/:id', (req, res) => {
  try {
    const data = deleteCampaign(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 4. Generador de Contenido con IA ---
router.post('/ai/generate', async (req, res) => {
  try {
    const result = await generateCommercialContent(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 5. Publicaciones y Calendario ---
router.get('/publications', (req, res) => {
  try {
    const data = getPublications(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/publications', (req, res) => {
  try {
    const data = createContentAndPublication(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/publications/:id', (req, res) => {
  try {
    const data = getPublicationById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Publicación no encontrada' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/publications/:id/status', (req, res) => {
  try {
    const { status, notes } = req.body;
    const data = updatePublicationStatus(req.params.id, status, notes);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/publications/:id', (req, res) => {
  try {
    const data = updatePublicationDetails(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/publications/:id', (req, res) => {
  try {
    const data = deletePublication(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 6. Biblioteca Multimedia ---
router.get('/media', (req, res) => {
  try {
    const data = getMediaItems(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/media/sync', (req, res) => {
  try {
    const data = syncMediaFiles();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/media/:id', (req, res) => {
  try {
    const data = updateMediaItem(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- 7. Redes Sociales y Formato de Publicación ---
router.get('/social', (req, res) => {
  try {
    const data = getSocialAccounts();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/social', (req, res) => {
  try {
    const data = createSocialAccount(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/social/:id', (req, res) => {
  try {
    const data = updateSocialAccount(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/social/metric', (req, res) => {
  try {
    const data = recordManualMetric(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/social/format/:id', (req, res) => {
  try {
    const pub = getPublicationById(req.params.id);
    if (!pub) return res.status(404).json({ success: false, error: 'Publicación no encontrada' });
    const formatted = formatContentForClipboard(pub);
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 8. CRM de Leads ---
router.get('/leads', (req, res) => {
  try {
    const data = getLeads(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/stats', (req, res) => {
  try {
    const data = getLeadStats();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/leads/:id', (req, res) => {
  try {
    const data = getLeadById(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/leads', (req, res) => {
  try {
    const data = createLead(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.patch('/leads/:id/status', (req, res) => {
  try {
    const { status, note } = req.body;
    const data = updateLeadStatus(req.params.id, status, note);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/leads/:id', (req, res) => {
  try {
    const data = updateLead(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/leads/:id/activities', (req, res) => {
  try {
    const { activity_type, description } = req.body;
    addLeadActivity(req.params.id, activity_type || 'Nota interna', description || '');
    const data = getLeadById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/leads/:id/whatsapp', (req, res) => {
  try {
    const data = generateWhatsAppResponse(req.params.id);
    if (!data) return res.status(404).json({ success: false, error: 'Lead no encontrado' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 9. Analítica General ---
router.get('/analytics', (req, res) => {
  try {
    const data = getDashboardAnalytics();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- 10. Posicionamiento SEO Continuo ---
const { calculateSeoHealth, runAutonomousSeoCycle, generateStructuredData } = require('../services/seoService');

router.get('/seo/status', (req, res) => {
  try {
    const health = calculateSeoHealth();
    const structuredData = generateStructuredData();

    res.json({
      success: true,
      data: {
        ...health,
        structuredData
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/seo/refresh', (req, res) => {
  try {
    const health = runAutonomousSeoCycle();
    res.json({
      success: true,
      message: 'Ciclo de optimización SEO continuo ejecutado exitosamente',
      data: health
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
