import { auth } from "@/server/auth";

// Self-hosted en nuestro propio VPS (no Vercel Edge) — Proxy corre en
// runtime Node.js por defecto desde Next 16, así que reusa el mismo
// authConfig con acceso a Postgres sin necesitar un config "edge" separado.

// manifest/sw.js/iconos/offline tienen que ser públicos: el navegador los
// pide para evaluar instalabilidad de la PWA (CLAUDE.md §5.5) ANTES de
// que haya sesión — bug real, encontrado corriendo Lighthouse en Fase 7
// (ver ADR-025 en docs/ARCHITECTURE.md): sin esto, /manifest.webmanifest
// y /sw.js redirigían a /login y la app nunca era instalable.
const PUBLIC_PATHS = [
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/sw.js",
  "/favicon.png",
  "/apple-touch-icon.png",
];
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/health",
  "/dev",
  "/_next",
  "/favicon.ico",
  "/icons",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("from", pathname);
    return Response.redirect(loginUrl);
  }

  if (req.auth && pathname === "/login") {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
