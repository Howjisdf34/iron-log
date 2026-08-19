import type { MetadataRoute } from "next";

/**
 * PWA manifest (CLAUDE.md §5.5). El shortcut de "Historial" queda para
 * cuando exista esa ruta (Fase 6) — un shortcut a una página que no existe
 * todavía sería peor que no tenerlo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Iron Log",
    short_name: "Iron Log",
    description: "Gestor de rutinas de gimnasio con seguimiento granular por serie.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Empezar entrenamiento",
        url: "/",
        description: "Continuar o empezar un entrenamiento",
      },
    ],
  };
}
