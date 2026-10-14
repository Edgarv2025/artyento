const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'assets', 'optimized');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const imagesToProcess = [
  { src: path.join(root, 'fotos', 'hero.png'), out: 'hero.webp', width: 1920, quality: 82 },
  { src: path.join(root, 'assets', 'boda_3.jpg'), out: 'boda.webp', width: 1200, quality: 80 },
  { src: path.join(root, 'assets', 'corp_3.jpg'), out: 'corporativo.webp', width: 1200, quality: 80 },
  { src: path.join(root, 'assets', 'bar_3.jpg'), out: 'sonido.webp', width: 1200, quality: 80 },
  { src: path.join(root, 'assets', 'lagrimales.png'), out: 'iluminacion.webp', width: 1200, quality: 80 },
  { src: path.join(root, 'fotos', 'bodas', 'bodas.png'), out: 'galeria_1.webp', width: 800, quality: 80 },
  { src: path.join(root, 'assets', 'boda_3.jpg'), out: 'galeria_2.webp', width: 800, quality: 80 },
  { src: path.join(root, 'fotos', 'corporativo', 'corporativo.png'), out: 'galeria_3.webp', width: 800, quality: 80 },
  { src: path.join(root, 'assets', 'bar_2.jpg'), out: 'galeria_4.webp', width: 800, quality: 80 },
  { src: path.join(root, 'assets', 'bautizo_2.jpg'), out: 'galeria_5.webp', width: 800, quality: 80 },
  { src: path.join(root, 'assets', 'bautizo_3.jpg'), out: 'galeria_6.webp', width: 800, quality: 80 },
  { src: path.join(root, 'assets', 'outdor 3x2.png'), out: 'galeria_7.webp', width: 800, height: 600, fit: 'cover', quality: 80 },
  { src: path.join(root, 'assets', 'bar_3.jpg'), out: 'galeria_8.webp', width: 800, height: 600, fit: 'cover', position: 'bottom', quality: 80 },
  { src: path.join(root, 'assets', 'djcool-promo.jpg'), out: 'social_1.webp', width: 600, quality: 80 },
  { src: path.join(root, 'assets', 'boda_3.jpg'), out: 'social_2.webp', width: 600, quality: 80 },
  { src: path.join(root, 'assets', 'corp_3.jpg'), out: 'social_3.webp', width: 600, quality: 80 },
  { src: path.join(root, 'assets', 'bar_3.jpg'), out: 'social_4.webp', width: 600, quality: 80 },
  { src: path.join(root, 'assets', 'lagrimales.png'), out: 'social_5.webp', width: 600, quality: 80 },
  { src: path.join(root, 'assets', 'bar_2.jpg'), out: 'social_6.webp', width: 600, quality: 80 }
];

async function run() {
  console.log('Optimizando imágenes para alto rendimiento...');
  for (const item of imagesToProcess) {
    if (fs.existsSync(item.src)) {
      const destPath = path.join(outDir, item.out);
      await sharp(item.src)
        .resize(item.height
          ? { width: item.width, height: item.height, fit: item.fit, position: item.position }
          : { width: item.width, withoutEnlargement: true })
        .webp({ quality: item.quality })
        .toFile(destPath);
      console.log(`✓ Generado: ${item.out}`);
    } else {
      console.warn(`! Archivo no encontrado: ${item.src}`);
    }
  }

}

run().catch((error) => {
  console.error('Error al optimizar imágenes:', error);
  process.exitCode = 1;
});
