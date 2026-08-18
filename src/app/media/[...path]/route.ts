import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

/**
 * Sirve /media/exercises/* desde MEDIA_DIR (volumen persistente). Ver
 * docs/ARCHITECTURE.md ADR-005 sobre por qué esto no vive en `public/`.
 * Soporta Range requests — sin esto, <video> no reproduce ni permite seek
 * en iOS Safari.
 */

const MIME_BY_EXT: Record<string, string> = {
  webm: "video/webm",
  mp4: "video/mp4",
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

// turbopackIgnore: la ruta depende de MEDIA_DIR (env var) + segmentos de
// runtime — el bundler no puede probar que está acotada a una subcarpeta
// fija y, sin este opt-out, traza TODO el proyecto (incluida data/raw, que
// llega a pesar GBs) dentro del output standalone. La seguridad de acceso
// la garantiza resolveSafePath (chequeo de traversal), no el tracer.
function mediaRoot(): string {
  return resolve(/* turbopackIgnore: true */ process.cwd(), process.env.MEDIA_DIR || "./media");
}

function resolveSafePath(segments: string[]): string | null {
  const root = mediaRoot();
  const target = normalize(join(/* turbopackIgnore: true */ root, ...segments));
  if (!target.startsWith(root)) return null; // path traversal
  return target;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const filePath = resolveSafePath(segments);
  if (!filePath) return new NextResponse("Not found", { status: 404 });

  let fileStat;
  try {
    fileStat = await stat(/* turbopackIgnore: true */ filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!fileStat.isFile()) return new NextResponse("Not found", { status: 404 });

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";
  const cacheControl = "public, max-age=31536000, immutable";

  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : fileStat.size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileStat.size) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${fileStat.size}` },
      });
    }

    const stream = createReadStream(/* turbopackIgnore: true */ filePath, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": cacheControl,
      },
    });
  }

  const stream = createReadStream(/* turbopackIgnore: true */ filePath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": cacheControl,
    },
  });
}
