"use client";

import { useEffect, useState } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { SystemMetric } from "@/lib/data";
import {
  useCryptoData,
  useFearGreedIndex,
  useOsintMetrics,
} from "@/hooks/useApiData";
import type { CryptoPrice, FearGreedIndex } from "@/lib/api";

// Individual metric card
interface MetricCardProps {
  metric: SystemMetric;
  compact?: boolean;
}

function MetricCard({ metric, compact = false }: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(metric.value);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate value changes
  useEffect(() => {
    if (displayValue !== metric.value) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayValue(metric.value);
        setIsAnimating(false);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [metric.value, displayValue]);

  const statusColorClass = {
    normal: "text-status-active",
    warning: "text-alert",
    critical: "text-critical",
  }[metric.status];

  const statusGlowClass = {
    normal: "glow-green",
    warning: "glow-amber",
    critical: "glow-red",
  }[metric.status];

  const deltaColorClass = {
    positive: "text-status-active",
    negative: "text-critical",
    neutral: "text-text-muted",
  }[metric.deltaType];

  const deltaIcon = {
    positive: "▲",
    negative: "▼",
    neutral: "◆",
  }[metric.deltaType];

  const statusIndicatorType = {
    normal: "active" as const,
    warning: "alert" as const,
    critical: "critical" as const,
  }[metric.status];

  if (compact) {
    return (
      <div className="flex items-center justify-between py-2 px-3 border-b border-divider last:border-b-0 hover:bg-base-750 transition-colors duration-150">
        <div className="flex items-center gap-2">
          <StatusIndicator
            status={statusIndicatorType}
            size="sm"
            pulse={metric.status !== "normal"}
          />
          <span className="text-xxs font-semibold tracking-wider text-text-muted uppercase">
            {metric.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-sm font-medium tabular-nums ${statusColorClass}`}
          >
            {displayValue.toLocaleString()}
            {metric.unit && (
              <span className="text-text-muted ml-0.5 text-xs">
                {metric.unit}
              </span>
            )}
          </span>
          <span
            className={`text-xxs font-mono tabular-nums ${deltaColorClass}`}
          >
            {deltaIcon} {Math.abs(metric.delta)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-800 border border-divider p-3 flex flex-col gap-2 hover:border-divider/80 transition-colors duration-150">
      {/* Header with label and status */}
      <div className="flex items-center justify-between">
        <span className="text-xxs font-semibold tracking-widest text-text-muted uppercase">
          {metric.label}
        </span>
        <StatusIndicator
          status={statusIndicatorType}
          size="sm"
          pulse={metric.status !== "normal"}
        />
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        <span
          className={`
            font-mono text-2xl font-semibold tabular-nums
            ${statusColorClass}
            ${statusGlowClass}
            ${isAnimating ? "opacity-50" : "opacity-100"}
            transition-opacity duration-150
          `}
        >
          {displayValue.toLocaleString()}
        </span>
        {metric.unit && (
          <span className="text-xs font-mono text-text-muted uppercase">
            {metric.unit}
          </span>
        )}
      </div>

      {/* Delta indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`text-xxs font-mono font-medium tabular-nums ${deltaColorClass}`}
        >
          {deltaIcon} {Math.abs(metric.delta)}
          {metric.unit}
        </span>
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          VS PREV
        </span>
      </div>
    </div>
  );
}

// Progress bar metric variant
interface ProgressMetricProps {
  label: string;
  value: number;
  maxValue?: number;
  status?: "normal" | "warning" | "critical";
  showPercentage?: boolean;
}

export function ProgressMetric({
  label,
  value,
  maxValue = 100,
  status = "normal",
  showPercentage = true,
}: ProgressMetricProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  const barColorClass = {
    normal: "bg-status-active",
    warning: "bg-alert",
    critical: "bg-critical",
  }[status];

  const barGlowClass = {
    normal: "shadow-[0_0_10px_rgba(34,197,94,0.3)]",
    warning: "shadow-[0_0_10px_rgba(245,158,11,0.3)]",
    critical: "shadow-[0_0_10px_rgba(239,68,68,0.3)]",
  }[status];

  const textColorClass = {
    normal: "text-status-active",
    warning: "text-alert",
    critical: "text-critical",
  }[status];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xxs font-semibold tracking-wider text-text-muted uppercase">
          {label}
        </span>
        {showPercentage && (
          <span
            className={`text-xs font-mono font-medium tabular-nums ${textColorClass}`}
          >
            {percentage.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="h-1 bg-base-600 overflow-hidden">
        <div
          className={`h-full ${barColorClass} ${barGlowClass} transition-all duration-300 ease-linear`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Sparkline metric (simple representation)
interface SparklineMetricProps {
  label: string;
  value: number;
  unit?: string;
  data: number[];
  status?: "normal" | "warning" | "critical";
}

export function SparklineMetric({
  label,
  value,
  unit,
  data,
  status = "normal",
}: SparklineMetricProps) {
  const maxDataValue = Math.max(...data);
  const minDataValue = Math.min(...data);
  const range = maxDataValue - minDataValue || 1;

  const lineColorClass = {
    normal: "stroke-status-active",
    warning: "stroke-alert",
    critical: "stroke-critical",
  }[status];

  const textColorClass = {
    normal: "text-status-active",
    warning: "text-alert",
    critical: "text-critical",
  }[status];

  // Generate SVG path for sparkline
  const height = 24;
  const width = 80;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - minDataValue) / range) * height;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-divider last:border-b-0">
      <div className="flex flex-col gap-0.5">
        <span className="text-xxs font-semibold tracking-wider text-text-muted uppercase">
          {label}
        </span>
        <span
          className={`text-sm font-mono font-medium tabular-nums ${textColorClass}`}
        >
          {value.toLocaleString()}
          {unit && (
            <span className="text-text-muted ml-0.5 text-xs">{unit}</span>
          )}
        </span>
      </div>
      <svg width={width} height={height} className="opacity-60">
        <path
          d={pathD}
          fill="none"
          className={lineColorClass}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// Convert crypto data to system metrics
function cryptoToSystemMetrics(cryptoData: CryptoPrice[]): SystemMetric[] {
  return cryptoData.slice(0, 6).map((coin) => ({
    id: `CRYPTO-${coin.id}`,
    label: coin.symbol,
    value: coin.price,
    unit: "USD",
    delta: parseFloat(coin.priceChangePercent24h.toFixed(2)),
    deltaType:
      coin.priceChangePercent24h >= 0
        ? ("positive" as const)
        : ("negative" as const),
    status:
      Math.abs(coin.priceChangePercent24h) > 10
        ? ("warning" as const)
        : ("normal" as const),
  }));
}

// Main MetricsPanel component
interface MetricsPanelProps {
  metrics?: SystemMetric[];
  layout?: "grid" | "list" | "compact";
  columns?: 2 | 3 | 4;
  showHeader?: boolean;
  title?: string;
  useLiveData?: boolean;
}

export default function MetricsPanel({
  metrics,
  layout = "grid",
  columns = 3,
  showHeader = true,
  title = "SYSTEM METRICS",
  useLiveData = true,
}: MetricsPanelProps) {
  // Fetch live crypto data if enabled
  const {
    data: cryptoData,
    isLoading: cryptoLoading,
    error: cryptoError,
    lastUpdated: cryptoLastUpdated,
    refetch: refetchCrypto,
  } = useCryptoData(6, { enabled: useLiveData });

  const { data: fearGreedData, isLoading: fgLoading } = useFearGreedIndex({
    enabled: useLiveData,
  });

  // Fetch OSINT metrics as fallback
  const {
    data: osintData,
    isLoading: osintLoading,
    refetch: refetchOsint,
  } = useOsintMetrics({
    enabled: useLiveData,
  });

  // Generate metrics from live data or use OSINT metrics
  const [displayMetrics, setDisplayMetrics] = useState<SystemMetric[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Update metrics when live data changes
  useEffect(() => {
    if (useLiveData && cryptoData && cryptoData.length > 0) {
      const liveMetrics = cryptoToSystemMetrics(cryptoData);

      // Add Fear & Greed Index if available
      if (fearGreedData) {
        liveMetrics.unshift({
          id: "FEAR-GREED",
          label: "Fear/Greed",
          value: fearGreedData.value,
          unit: "",
          delta: 0,
          deltaType: fearGreedData.value >= 50 ? "positive" : "negative",
          status:
            fearGreedData.value <= 25 || fearGreedData.value >= 75
              ? "warning"
              : "normal",
        });
      }

      setDisplayMetrics(liveMetrics);
      setLastUpdate(new Date());
    } else if (useLiveData && osintData && osintData.metrics.length > 0) {
      // Use OSINT metrics as fallback when crypto data not available
      const osintMetrics: SystemMetric[] = osintData.metrics.map((m) => ({
        id: m.id,
        label: m.label,
        value: m.value,
        unit: m.unit,
        delta: m.delta,
        deltaType: m.deltaType,
        status: m.status,
      }));
      setDisplayMetrics(osintMetrics);
      setLastUpdate(new Date());
    } else if (metrics) {
      setDisplayMetrics(metrics);
    }
  }, [cryptoData, fearGreedData, osintData, useLiveData, metrics]);

  const isLoading = cryptoLoading || fgLoading || osintLoading;
  const error = cryptoError;

  const handleRefetch = () => {
    refetchCrypto();
    refetchOsint();
  };

  const criticalCount = displayMetrics.filter(
    (m) => m.status === "critical",
  ).length;
  const warningCount = displayMetrics.filter(
    (m) => m.status === "warning",
  ).length;
  const lastUpdateStr =
    (cryptoLastUpdated || lastUpdate).toISOString().substring(11, 19) + "Z";

  const gridColsClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      {showHeader && (
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <span className="panel-title">{title}</span>
            <StatusIndicator
              status={error ? "critical" : isLoading ? "alert" : "active"}
              size="sm"
              pulse={isLoading}
            />
            {criticalCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-critical/10 border border-critical/20">
                <StatusIndicator status="critical" size="sm" />
                <span className="text-xxs font-mono text-critical uppercase tracking-wider">
                  {criticalCount} CRIT
                </span>
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-alert/10 border border-alert/20">
                <StatusIndicator status="alert" size="sm" />
                <span className="text-xxs font-mono text-alert uppercase tracking-wider">
                  {warningCount} WARN
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xxs font-mono text-text-muted tabular-nums">
              {lastUpdateStr}
            </span>
            {useLiveData && (
              <button
                onClick={handleRefetch}
                disabled={isLoading}
                className="text-xxs font-mono text-text-muted hover:text-info uppercase tracking-wider disabled:opacity-50 transition-colors"
              >
                ↻
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <StatusIndicator status="critical" size="lg" />
            <span className="text-xs font-mono text-critical uppercase tracking-wider">
              {error}
            </span>
            <button
              onClick={handleRefetch}
              className="px-3 py-1 text-xxs font-semibold tracking-wider uppercase text-text-secondary hover:text-text-primary bg-base-700 hover:bg-base-600 border border-divider transition-colors"
            >
              RETRY
            </button>
          </div>
        ) : isLoading && displayMetrics.length === 0 ? (
          <div className={`grid ${gridColsClass} gap-2`}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-base-800 border border-divider p-3 animate-pulse"
              >
                <div className="h-3 bg-base-600 rounded w-16 mb-2" />
                <div className="h-6 bg-base-600 rounded w-20" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {layout === "grid" && (
              <div className={`grid ${gridColsClass} gap-2`}>
                {displayMetrics.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            )}

            {layout === "list" && (
              <div className="flex flex-col gap-2">
                {displayMetrics.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} />
                ))}
              </div>
            )}

            {layout === "compact" && (
              <div className="flex flex-col">
                {displayMetrics.map((metric) => (
                  <MetricCard key={metric.id} metric={metric} compact />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Export individual metric component for custom layouts
export { MetricCard };
