import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  indicators?: {
    sma_50?: { time: string; value: number }[];
    sma_200?: { time: string; value: number }[];
    rsi_14?: { time: string; value: number }[];
  };
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  indicators,
  height = 420,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#334155',
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Format data for lightweight-charts
    const formattedCandles = data.map((d) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candleSeries.setData(formattedCandles);

    // Overlay SMA 50
    if (indicators?.sma_50 && indicators.sma_50.length > 0) {
      const sma50Series = chart.addLineSeries({
        color: '#38bdf8',
        lineWidth: 2,
        title: 'SMA 50',
      });
      sma50Series.setData(indicators.sma_50);
    }

    // Overlay SMA 200
    if (indicators?.sma_200 && indicators.sma_200.length > 0) {
      const sma200Series = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        title: 'SMA 200',
      });
      sma200Series.setData(indicators.sma_200);
    }

    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, indicators, height]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2 shadow-2xl">
      <div className="flex items-center justify-between px-3 py-1 text-xs text-slate-400 border-b border-slate-900 mb-2">
        <span className="font-semibold text-slate-300">TradingView Lightweight Canvas Engine</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span> SMA 50</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> SMA 200</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
};
