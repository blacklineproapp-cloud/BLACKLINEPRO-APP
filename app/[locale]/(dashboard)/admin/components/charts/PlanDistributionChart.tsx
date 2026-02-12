'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface PlanDistributionChartProps {
  data: {
    free: number;
    starter: number;
    pro: number;
    studio: number;
    enterprise: number;
  };
}

const PLAN_COLORS: Record<string, string> = {
  Free: '#71717a',
  Starter: '#3b82f6',
  Pro: '#10b981',
  Studio: '#a855f7',
  Enterprise: '#f43f5e',
};

export function PlanDistributionChart({ data }: PlanDistributionChartProps) {
  const chartData = [
    { name: 'Free', value: data.free },
    { name: 'Starter', value: data.starter },
    { name: 'Pro', value: data.pro },
    { name: 'Studio', value: data.studio },
    { name: 'Enterprise', value: data.enterprise },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
        Sem dados de planos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || '#71717a'} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            color: '#e4e4e7',
            fontSize: '12px',
          }}
          formatter={(value: any, name: any) => [`${value} usuários`, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
