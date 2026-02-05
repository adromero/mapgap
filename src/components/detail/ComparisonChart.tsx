import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { StateAverages } from '@/types';

interface ComparisonChartProps {
  countyIncome: number;
  countyAge: number;
  stateAverages: StateAverages;
  countyName: string;
}

function ComparisonChartInner({
  countyIncome,
  countyAge,
  stateAverages,
  countyName,
}: ComparisonChartProps) {
  const chartData = [
    {
      name: 'Income ($k)',
      county: Math.round(countyIncome / 1000),
      state: Math.round(stateAverages.medianIncome / 1000),
    },
    {
      name: 'Median Age',
      county: countyAge,
      state: stateAverages.medianAge,
    },
  ];

  return (
    <div data-testid="comparison-chart">
      <h3 className="mb-2 text-sm font-medium">County vs State Average</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="county" name={countyName} fill="#6366f1" radius={[4, 4, 0, 0]} />
          <Bar dataKey="state" name="State Avg" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const ComparisonChart = React.memo(ComparisonChartInner);
