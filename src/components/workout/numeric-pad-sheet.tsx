"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "⌫"] as const;

interface NumericPadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Etiqueta de contexto a la izquierda del header ("Peso · Serie 2"). */
  context: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Permite decimales (kg) — reps/RPE enteros no muestran la tecla de coma activa. */
  allowDecimal?: boolean;
}

/** Bottom sheet de edición numérica — decimal con coma, es-ES (CLAUDE.md §5.3). */
export function NumericPadSheet({
  open,
  onOpenChange,
  context,
  value,
  onChange,
  allowDecimal = true,
}: NumericPadSheetProps) {
  const [buffer, setBuffer] = useState(() =>
    value != null ? String(value).replace(".", ",") : "",
  );

  function reset(open: boolean) {
    if (open) setBuffer(value != null ? String(value).replace(".", ",") : "");
  }

  function handleKey(key: (typeof KEYS)[number]) {
    if (key === "⌫") {
      setBuffer((prev) => prev.slice(0, -1));
      return;
    }
    if (key === ",") {
      if (!allowDecimal || buffer.includes(",")) return;
      setBuffer((prev) => (prev.length === 0 ? "0," : `${prev},`));
      return;
    }
    setBuffer((prev) => (prev.length >= 6 ? prev : `${prev}${key}`));
  }

  function commit() {
    const n = Number(buffer.replace(",", "."));
    onChange(buffer.length > 0 && Number.isFinite(n) ? n : null);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        reset(next);
        if (!next) commit();
        else onOpenChange(next);
      }}
    >
      <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 gap-5 rounded-b-none rounded-t-3xl px-[18px] pt-5 pb-[calc(env(safe-area-inset-bottom)+18px)]">
        <DialogHeader className="flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-[14px] font-normal text-ink2">
            {context}
          </DialogTitle>
          <button
            type="button"
            onClick={commit}
            className="text-[15px] font-semibold text-primary"
          >
            Listo
          </button>
        </DialogHeader>

        <p className="text-center text-[56px] leading-none font-semibold tracking-[-0.04em] tabular-nums text-foreground">
          {buffer.length > 0 ? buffer : "–"}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              disabled={key === "," && !allowDecimal}
              onClick={() => handleKey(key)}
              className="flex h-[60px] items-center justify-center rounded-2xl bg-muted text-2xl font-medium text-foreground disabled:opacity-40"
            >
              {key === "⌫" ? <Delete className="size-6" /> : key}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
