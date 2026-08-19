"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OneRepMaxPoint, WeeklyVolumePoint } from "@/lib/exercise-progress";

const axisProps = { stroke: "var(--muted-foreground)", fontSize: 12 };
const tooltipProps = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 12,
  },
  labelStyle: { color: "var(--foreground)" },
};

/** 1RM estimado — Epley (la fórmula que dispara los PRs en el Player) y Brzycki de referencia, CLAUDE.md §5.4. */
export function OneRepMaxChart({ data }: { data: OneRepMaxPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} unit="kg" />
          <Tooltip {...tooltipProps} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="epley"
            name="Epley"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="brzycki"
            name="Brzycki"
            stroke="var(--chart-2)"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MaxWeightChart({ data }: { data: { date: string; weightKg: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} unit="kg" />
          <Tooltip {...tooltipProps} />
          <Line
            type="monotone"
            dataKey="weightKg"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VolumeChart({ data }: { data: WeeklyVolumePoint[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="week" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="volumeKg" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
