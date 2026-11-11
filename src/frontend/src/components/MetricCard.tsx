import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  changePercent?: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changePercent,
  subtitle,
  icon,
}) => {
  const isPositive = typeof change === 'number' ? change > 0 : String(change || '').startsWith('+');
  const isNegative = typeof change === 'number' ? change < 0 : String(change || '').startsWith('-');

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
      <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
        <span>{title}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="text-xl font-bold text-slate-100 tracking-tight">{value}</div>

      {(change !== undefined || changePercent !== undefined) && (
        <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
          {isPositive && (
            <span className="flex items-center text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/50">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {change !== undefined && `${change} `}
              {changePercent !== undefined && `(${changePercent}%)`}
            </span>
          )}
          {isNegative && (
            <span className="flex items-center text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/50">
              <TrendingDown className="w-3 h-3 mr-0.5" />
              {change !== undefined && `${change} `}
              {changePercent !== undefined && `(${changePercent}%)`}
            </span>
          )}
          {!isPositive && !isNegative && (
            <span className="flex items-center text-slate-400 bg-slate-800/60 px-1.5 py-0.5 rounded">
              <Minus className="w-3 h-3 mr-0.5" />
              {change !== undefined && `${change} `}
              {changePercent !== undefined && `(${changePercent}%)`}
            </span>
          )}
          {subtitle && <span className="text-slate-500 font-normal ml-1">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
