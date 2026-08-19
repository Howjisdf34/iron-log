"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface WeightChartProps {
  data: { date: string; value: number; avg: number }[];
}

/** Peso corporal con media móvil de 7 días (CLAUDE.md §5.4) — la línea diaria sola es ruidosa (hidratación, comida), la media móvil es la que importa. */
export function WeightChart({ data }: WeightChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            unit="kg"
            domain={["dataMin - 1", "dataMax + 1"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="value"
            name="Peso"
            stroke="var(--chart-3)"
            strokeWidth={1}
            dot={{ r: 2 }}
          />
          <Line
            type="monotone"
            dataKey="avg"
            name="Media móvil 7d"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
