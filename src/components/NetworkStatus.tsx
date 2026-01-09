"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusIndicator } from "./StatusIndicator";

// ===========================================
// Types
// ===========================================

interface ServiceStatus {
  id: string;
  name: string;
  status: "operational" | "degraded" | "outage" | "unknown";
  latency?: number;
  lastChecked: string;
  url?: string;
  details?: string;
}

interface CryptoNetworkStats {
  id: string;
  name: string;
  symbol: string;
  blockHeight: number;
  gasPrice?: string;
  tps?: number;
  pendingTx?: number;
  difficulty?: string;
  hashRate?: string;
  lastBlock?: string;
}

interface StatusApiResponse {
  services: ServiceStatus[];
  cryptoNetworks: CryptoNetworkStats[];
  summary: {
    total: number;
    operational: number;
    degraded: number;
    outages: number;
    avgLatency: number;
    overallStatus: "operational" | "degraded" | "critical" | "unknown";
  };
  lastUpdated: string;
  error?: string;
}

// ===========================================
// Service Status Row
// ===========================================

interface ServiceRowProps {
  service: ServiceStatus;
}

function ServiceRow({ service }: ServiceRowProps) {
  const statusConfig = {
    operational: {
      indicator: "active" as const,
      label: "OPERATIONAL",
      color: "text-status-active",
    },
    degraded: {
      indicator: "alert" as const,
      label: "DEGRADED",
      color: "text-alert",
    },
    outage: {
      indicator: "critical" as const,
      label: "OUTAGE",
      color: "text-critical",
    },
    unknown: {
      indicator: "info" as const,
      label: "UNKNOWN",
      color: "text-text-muted",
    },
  };

  const config = statusConfig[service.status];

  const getLatencyColor = (ms?: number) => {
    if (!ms) return "text-text-muted";
    if (ms < 100) return "text-status-active";
    if (ms < 300) return "text-info";
    if (ms < 500) return "text-alert";
    return "text-critical";
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-divider last:border-b-0 hover:bg-base-750 transition-colors">
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <StatusIndicator
          status={config.indicator}
          size="sm"
          pulse={service.status !== "operational"}
        />
      </div>

      {/* Service name */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-text-primary">
          {service.name}
        </span>
      </div>

      {/* Status label */}
      <div className="flex-shrink-0 w-24">
        <span
          className={`text-[9px] font-mono font-semibold tracking-wider uppercase ${config.color}`}
        >
          {config.label}
        </span>
      </div>

      {/* Latency */}
      <div className="flex-shrink-0 w-16 text-right">
        {service.latency ? (
          <span
            className={`text-xs font-mono tabular-nums ${getLatencyColor(service.latency)}`}
          >
            {service.latency}
            <span className="text-[9px] text-text-muted ml-0.5">ms</span>
          </span>
        ) : (
          <span className="text-xs font-mono text-text-muted">---</span>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Crypto Network Row
// ===========================================

interface CryptoRowProps {
  network: CryptoNetworkStats;
}

function CryptoRow({ network }: CryptoRowProps) {
  const symbolColors: Record<string, string> = {
    BTC: "text-alert",
    ETH: "text-cyber-purple",
    SOL: "text-cyber-cyan",
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-divider last:border-b-0 hover:bg-base-750 transition-colors">
      {/* Symbol */}
      <div className="flex-shrink-0 w-10">
        <span
          className={`text-xs font-mono font-bold ${symbolColors[network.symbol] || "text-info"}`}
        >
          {network.symbol}
        </span>
      </div>

      {/* Network name */}
      <div className="flex-shrink-0 w-20">
        <span className="text-xs text-text-primary">{network.name}</span>
      </div>

      {/* Block height */}
      <div className="flex-1">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          BLOCK
        </span>
        <span className="text-xs font-mono text-status-active ml-2 tabular-nums">
          #{network.blockHeight.toLocaleString()}
        </span>
      </div>

      {/* Additional stats */}
      <div className="flex-shrink-0 text-right">
        {network.gasPrice && (
          <div>
            <span className="text-[9px] font-mono text-text-muted uppercase">
              GAS:{" "}
            </span>
            <span className="text-xs font-mono text-alert tabular-nums">
              {network.gasPrice}
            </span>
          </div>
        )}
        {network.tps && (
          <div>
            <span className="text-[9px] font-mono text-text-muted uppercase">
              TPS:{" "}
            </span>
            <span className="text-xs font-mono text-cyber-cyan tabular-nums">
              {network.tps.toLocaleString()}
            </span>
          </div>
        )}
        {network.pendingTx && (
          <div>
            <span className="text-[9px] font-mono text-text-muted uppercase">
              MEMPOOL:{" "}
            </span>
            <span className="text-xs font-mono text-info tabular-nums">
              {network.pendingTx.toLocaleString()}
            </span>
          </div>
        )}
        {network.hashRate && (
          <div>
            <span className="text-[9px] font-mono text-text-muted uppercase">
              HASH:{" "}
            </span>
            <span className="text-xs font-mono text-cyber-purple tabular-nums">
              {network.hashRate}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================
// Summary Component
// ===========================================

interface SummaryProps {
  summary: StatusApiResponse["summary"];
}

function StatusSummary({ summary }: SummaryProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      <div className="flex items-center gap-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          SERVICES:
        </span>
        <span className="text-sm font-mono font-semibold text-status-active tabular-nums">
          {summary.operational}/{summary.total}
        </span>
      </div>

      <div className="w-px h-4 bg-divider" />

      {summary.degraded > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <StatusIndicator status="alert" size="sm" />
            <span className="text-xs font-mono text-alert tabular-nums">
              {summary.degraded}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
        </>
      )}

      {summary.outages > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <StatusIndicator status="critical" size="sm" />
            <span className="text-xs font-mono text-critical tabular-nums">
              {summary.outages}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
        </>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          AVG:
        </span>
        <span
          className={`text-xs font-mono font-medium tabular-nums ${
            summary.avgLatency < 100
              ? "text-status-active"
              : summary.avgLatency < 300
                ? "text-info"
                : "text-alert"
          }`}
        >
          {summary.avgLatency}ms
        </span>
      </div>
    </div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function StatusSkeleton() {
  return (
    <div className="space-y-0">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 border-b border-divider animate-pulse"
        >
          <div className="w-2 h-2 bg-base-600 rounded-full" />
          <div className="flex-1 h-3 bg-base-600 rounded" />
          <div className="w-20 h-3 bg-base-600 rounded" />
          <div className="w-12 h-3 bg-base-600 rounded" />
        </div>
      ))}
    </div>
  );
}

// ===========================================
// Status Topology Visualization
// ===========================================

interface TopologyProps {
  services: ServiceStatus[];
  cryptoNetworks: CryptoNetworkStats[];
}

function StatusTopology({ services, cryptoNetworks }: TopologyProps) {
  const getStatusColor = (
    status: "operational" | "degraded" | "outage" | "unknown",
  ) => {
    switch (status) {
      case "operational":
        return "#22c55e";
      case "degraded":
        return "#f59e0b";
      case "outage":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  return (
    <div className="p-3 border-b border-divider bg-base-800/50">
      <svg viewBox="0 0 400 80" className="w-full h-16">
        {/* Central hub */}
        <g transform="translate(200, 40)">
          <circle
            r="12"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            className="animate-pulse"
          />
          <text
            y="3"
            textAnchor="middle"
            className="text-[8px] font-mono fill-text-muted"
          >
            HUB
          </text>
        </g>

        {/* Service nodes - left side */}
        {services.slice(0, 3).map((service, i) => {
          const x = 50 + i * 50;
          const y = 40;
          return (
            <g key={service.id} transform={`translate(${x}, ${y})`}>
              <line
                x1="0"
                y1="0"
                x2={200 - x - 20}
                y2="0"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle
                r="6"
                fill={getStatusColor(service.status)}
                opacity={service.status === "operational" ? 0.8 : 1}
              >
                {service.status !== "operational" && (
                  <animate
                    attributeName="opacity"
                    values="1;0.5;1"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              <text
                y="18"
                textAnchor="middle"
                className="text-[6px] font-mono fill-text-muted"
              >
                {service.name.substring(0, 6).toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Service nodes - right side */}
        {services.slice(3, 6).map((service, i) => {
          const x = 250 + i * 50;
          const y = 40;
          return (
            <g key={service.id} transform={`translate(${x}, ${y})`}>
              <line
                x1="0"
                y1="0"
                x2={200 - x + 20}
                y2="0"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
              <circle
                r="6"
                fill={getStatusColor(service.status)}
                opacity={service.status === "operational" ? 0.8 : 1}
              >
                {service.status !== "operational" && (
                  <animate
                    attributeName="opacity"
                    values="1;0.5;1"
                    dur="1s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>
              <text
                y="18"
                textAnchor="middle"
                className="text-[6px] font-mono fill-text-muted"
              >
                {service.name.substring(0, 6).toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Crypto network indicators at bottom */}
        {cryptoNetworks.map((network, i) => {
          const x = 150 + i * 50;
          return (
            <g key={network.id} transform={`translate(${x}, 70)`}>
              <rect
                x="-8"
                y="-6"
                width="16"
                height="12"
                fill="none"
                stroke={
                  network.symbol === "BTC"
                    ? "#f59e0b"
                    : network.symbol === "ETH"
                      ? "#a855f7"
                      : "#06b6d4"
                }
                strokeWidth="1"
              />
              <text
                y="3"
                textAnchor="middle"
                className="text-[6px] font-mono"
                fill={
                  network.symbol === "BTC"
                    ? "#f59e0b"
                    : network.symbol === "ETH"
                      ? "#a855f7"
                      : "#06b6d4"
                }
              >
                {network.symbol}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ===========================================
// Main Component
// ===========================================

interface NetworkStatusProps {
  showTopology?: boolean;
  showSummary?: boolean;
  useLiveData?: boolean;
}

export default function NetworkStatus({
  showTopology = true,
  showSummary = true,
  useLiveData = true,
}: NetworkStatusProps) {
  const [data, setData] = useState<StatusApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"services" | "crypto">("services");

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!useLiveData) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/status");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: StatusApiResponse = await response.json();
      setData(result);
      setLastUpdate(new Date(result.lastUpdated));

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Status fetch error:", err);
      setError("Failed to fetch status data");
    } finally {
      setIsLoading(false);
    }
  }, [useLiveData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!useLiveData) return;

    const interval = setInterval(fetchData, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData, useLiveData]);

  const lastUpdateStr = lastUpdate.toISOString().substring(11, 19) + "Z";

  const overallStatus =
    data?.summary.overallStatus === "critical"
      ? ("critical" as const)
      : data?.summary.overallStatus === "degraded"
        ? ("alert" as const)
        : ("active" as const);

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">SYSTEM STATUS</span>
          <StatusIndicator
            status={error ? "alert" : isLoading ? "info" : overallStatus}
            size="sm"
            pulse={isLoading || overallStatus !== "active"}
          />
          {data && !isLoading && (
            <span
              className={`text-xxs font-mono uppercase tracking-wider ${
                overallStatus === "active"
                  ? "text-status-active"
                  : overallStatus === "alert"
                    ? "text-alert"
                    : "text-critical"
              }`}
            >
              {data.summary.overallStatus.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            {lastUpdateStr}
          </span>
          {useLiveData && (
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="text-xxs font-mono text-text-muted hover:text-info uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Topology visualization */}
      {showTopology && data && (
        <StatusTopology
          services={data.services}
          cryptoNetworks={data.cryptoNetworks}
        />
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-divider bg-base-800">
        <button
          onClick={() => setActiveTab("services")}
          className={`flex-1 px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
            activeTab === "services"
              ? "text-status-active border-b-2 border-status-active bg-status-active/5"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          🌐 SERVICES ({data?.services.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("crypto")}
          className={`flex-1 px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
            activeTab === "crypto"
              ? "text-alert border-b-2 border-alert bg-alert/5"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          ⛓️ NETWORKS ({data?.cryptoNetworks.length || 0})
        </button>
      </div>

      {/* Summary */}
      {showSummary && activeTab === "services" && data && (
        <StatusSummary summary={data.summary} />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !data ? (
          <StatusSkeleton />
        ) : activeTab === "services" ? (
          data?.services && data.services.length > 0 ? (
            data.services.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-xs font-mono">
              No services found
            </div>
          )
        ) : data?.cryptoNetworks && data.cryptoNetworks.length > 0 ? (
          data.cryptoNetworks.map((network) => (
            <CryptoRow key={network.id} network={network} />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-xs font-mono">
            No network data
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-divider bg-base-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-status-active rounded-full animate-breathe" />
          <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
            MONITORING ACTIVE
          </span>
        </div>
        <span className="text-[8px] font-mono text-text-muted/60 uppercase tracking-wider">
          REFRESH: 60S
        </span>
      </div>
    </div>
  );
}

// Compact variant
export function CompactNetworkStatus({
  useLiveData = true,
}: {
  useLiveData?: boolean;
}) {
  return (
    <NetworkStatus
      showTopology={false}
      showSummary={false}
      useLiveData={useLiveData}
    />
  );
}
