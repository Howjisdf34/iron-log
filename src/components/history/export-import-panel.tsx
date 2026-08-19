"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** "Mis datos son míos" (CLAUDE.md §5.4) — export a JSON/CSV, restaurar desde un JSON propio. */
export function ExportImportPanel() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmText("");
    setError(null);
    setConfirmOpen(true);
  }

  async function handleConfirmImport() {
    if (!pendingFile) return;
    setImporting(true);
    setError(null);
    try {
      const text = await pendingFile.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudo restaurar el backup");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setImporting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/export?format=json"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Download className="size-4" /> Exportar JSON
        </a>
        <a
          href="/api/export?format=csv"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Download className="size-4" /> Exportar CSV
        </a>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" /> Restaurar backup
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Restaurar este backup?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esto reemplaza TODOS tus datos actuales (rutinas, entrenamientos, PRs, peso
            corporal) por los del archivo. No se puede deshacer. Escribí{" "}
            <strong>restaurar</strong> para confirmar.
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="restaurar"
            className="h-11"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={confirmText !== "restaurar" || importing}
              onClick={handleConfirmImport}
            >
              {importing ? "Restaurando…" : "Restaurar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
