import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public', 'icons');

// SVG icon with a simple design
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#bg)"/>
  <g fill="white">
    <!-- Pen icon -->
    <path d="M340 140 L372 172 L212 332 L180 300 Z" />
    <path d="M380 132 L400 152 L372 172 L340 140 Z" opacity="0.8"/>
    <path d="M180 300 L212 332 L172 372 L140 340 Z" />
    <path d="M140 340 L172 372 L152 392 L120 360 Z" opacity="0.6"/>
    <!-- Sparkle -->
    <circle cx="320" cy="280" r="8" opacity="0.9"/>
    <circle cx="360" cy="240" r="6" opacity="0.7"/>
    <circle cx="280" cy="320" r="5" opacity="0.6"/>
  </g>
</svg>
`;

async function generateIcons() {
  await mkdir(publicDir, { recursive: true });

  const sizes = [192, 512];

  for (const size of sizes) {
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));

    console.log(`Generated icon-${size}.png`);
  }

  // Also generate favicon
  await sharp(Buffer.from(svgIcon))
    .resize(32, 32)
    .png()
    .toFile(join(__dirname, '..', 'public', 'favicon.png'));

  console.log('Generated favicon.png');
}

generateIcons().catch(console.error);
