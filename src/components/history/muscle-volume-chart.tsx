"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  MAV_REFERENCE_SETS_PER_WEEK,
  MEV_REFERENCE_SETS_PER_WEEK,
} from "@/lib/muscle-volume";

interface MuscleVolumeChartProps {
  data: { muscleName: string; effectiveSets: number }[];
}

/** Series efectivas por músculo esta semana, con bandas MEV/MAV orientativas (CLAUDE.md §5.4). */
export function MuscleVolumeChart({ data }: MuscleVolumeChartProps) {
  return (
    <div style={{ height: Math.max(180, data.length * 32) }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            horizontal={false}
          />
          <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
          <YAxis
            type="category"
            dataKey="muscleName"
            width={90}
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          <ReferenceLine
            x={MEV_REFERENCE_SETS_PER_WEEK}
            stroke="var(--chart-4)"
            strokeDasharray="4 4"
            label={{
              value: "MEV",
              position: "top",
              fill: "var(--chart-4)",
              fontSize: 11,
            }}
          />
          <ReferenceLine
            x={MAV_REFERENCE_SETS_PER_WEEK}
            stroke="var(--chart-2)"
            strokeDasharray="4 4"
            label={{
              value: "MAV",
              position: "top",
              fill: "var(--chart-2)",
              fontSize: 11,
            }}
          />
          <Bar dataKey="effectiveSets" fill="var(--primary)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
