export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-bold text-foreground">Iron Log</h1>
      <p className="text-sm text-muted-foreground">
        Fase 0 en construcción — ver{" "}
        <code className="font-mono">docs/design-system.md</code>.
      </p>
    </main>
  );
}
