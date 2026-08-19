/**
 * Genera los iconos del manifest (192/512, maskable) a partir de un SVG
 * armado a mano — nada de assets de terceros ni descargas en runtime.
 * El glifo (mancuerna) queda bien adentro del "safe zone" del 80% que
 * exige el spec de iconos maskable, así que el mismo PNG sirve para
 * purpose "any" y "maskable" sin generar dos artes distintos.
 * Uso: pnpm exec tsx scripts/generate-icons.ts
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ACCENT = "#C6FF3D";
const DARK = "#0A0A0B";

function iconSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${ACCENT}"/>
  <rect x="176" y="246" width="160" height="20" rx="10" fill="${DARK}"/>
  <rect x="120" y="186" width="56" height="140" rx="14" fill="${DARK}"/>
  <rect x="336" y="186" width="56" height="140" rx="14" fill="${DARK}"/>
</svg>`;
}

async function main() {
  const iconsDir = join(process.cwd(), "public", "icons");
  await mkdir(iconsDir, { recursive: true });

  const svgBuffer = Buffer.from(iconSvg());

  for (const size of [192, 512]) {
    const png = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    await writeFile(join(iconsDir, `icon-${size}.png`), png);
    await writeFile(join(iconsDir, `icon-maskable-${size}.png`), png);
  }

  const applePng = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  await writeFile(join(process.cwd(), "public", "apple-touch-icon.png"), applePng);

  const faviconPng = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  await writeFile(join(process.cwd(), "public", "favicon.png"), faviconPng);

  console.log(
    "Iconos generados: public/icons/{icon,icon-maskable}-{192,512}.png, public/apple-touch-icon.png, public/favicon.png",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
