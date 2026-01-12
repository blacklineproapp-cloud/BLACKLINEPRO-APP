'use client';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  trend: string;
  color: string;
}

export default function MetricCard({
  icon,
  title,
  value,
  subtitle,
  trend,
  color,
}: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-900/20 text-blue-400 border-blue-800/30',
    green: 'bg-green-900/20 text-green-400 border-green-800/30',
    purple: 'bg-purple-900/20 text-purple-400 border-purple-800/30',
    pink: 'bg-pink-900/20 text-pink-400 border-pink-800/30',
    yellow: 'bg-yellow-900/20 text-yellow-400 border-yellow-800/30',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg border ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        {trend === 'live' ? (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        ) : (
          <div className="text-xs text-zinc-500">{trend}</div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-zinc-400">{title}</div>
      <div className="text-xs text-zinc-500 mt-1">{subtitle}</div>
    </div>
  );
}
