import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { downloadCached } from "./download";
import { runFfmpeg } from "./ffmpeg";
import type { NormalizedExercise } from "./normalize";
import { FREE_EXERCISE_DB_IMAGE_BASE } from "./free-exercise-db-types";

export interface MediaDescriptor {
  type: "video" | "gif";
  /** Ruta relativa bajo MEDIA_DIR — se sirve en /media/<localPath>. */
  localPath: string;
  originalUrl: string | null;
  posterPath: string | null;
  durationMs: number | null;
  attribution: string | null;
  license: string | null;
  isPrimary: boolean;
}

const VIDEO_MAX_SECONDS = 8;
const VIDEO_MAX_HEIGHT = 720;

function extFromUrl(url: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|$)/.exec(url);
  return match?.[1]?.toLowerCase() ?? "mov";
}

async function transcodeVideo(sourcePath: string, outDir: string): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const webmPath = join(outDir, "video.webm");
  const mp4Path = join(outDir, "video.mp4");
  const posterPath = join(outDir, "poster.webp");

  const scaleFilter = `scale=-2:'min(${VIDEO_MAX_HEIGHT},ih)'`;

  if (!existsSync(webmPath)) {
    await runFfmpeg([
      "-i",
      sourcePath,
      "-t",
      String(VIDEO_MAX_SECONDS),
      "-vf",
      scaleFilter,
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      "380k",
      "-maxrate",
      "450k",
      "-bufsize",
      "900k",
      "-crf",
      "34",
      "-deadline",
      "good",
      "-cpu-used",
      "3",
      webmPath,
    ]);
  }

  if (!existsSync(mp4Path)) {
    await runFfmpeg([
      "-i",
      sourcePath,
      "-t",
      String(VIDEO_MAX_SECONDS),
      "-vf",
      scaleFilter,
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "30",
      "-maxrate",
      "450k",
      "-bufsize",
      "900k",
      "-movflags",
      "+faststart",
      mp4Path,
    ]);
  }

  if (!existsSync(posterPath)) {
    await runFfmpeg([
      "-i",
      sourcePath,
      "-vf",
      `${scaleFilter},thumbnail`,
      "-frames:v",
      "1",
      "-q:v",
      "4",
      posterPath,
    ]);
  }
}

/**
 * 2 imágenes (inicio/fin) -> WebP animado, 1s por frame, loop infinito.
 * Se usa el demuxer `concat` con duraciones explícitas por archivo — más
 * predecible que armar el timing a mano con filter_complex.
 */
async function makeAnimatedWebp(
  img0: string,
  img1: string,
  outDir: string,
): Promise<void> {
  const outPath = join(outDir, "loop.webp");
  if (existsSync(outPath)) return;
  await mkdir(outDir, { recursive: true });

  const listPath = join(outDir, "_concat.txt");
  const { writeFile, rm } = await import("node:fs/promises");
  const escape = (p: string) => p.replace(/'/g, "'\\''");
  const listContent = [
    `file '${escape(img0)}'`,
    "duration 1",
    `file '${escape(img1)}'`,
    "duration 1",
    `file '${escape(img1)}'`,
  ].join("\n");
  await writeFile(listPath, listContent, "utf-8");

  try {
    await runFfmpeg([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-vf",
      "scale=720:-2:force_original_aspect_ratio=decrease",
      "-fps_mode",
      "vfr",
      "-c:v",
      "libwebp",
      "-lossless",
      "0",
      "-q:v",
      "60",
      "-loop",
      "0",
      "-an",
      outPath,
    ]);
  } finally {
    await rm(listPath, { force: true });
  }
}

export async function processExerciseMedia(
  exercise: NormalizedExercise,
  mediaDir: string,
  rawCacheDir: string,
): Promise<MediaDescriptor[]> {
  const relDir = join("exercises", exercise.slug);
  const outDir = join(mediaDir, relDir);
  const descriptors: MediaDescriptor[] = [];

  if (exercise.wgerVideoUrl) {
    const ext = extFromUrl(exercise.wgerVideoUrl);
    const rawPath = join(rawCacheDir, "videos", `${exercise.slug}.${ext}`);
    await downloadCached(exercise.wgerVideoUrl, rawPath);
    await transcodeVideo(rawPath, outDir);

    const attribution = exercise.wgerVideoAuthor
      ? `${exercise.wgerVideoAuthor} via wger.de`
      : "wger.de";
    const posterRel = join(relDir, "poster.webp");

    descriptors.push({
      type: "video",
      localPath: join(relDir, "video.webm"),
      originalUrl: exercise.wgerVideoUrl,
      posterPath: posterRel,
      durationMs: null,
      attribution,
      license: exercise.licenseNote,
      isPrimary: true,
    });
    descriptors.push({
      type: "video",
      localPath: join(relDir, "video.mp4"),
      originalUrl: exercise.wgerVideoUrl,
      posterPath: posterRel,
      durationMs: null,
      attribution,
      license: exercise.licenseNote,
      isPrimary: true,
    });
    return descriptors.map(normalizeSlashes);
  }

  if (exercise.freeExerciseImageUrls) {
    const [img0Rel, img1Rel] = exercise.freeExerciseImageUrls;
    const img0Url = `${FREE_EXERCISE_DB_IMAGE_BASE}/${img0Rel}`;
    const img1Url = `${FREE_EXERCISE_DB_IMAGE_BASE}/${img1Rel}`;
    const img0Path = join(rawCacheDir, "images", exercise.slug, "0.jpg");
    const img1Path = join(rawCacheDir, "images", exercise.slug, "1.jpg");

    await downloadCached(img0Url, img0Path);
    await downloadCached(img1Url, img1Path);
    await makeAnimatedWebp(img0Path, img1Path, outDir);

    descriptors.push({
      type: "gif",
      localPath: join(relDir, "loop.webp"),
      originalUrl: img0Url,
      posterPath: null,
      durationMs: 2000,
      attribution: "free-exercise-db (yuhonas)",
      license: "Unlicense (dominio público)",
      isPrimary: true,
    });
    return descriptors.map(normalizeSlashes);
  }

  return descriptors;
}

/** Windows usa `\` en join() — la URL/DB siempre quiere `/`. */
function normalizeSlashes(d: MediaDescriptor): MediaDescriptor {
  return {
    ...d,
    localPath: d.localPath.replace(/\\/g, "/"),
    posterPath: d.posterPath ? d.posterPath.replace(/\\/g, "/") : null,
  };
}
