import { BottomNav } from "@/components/app-shell/bottom-nav";

/**
 * Route group para las pantallas con navegación persistente (todo menos
 * el Workout Player, login y offline, que son de pantalla completa). Ver
 * docs/design-system.md — el pb-24 de cada página deja espacio para esta
 * barra fija.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
