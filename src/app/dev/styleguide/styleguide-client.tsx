"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { springs, type SpringName } from "@/lib/motion/springs";

const palette = [
  { token: "background", hex: "#0A0A0B", label: "Fondo base" },
  { token: "card", hex: "#141416", label: "Superficie elevada" },
  { token: "foreground", hex: "#F4F4F5", label: "Texto principal" },
  { token: "muted-foreground", hex: "#A1A1AA", label: "Texto secundario" },
  { token: "primary / accent", hex: "#C6FF3D", label: "Único acento — lima eléctrico" },
  { token: "destructive", hex: "#FF5449", label: "Fallar / error" },
  { token: "success", hex: "#34D399", label: "Confirmación secundaria" },
];

const chartColors = [
  { token: "chart-1", hex: "#C6FF3D" },
  { token: "chart-2", hex: "#22D3EE" },
  { token: "chart-3", hex: "#A78BFA" },
  { token: "chart-4", hex: "#FB923C" },
  { token: "chart-5", hex: "#71717A" },
];

const buttonVariants = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function SpringDemo({ name }: { name: SpringName }) {
  const [bump, setBump] = useState(0);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <motion.div
        key={bump}
        className="size-10 rounded-full bg-primary"
        initial={{ scale: 0.4, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springs[name]}
      />
      <div className="flex-1">
        <p className="font-mono text-sm text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          stiffness {springs[name].stiffness} · damping {springs[name].damping}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => setBump((n) => n + 1)}>
        Reproducir
      </Button>
    </div>
  );
}

export function StyleguideClient() {
  return (
    <main className="mx-auto max-w-3xl space-y-12 p-6 pb-24">
      <header>
        <p className="text-xs text-muted-foreground">/dev/styleguide — sólo desarrollo</p>
        <h1 className="text-2xl font-bold text-foreground">Iron Log — Design System</h1>
      </header>

      <Section title="Paleta">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {palette.map((c) => (
            <div
              key={c.token}
              className="overflow-hidden rounded-2xl border border-border"
            >
              <div className="h-16" style={{ backgroundColor: c.hex }} />
              <div className="bg-card p-3">
                <p className="font-mono text-xs text-foreground">{c.token}</p>
                <p className="text-xs text-muted-foreground">{c.hex}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Paleta cualitativa para gráficas (no es el acento único de UI):
        </p>
        <div className="flex gap-3">
          {chartColors.map((c) => (
            <div key={c.token} className="text-center">
              <div
                className="size-10 rounded-full border border-border"
                style={{ backgroundColor: c.hex }}
              />
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {c.token}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografía">
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-foreground">Aa Iron Log 2026</p>
          <p className="text-base text-foreground">
            Texto de cuerpo — Geist, subset latino.
          </p>
          <p className="text-sm text-muted-foreground">Texto secundario / metadata.</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-primary">
            80.0 kg × 5 reps
          </p>
          <p className="text-xs text-muted-foreground">
            ↑ números tabulares por defecto en toda la app (no bailan al cambiar de
            dígito)
          </p>
        </div>
      </Section>

      <Section title="Springs (en vivo)">
        <div className="space-y-3">
          <SpringDemo name="snappy" />
          <SpringDemo name="smooth" />
          <SpringDemo name="bouncy" />
        </div>
      </Section>

      <Section title="Botones — variantes">
        <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4">
          {buttonVariants.map((v) => (
            <Button key={v} variant={v}>
              {v}
            </Button>
          ))}
          <Button variant="default" disabled>
            disabled
          </Button>
        </div>
      </Section>

      <Section title="Botones — targets táctiles (≥48px)">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <Button size="touch">Completar serie</Button>
          <Button size="icon-touch" variant="outline" aria-label="Restar">
            −
          </Button>
          <Button size="icon-touch" variant="outline" aria-label="Sumar">
            +
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Focus visible con teclado (Tab) usa <code>--ring</code> en lima.
        </p>
      </Section>
    </main>
  );
}
