import { auth } from "@/server/auth";

// Self-hosted en nuestro propio VPS (no Vercel Edge) — Proxy corre en
// runtime Node.js por defecto desde Next 16, así que reusa el mismo
// authConfig con acceso a Postgres sin necesitar un config "edge" separado.

const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/health", "/dev", "/_next", "/favicon.ico"];

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
