const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const artySource = path.join(root, 'assets', 'arty', 'ARTY_SIN_FONDO.png');
const outDir = path.join(root, 'assets', 'arty');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('Generando derivados optimizados de ARTY...');

  // 1. ARTY Hero (Escritorio y Móvil)
  await sharp(artySource)
    .resize({ width: 480, height: 480, fit: 'inside' })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(outDir, 'arty-hero.webp'));

  await sharp(artySource)
    .resize({ width: 300, height: 300, fit: 'inside' })
    .webp({ quality: 78, effort: 6 })
    .toFile(path.join(outDir, 'arty-hero-mobile.webp'));

  // 2. ARTY para sección "Conoce a ARTY"
  await sharp(artySource)
    .resize({ width: 400, height: 400, fit: 'inside' })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(outDir, 'arty-conoce.webp'));

  // 3. ARTY para apariciones pequeñas (120px)
  await sharp(artySource)
    .resize({ width: 120, height: 120, fit: 'inside' })
    .webp({ quality: 80, effort: 6 })
    .toFile(path.join(outDir, 'arty-badge.webp'));

  // 4. Cara de ARTY para botón flotante de WhatsApp (96x96)
  // Cara centrada: left 320, top 60, width 620, height 620
  await sharp(artySource)
    .extract({ left: 320, top: 60, width: 620, height: 620 })
    .resize(96, 96)
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(path.join(outDir, 'arty-boton-whatsapp.png'));

  await sharp(artySource)
    .extract({ left: 320, top: 60, width: 620, height: 620 })
    .resize(96, 96)
    .webp({ quality: 85 })
    .toFile(path.join(outDir, 'arty-boton-whatsapp.webp'));

  // 5. Favicons
  await sharp(artySource)
    .extract({ left: 320, top: 60, width: 620, height: 620 })
    .resize(32, 32)
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(path.join(outDir, 'favicon-32x32.png'));

  await sharp(artySource)
    .extract({ left: 320, top: 60, width: 620, height: 620 })
    .resize(180, 180)
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(path.join(outDir, 'apple-touch-icon.png'));

  await sharp(artySource)
    .extract({ left: 320, top: 60, width: 620, height: 620 })
    .resize(512, 512)
    .png({ quality: 85, compressionLevel: 9 })
    .toFile(path.join(outDir, 'icon-512x512.png'));

  // 6. Imagen Open Graph / Twitter Card (1200x630)
  // Fondo carbón (#0A0A0D), texto a la izquierda, línea dorada (#C9A85C), ARTY a la derecha
  const artyOg = await sharp(artySource)
    .resize({ height: 560 })
    .toBuffer();

  const svgText = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <style>
        .brand { font-family: 'Inter', -apple-system, sans-serif; font-size: 52px; font-weight: 600; fill: #F5F0E1; }
        .sub { font-family: 'Inter', -apple-system, sans-serif; font-size: 24px; font-weight: 400; fill: #C4BFB3; }
        .line { stroke: #C9A85C; stroke-width: 2; }
      </style>
      <text x="80" y="270" class="brand">Artes y Entretenimiento</text>
      <line x1="80" y1="305" x2="680" y2="305" class="line" />
      <text x="80" y="355" class="sub">DJ, sonido profesional e iluminación para eventos</text>
      <text x="80" y="395" class="sub">Bogotá · Colombia</text>
    </svg>
  `;

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 10, g: 10, b: 13, alpha: 1 }
    }
  })
    .composite([
      { input: Buffer.from(svgText), top: 0, left: 0 },
      { input: artyOg, top: 35, left: 660 }
    ])
    .jpeg({ quality: 85 })
    .toFile(path.join(outDir, 'og.jpg'));

  console.log('✓ Derivados de ARTY generados exitosamente.');

  // Calcular peso total de los archivos web servidos
  const webFiles = [
    'arty-hero.webp',
    'arty-hero-mobile.webp',
    'arty-conoce.webp',
    'arty-badge.webp',
    'arty-boton-whatsapp.png',
    'favicon-32x32.png',
    'apple-touch-icon.png'
  ];

  let totalBytes = 0;
  console.log('\n--- TAMAÑOS DE ARCHIVOS ARTY ---');
  for (const f of webFiles) {
    const s = fs.statSync(path.join(outDir, f)).size;
    totalBytes += s;
    console.log(`${f}: ${(s / 1024).toFixed(1)} KB`);
  }
  console.log(`TOTAL: ${(totalBytes / 1024).toFixed(1)} KB (Límite: 150 KB)`);
}

run().catch(console.error);
