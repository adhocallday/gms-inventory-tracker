'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const tooltipStyle = {
  backgroundColor: 'var(--color-bg-elevated)',
  border: '1px solid var(--color-bg-border)',
  borderRadius: '8px',
  color: 'var(--color-text-primary)',
  fontSize: '12px',
};

const axisTick = { fill: 'var(--color-text-muted)', fontSize: 12 };

const compactUsd = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `$${Math.round(n / 1_000)}k` : `$${Math.round(n)}`;

export type CategoryDatum = {
  category: string;
  units: number;
  share: number;
  color: string;
};

/** Units by category: one bar per category, colour fixed per category, direct-labelled. */
export function CategoryMixChart({ data }: { data: CategoryDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 56)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-bg-border)" />
        <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="category"
          width={130}
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-bg-elevated)', opacity: 0.5 }}
          contentStyle={tooltipStyle}
          formatter={(value: number, _name, item) => [
            `${value.toLocaleString('en-US')} units (${((item.payload as CategoryDatum).share * 100).toFixed(1)}%)`,
            'Units',
          ]}
        />
        <Bar dataKey="units" radius={[0, 4, 4, 0]} barSize={20}>
          {data.map((d) => (
            <Cell key={d.category} fill={d.color} />
          ))}
          <LabelList
            dataKey="share"
            position="right"
            formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            style={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export type MonthDatum = { label: string; gross: number; shows: number };

/** Gross by month: a single series, so one hue and no legend. */
export function MonthlyTotalsChart({ data }: { data: MonthDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 8, bottom: 4, left: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--color-bg-border)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <YAxis tickFormatter={compactUsd} tick={axisTick} axisLine={false} tickLine={false} width={56} />
        <Tooltip
          cursor={{ fill: 'var(--color-bg-elevated)', opacity: 0.5 }}
          contentStyle={tooltipStyle}
          formatter={(value: number, _name, item) => [
            `${value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} across ${(item.payload as MonthDatum).shows} show${(item.payload as MonthDatum).shows === 1 ? '' : 's'}`,
            'Gross',
          ]}
        />
        <Bar dataKey="gross" fill="var(--color-red-primary)" radius={[4, 4, 0, 0]} maxBarSize={56}>
          <LabelList
            dataKey="gross"
            position="top"
            formatter={compactUsd}
            style={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
