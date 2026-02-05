import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { AgeDistribution } from '@/types';

interface AgeChartProps {
  data: AgeDistribution;
}

const LABELS: Record<keyof AgeDistribution, string> = {
  under18: '<18',
  age18to34: '18-34',
  age35to54: '35-54',
  age55to74: '55-74',
  age75plus: '75+',
};

function AgeChartInner({ data }: AgeChartProps) {
  const chartData = (Object.keys(LABELS) as (keyof AgeDistribution)[]).map((key) => ({
    name: LABELS[key],
    value: data[key],
  }));

  return (
    <div data-testid="age-chart">
      <h3 className="mb-2 text-sm font-medium">Age Distribution</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip formatter={(value: number) => [`${value}%`, 'Population']} />
          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const AgeChart = React.memo(AgeChartInner);
