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
import type { IncomeDistribution } from '@/types';

interface IncomeChartProps {
  data: IncomeDistribution;
}

const LABELS: Record<keyof IncomeDistribution, string> = {
  under25k: '<$25k',
  income25kTo50k: '$25-50k',
  income50kTo75k: '$50-75k',
  income75kTo100k: '$75-100k',
  over100k: '>$100k',
};

function IncomeChartInner({ data }: IncomeChartProps) {
  const chartData = (Object.keys(LABELS) as (keyof IncomeDistribution)[]).map((key) => ({
    name: LABELS[key],
    value: data[key],
  }));

  return (
    <div data-testid="income-chart">
      <h3 className="mb-2 text-sm font-medium">Income Brackets</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip formatter={(value: number) => [`${value}%`, 'Households']} />
          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const IncomeChart = React.memo(IncomeChartInner);
