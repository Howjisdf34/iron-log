import { WifiOff } from "lucide-react";

/**
 * Fallback del Service Worker (CLAUDE.md §5.5) cuando una navegación falla
 * sin red y no hay nada cacheado para esa página — nunca el dinosaurio de
 * Chrome. Página estática a propósito (sin `dynamic`, sin DB): tiene que
 * poder precachearse en el build, y no depende de nada que sólo exista en
 * runtime.
 */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <WifiOff className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-bold text-foreground">Sin conexión</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Esta pantalla todavía no se guardó para uso offline. Si estabas en medio de un
        entrenamiento, tus series ya registradas están a salvo y se sincronizan solas al
        volver la señal.
      </p>
    </main>
  );
}
