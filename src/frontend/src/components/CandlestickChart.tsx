import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CrosshairMode,
  LineStyle
} from 'lightweight-charts';
import { BarChart3, TrendingUp, Sliders, Activity, Calendar } from 'lucide-react';

export interface CandlestickData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandlestickChartProps {
  data: CandlestickData[];
  indicators?: {
    sma_50?: { time: string; value: number }[];
    sma_200?: { time: string; value: number }[];
    rsi_14?: { time: string; value: number }[];
    macd?: { time: string; macd: number; signal: number; histogram: number }[];
  };
  symbol?: string;
  currency?: string;
  height?: number;
}

type ChartType = 'candlestick' | 'line' | 'area';
type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  indicators,
  symbol = 'STOCK',
  currency = 'USD',
  height = 460,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [selectedRange, setSelectedRange] = useState<TimeRange>('3M');
  const [showSMA50, setShowSMA50] = useState(true);
  const [showSMA200, setShowSMA200] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [hoverData, setHoverData] = useState<{
    time: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    change?: number;
    changePct?: number;
    volume?: number;
  } | null>(null);

  // 1. Sanitize & Validate OHLC data
  const validatedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter, validate, and sort ascending by date
    const clean = data
      .filter((d) => d && d.time && !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close))
      .map((d) => ({
        time: d.time,
        open: Number(d.open),
        high: Math.max(Number(d.high), Number(d.open), Number(d.close)),
        low: Math.min(Number(d.low), Number(d.open), Number(d.close)),
        close: Number(d.close),
        volume: d.volume ? Number(d.volume) : 0,
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Remove duplicates
    const unique: CandlestickData[] = [];
    const seenTimes = new Set<string>();
    for (const item of clean) {
      if (!seenTimes.has(item.time)) {
        seenTimes.add(item.time);
        unique.push(item);
      }
    }
    return unique;
  }, [data]);

  // Filter based on range
  const filteredData = useMemo(() => {
    if (validatedData.length === 0) return [];
    if (selectedRange === 'ALL') return validatedData;

    const lastDate = new Date(validatedData[validatedData.length - 1].time);
    let daysToSubtract = 90;
    if (selectedRange === '1W') daysToSubtract = 7;
    else if (selectedRange === '1M') daysToSubtract = 30;
    else if (selectedRange === '3M') daysToSubtract = 90;
    else if (selectedRange === '6M') daysToSubtract = 180;
    else if (selectedRange === '1Y') daysToSubtract = 365;

    const cutoff = new Date(lastDate);
    cutoff.setDate(cutoff.getDate() - daysToSubtract);

    const subset = validatedData.filter((d) => new Date(d.time) >= cutoff);
    return subset.length > 5 ? subset : validatedData;
  }, [validatedData, selectedRange]);

  // Initialize and update Main Chart
  useEffect(() => {
    if (!chartContainerRef.current || filteredData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: showRSI ? height - 120 : height,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#1e293b',
        },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#334155',
        autoScale: true,
      },
    });

    chartRef.current = chart;

    // Series based on chartType
    let mainSeries: any = null;
    if (chartType === 'candlestick') {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      mainSeries.setData(
        filteredData.map((d) => ({
          time: d.time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    } else if (chartType === 'line') {
      mainSeries = chart.addLineSeries({
        color: '#10b981',
        lineWidth: 2,
        crosshairMarkerVisible: true,
      });
      mainSeries.setData(
        filteredData.map((d) => ({
          time: d.time,
          value: d.close,
        }))
      );
    } else if (chartType === 'area') {
      mainSeries = chart.addAreaSeries({
        topColor: 'rgba(16, 185, 129, 0.35)',
        bottomColor: 'rgba(16, 185, 129, 0.02)',
        lineColor: '#10b981',
        lineWidth: 2,
      });
      mainSeries.setData(
        filteredData.map((d) => ({
          time: d.time,
          value: d.close,
        }))
      );
    }

    // Volume overlay
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      });
      chart.priceScale('').applyOptions({
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });
      volumeSeries.setData(
        filteredData.map((d) => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
        }))
      );
    }

    // Indicators: SMA 50
    const filteredTimes = new Set(filteredData.map((d) => d.time));
    if (showSMA50 && indicators?.sma_50) {
      const sma50Data = indicators.sma_50
        .filter((d) => filteredTimes.has(d.time))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      if (sma50Data.length > 0) {
        const sma50Series = chart.addLineSeries({
          color: '#38bdf8',
          lineWidth: 2,
          title: 'SMA 50',
        });
        sma50Series.setData(sma50Data);
      }
    }

    // Indicators: SMA 200
    if (showSMA200 && indicators?.sma_200) {
      const sma200Data = indicators.sma_200
        .filter((d) => filteredTimes.has(d.time))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
      if (sma200Data.length > 0) {
        const sma200Series = chart.addLineSeries({
          color: '#f59e0b',
          lineWidth: 2,
          title: 'SMA 200',
        });
        sma200Series.setData(sma200Data);
      }
    }

    // Hover tooltip tracking
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData || !mainSeries) {
        setHoverData(null);
        return;
      }
      const candle = param.seriesData.get(mainSeries) as any;
      if (candle) {
        const open = candle.open ?? candle.value;
        const close = candle.close ?? candle.value;
        const high = candle.high ?? candle.value;
        const low = candle.low ?? candle.value;
        const change = close - open;
        const changePct = open > 0 ? (change / open) * 100 : 0;

        const timeStr = typeof param.time === 'string' ? param.time : `${(param.time as any).year}-${(param.time as any).month}-${(param.time as any).day}`;
        const origBar = filteredData.find((d) => d.time === timeStr);

        setHoverData({
          time: timeStr,
          open,
          high,
          low,
          close,
          change,
          changePct,
          volume: origBar?.volume,
        });
      }
    });

    chart.timeScale().fitContent();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [filteredData, chartType, showSMA50, showSMA200, showVolume, showRSI, indicators, height]);

  // RSI Sub-panel chart
  useEffect(() => {
    if (!showRSI || !rsiContainerRef.current || !indicators?.rsi_14 || indicators.rsi_14.length === 0) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
      return;
    }

    const container = rsiContainerRef.current;
    if (rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
    }

    const rsiChart = createChart(container, {
      width: container.clientWidth,
      height: 110,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.3)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.3)' },
      },
      timeScale: {
        borderColor: '#334155',
        visible: false,
      },
      rightPriceScale: {
        borderColor: '#334155',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    rsiChartRef.current = rsiChart;

    const filteredTimes = new Set(filteredData.map((d) => d.time));
    const rsiData = indicators.rsi_14
      .filter((d) => filteredTimes.has(d.time))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const rsiSeries = rsiChart.addLineSeries({
      color: '#a855f7',
      lineWidth: 2,
      title: 'RSI (14)',
    });
    rsiSeries.setData(rsiData);

    // 70 overbought line
    rsiSeries.createPriceLine({
      price: 70,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'OB 70',
    });

    // 30 oversold line
    rsiSeries.createPriceLine({
      price: 30,
      color: '#10b981',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'OS 30',
    });

    rsiChart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({
          width: rsiContainerRef.current.clientWidth,
        });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
    };
  }, [showRSI, filteredData, indicators]);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-slate-950/60 rounded-xl border border-slate-800/80 p-8 text-center space-y-3">
        <BarChart3 className="w-10 h-10 text-slate-600 animate-pulse" />
        <div className="text-slate-300 font-semibold text-sm">No Historical Candlestick Data Available</div>
        <p className="text-xs text-slate-500 max-w-sm">
          Market data for <span className="text-emerald-400 font-mono">{symbol}</span> is currently unavailable or awaiting market session open.
        </p>
      </div>
    );
  }

  const latest = filteredData[filteredData.length - 1];
  const displayPrice = hoverData?.close ?? latest?.close;
  const displayChange = hoverData?.change ?? (latest ? latest.close - latest.open : 0);
  const displayPct = hoverData?.changePct ?? (latest && latest.open > 0 ? ((latest.close - latest.open) / latest.open) * 100 : 0);
  const isUp = displayChange >= 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Symbol & Price Summary */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-slate-100 font-mono tracking-tight">{symbol}</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {currency}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-mono font-bold text-slate-100">
                ${displayPrice?.toFixed(2)}
              </span>
              <span className={`text-xs font-mono font-semibold flex items-center ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{displayChange?.toFixed(2)} ({isUp ? '+' : ''}{displayPct?.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Hover Details Bar */}
          {hoverData && (
            <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono text-slate-400 pl-4 border-l border-slate-800">
              <div><span className="text-slate-500">O:</span> ${hoverData.open?.toFixed(2)}</div>
              <div><span className="text-slate-500">H:</span> ${hoverData.high?.toFixed(2)}</div>
              <div><span className="text-slate-500">L:</span> ${hoverData.low?.toFixed(2)}</div>
              <div><span className="text-slate-500">C:</span> ${hoverData.close?.toFixed(2)}</div>
              {hoverData.volume ? <div><span className="text-slate-500">Vol:</span> {(hoverData.volume / 1000).toFixed(0)}k</div> : null}
              <div className="text-slate-400">({hoverData.time})</div>
            </div>
          )}
        </div>

        {/* Chart View Modes & Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Type */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            {(['candlestick', 'line', 'area'] as ChartType[]).map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                  chartType === t ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Overlays Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setShowSMA50(!showSMA50)}
              className={`px-1.5 py-0.5 rounded font-semibold ${showSMA50 ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-500'}`}
            >
              SMA50
            </button>
            <button
              onClick={() => setShowSMA200(!showSMA200)}
              className={`px-1.5 py-0.5 rounded font-semibold ${showSMA200 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-500'}`}
            >
              SMA200
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-1.5 py-0.5 rounded font-semibold ${showVolume ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-500'}`}
            >
              VOL
            </button>
            <button
              onClick={() => setShowRSI(!showRSI)}
              className={`px-1.5 py-0.5 rounded font-semibold ${showRSI ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'text-slate-500'}`}
            >
              RSI
            </button>
          </div>

          {/* Ranges */}
          <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
            {(['1W', '1M', '3M', '6M', '1Y', 'ALL'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                  selectedRange === r ? 'bg-slate-800 text-emerald-400 shadow' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div ref={chartContainerRef} className="w-full relative" />

      {/* RSI Sub-panel */}
      {showRSI && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-purple-400 pb-1">
            <span className="font-bold">Relative Strength Index (RSI 14 Wilder)</span>
            <span className="text-slate-500">OB: 70 | OS: 30</span>
          </div>
          <div ref={rsiContainerRef} className="w-full h-[110px]" />
        </div>
      )}

      {/* Footer Meta & Attribution */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/60 pt-2">
        <div>TradingView Lightweight Charts v4 · Deterministic decimal OHLCV series</div>
        <div>{filteredData.length} Daily Bars Displayed · Green/Red Candles with Wicks</div>
      </div>
    </div>
  );
};
