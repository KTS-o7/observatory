"use client";

import { useState, useEffect } from "react";
import { StatusIndicator } from "./StatusIndicator";

interface OsintMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  delta: number;
  deltaType: "positive" | "negative" | "neutral";
  status: "normal" | "warning" | "critical";
  category: "cyber" | "space" | "infrastructure";
  icon: string;
}

interface OsintSummary {
  totalThreats: number;
  criticalCount: number;
  activeOutages: number;
  spaceWeatherLevel: number;
  iocCount: number;
  malwareSamples: number;
  torExitNodes: number;
  newCves: number;
  urlScans: number;
  isroLaunches: number;
}

interface OsintApiResponse {
  metrics: OsintMetric[];
  summary: OsintSummary;
  sources: Record<string, boolean>;
  lastUpdated: string;
  error?: string;
}

interface MetricCardProps {
  metric: OsintMetric;
}

function MetricCard({ metric }: MetricCardProps) {
  const statusColors = {
    normal: "text-status-active",
    warning: "text-alert",
    critical: "text-critical",
  };

  const statusBg = {
    normal: "bg-status-active/10",
    warning: "bg-alert/10",
    critical: "bg-critical/10",
  };

  const categoryColors = {
    cyber: "border-l-cyber-cyan",
    space: "border-l-info",
    infrastructure: "border-l-alert",
  };

  return (
    <div
      className={`
        bg-base-800 border border-divider rounded
        p-3 flex flex-col gap-1
        border-l-2 ${categoryColors[metric.category]}
        hover:bg-base-750 transition-colors duration-150
      `}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{metric.icon}</span>
        <div
          className={`
            px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider
            ${statusBg[metric.status]} ${statusColors[metric.status]}
          `}
        >
          {metric.status}
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mt-1">
        <span
          className={`text-xl font-mono font-bold tabular-nums ${statusColors[metric.status]}`}
        >
          {typeof metric.value === "number"
            ? metric.value.toLocaleString()
            : metric.value}
        </span>
        {metric.unit && (
          <span className="text-[10px] font-mono text-text-muted uppercase">
            {metric.unit}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">
          {metric.label}
        </span>
        {metric.delta !== 0 && (
          <span
            className={`text-[9px] font-mono ${
              metric.deltaType === "positive"
                ? "text-status-active"
                : metric.deltaType === "negative"
                  ? "text-critical"
                  : "text-text-muted"
            }`}
          >
            {metric.deltaType === "positive"
              ? "▲"
              : metric.deltaType === "negative"
                ? "▼"
                : "◆"}
            {metric.delta}
          </span>
        )}
      </div>
    </div>
  );
}

interface CategorySectionProps {
  title: string;
  icon: string;
  metrics: OsintMetric[];
  color: string;
}

function CategorySection({
  title,
  icon,
  metrics,
  color,
}: CategorySectionProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span>{icon}</span>
        <span
          className={`text-[10px] font-mono font-semibold uppercase tracking-widest ${color}`}
        >
          {title}
        </span>
        <div className="flex-1 h-px bg-divider" />
        <span className="text-[9px] font-mono text-text-muted">
          {metrics.length} metrics
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}

interface SourceStatusProps {
  sources: Record<string, boolean>;
}

function SourceStatus({ sources }: SourceStatusProps) {
  const sourceLabels: Record<string, string> = {
    urlhaus: "URLhaus",
    ransomware: "Ransomware.live",
    feodo: "Feodo Tracker",
    swpc: "SWPC",
    ioda: "IODA",
    threatfox: "ThreatFox",
    malwarebazaar: "MalwareBazaar",
    tor: "Tor Metrics",
    otx: "AlienVault OTX",
    urlscan: "URLScan.io",
    nvd: "NVD/CVE",
    isro: "ISRO Stats",
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {Object.entries(sources).map(([key, active]) => (
        <div
          key={key}
          className={`
            flex items-center gap-1.5 px-2 py-0.5
            text-[8px] font-mono uppercase tracking-wider
            ${active ? "text-status-active" : "text-text-muted/50"}
          `}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              active ? "bg-status-active" : "bg-text-muted/30"
            }`}
          />
          {sourceLabels[key] || key}
        </div>
      ))}
    </div>
  );
}

interface OsintMetricsPanelProps {
  useLiveData?: boolean;
}

export default function OsintMetricsPanel({
  useLiveData = true,
}: OsintMetricsPanelProps) {
  const [data, setData] = useState<OsintApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchData = async () => {
    if (!useLiveData) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/osint");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: OsintApiResponse = await response.json();
      setData(result);
      setLastUpdated(new Date(result.lastUpdated));

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("OSINT metrics fetch error:", err);
      setError("Failed to fetch OSINT data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [useLiveData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!useLiveData) return;

    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [useLiveData]);

  const cyberMetrics =
    data?.metrics.filter((m) => m.category === "cyber") || [];
  const spaceMetrics =
    data?.metrics.filter((m) => m.category === "space") || [];
  const infraMetrics =
    data?.metrics.filter((m) => m.category === "infrastructure") || [];

  const lastUpdateStr = lastUpdated.toISOString().substring(11, 19) + "Z";

  const criticalCount =
    data?.metrics.filter((m) => m.status === "critical").length || 0;
  const warningCount =
    data?.metrics.filter((m) => m.status === "warning").length || 0;

  return (
    <div className="h-full flex flex-col bg-base-850">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">🔍 OSINT METRICS</span>
          <div className="flex items-center gap-1.5">
            <StatusIndicator
              status={error ? "critical" : isLoading ? "info" : "active"}
              size="sm"
              pulse={isLoading}
            />
            <span className="text-xxs font-mono text-text-muted uppercase">
              {isLoading ? "UPDATING" : error ? "ERROR" : "LIVE"}
            </span>
          </div>

          {criticalCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-critical/10 rounded">
              <StatusIndicator status="critical" size="sm" pulse />
              <span className="text-xxs font-mono text-critical uppercase tracking-wider">
                {criticalCount} CRITICAL
              </span>
            </div>
          )}

          {warningCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-alert/10 rounded">
              <StatusIndicator status="alert" size="sm" />
              <span className="text-xxs font-mono text-alert uppercase tracking-wider">
                {warningCount} WARNING
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            UPD: {lastUpdateStr}
          </span>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase text-text-muted hover:text-text-primary bg-base-700 hover:bg-base-600 border border-divider transition-colors disabled:opacity-50"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {data?.summary && (
        <div className="px-3 py-2 border-b border-divider bg-base-800 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              THREATS:
            </span>
            <span className="text-sm font-mono font-bold text-critical tabular-nums">
              {data.summary.totalThreats.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              IOCs:
            </span>
            <span className="text-sm font-mono font-bold text-cyber-cyan tabular-nums">
              {data.summary.iocCount.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              SAMPLES:
            </span>
            <span className="text-sm font-mono font-bold text-alert tabular-nums">
              {data.summary.malwareSamples}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              OUTAGES:
            </span>
            <span className="text-sm font-mono font-bold text-info tabular-nums">
              {data.summary.activeOutages}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              TOR EXITS:
            </span>
            <span className="text-sm font-mono font-bold text-text-secondary tabular-nums">
              {data.summary.torExitNodes.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              CVEs (7d):
            </span>
            <span className="text-sm font-mono font-bold text-alert tabular-nums">
              {data.summary.newCves.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              ISRO:
            </span>
            <span className="text-sm font-mono font-bold text-status-active tabular-nums">
              {data.summary.isroLaunches}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-info border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
                Loading OSINT Data...
              </span>
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <StatusIndicator status="critical" size="lg" />
              <span className="text-xs font-mono text-critical uppercase tracking-wider">
                {error}
              </span>
              <button
                onClick={fetchData}
                className="px-3 py-1 text-xxs font-semibold tracking-wider uppercase text-text-secondary hover:text-text-primary bg-base-700 hover:bg-base-600 border border-divider transition-colors"
              >
                RETRY
              </button>
            </div>
          </div>
        ) : (
          <>
            <CategorySection
              title="Cyber Threats"
              icon="🛡️"
              metrics={cyberMetrics}
              color="text-cyber-cyan"
            />

            <CategorySection
              title="Space Weather"
              icon="🌌"
              metrics={spaceMetrics}
              color="text-info"
            />

            <CategorySection
              title="Infrastructure"
              icon="🌐"
              metrics={infraMetrics}
              color="text-alert"
            />
          </>
        )}
      </div>

      {/* Footer - Data Sources */}
      {data?.sources && (
        <div className="px-3 py-2 border-t border-divider bg-base-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                SOURCES:
              </span>
              <SourceStatus sources={data.sources} />
            </div>
            <span className="text-[9px] font-mono text-text-muted/50">
              {Object.values(data.sources).filter(Boolean).length} ACTIVE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
