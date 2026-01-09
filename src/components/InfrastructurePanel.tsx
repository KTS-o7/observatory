"use client";

import { useState } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { useInfrastructureData } from "@/hooks/useApiData";

// Types
interface InternetOutage {
  id: string;
  entityType: "country" | "region" | "asn";
  entityCode: string;
  entityName: string;
  level: "normal" | "warning" | "critical";
  score: number;
  startTime: string;
  duration: number;
  datasource: string;
  description: string;
}

interface ServiceStatus {
  name: string;
  url: string;
  status:
    | "operational"
    | "degraded"
    | "partial_outage"
    | "major_outage"
    | "unknown";
  lastChecked: string;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    impact: string;
    createdAt: string;
  }>;
}

interface InfrastructureAlert {
  id: string;
  type: "outage" | "service_degradation" | "bgp_anomaly" | "ddos" | "cable_cut";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affectedEntity: string;
  affectedRegion: string | null;
  startTime: string;
  source: string;
}

// Service status indicator
interface ServiceStatusIndicatorProps {
  service: ServiceStatus;
}

function ServiceStatusIndicator({ service }: ServiceStatusIndicatorProps) {
  const getStatusConfig = (status: ServiceStatus["status"]) => {
    const config: Record<
      ServiceStatus["status"],
      {
        color: string;
        text: string;
        status: "active" | "info" | "alert" | "critical" | "inactive";
      }
    > = {
      operational: {
        color: "bg-status-active",
        text: "OPERATIONAL",
        status: "active",
      },
      degraded: { color: "bg-alert", text: "DEGRADED", status: "alert" },
      partial_outage: { color: "bg-alert", text: "PARTIAL", status: "alert" },
      major_outage: {
        color: "bg-critical",
        text: "OUTAGE",
        status: "critical",
      },
      unknown: { color: "bg-base-600", text: "UNKNOWN", status: "inactive" },
    };
    return config[status];
  };

  const statusConfig = getStatusConfig(service.status);

  return (
    <div className="flex items-center justify-between py-1.5 px-2 border-b border-divider last:border-b-0 hover:bg-base-750 transition-colors">
      <div className="flex items-center gap-2">
        <StatusIndicator
          status={statusConfig.status}
          size="sm"
          pulse={
            service.status !== "operational" && service.status !== "unknown"
          }
        />
        <span className="text-xs font-medium text-text-primary">
          {service.name}
        </span>
      </div>
      <span
        className={`text-[9px] font-mono uppercase tracking-wider ${
          service.status === "operational"
            ? "text-status-active"
            : service.status === "unknown"
              ? "text-text-muted"
              : service.status === "major_outage"
                ? "text-critical"
                : "text-alert"
        }`}
      >
        {statusConfig.text}
      </span>
    </div>
  );
}

// Outage item
interface OutageItemProps {
  outage: InternetOutage;
}

function OutageItem({ outage }: OutageItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  const getEntityIcon = (type: InternetOutage["entityType"]) => {
    const icons: Record<InternetOutage["entityType"], string> = {
      country: "🌍",
      region: "📍",
      asn: "🌐",
    };
    return icons[type];
  };

  return (
    <div
      className="border-b border-divider last:border-b-0 cursor-pointer hover:bg-base-750 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <StatusIndicator
          status={
            outage.level === "critical"
              ? "critical"
              : outage.level === "warning"
                ? "alert"
                : "active"
          }
          size="sm"
          pulse={outage.level === "critical"}
        />

        <span className="text-[10px]">{getEntityIcon(outage.entityType)}</span>

        <span className="flex-1 text-xs text-text-primary truncate">
          {outage.entityName}
        </span>

        <span
          className={`text-xxs font-mono tabular-nums ${
            outage.score < 0.5
              ? "text-critical"
              : outage.score < 0.7
                ? "text-alert"
                : "text-info"
          }`}
        >
          {(outage.score * 100).toFixed(0)}%
        </span>

        <span className="text-xxs font-mono text-text-muted">
          {formatDuration(outage.duration)}
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-2 animate-fade-in">
          <p className="text-xxs text-text-secondary mb-1">
            {outage.description}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-text-muted uppercase">
              {outage.entityType}: {outage.entityCode}
            </span>
            <span className="text-[9px] font-mono text-text-muted">|</span>
            <span className="text-[9px] font-mono text-text-muted uppercase">
              {outage.datasource}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Alert item
interface AlertItemProps {
  alert: InfrastructureAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const getTypeIcon = (type: InfrastructureAlert["type"]) => {
    const icons: Record<InfrastructureAlert["type"], string> = {
      outage: "🌐",
      service_degradation: "⚠️",
      bgp_anomaly: "🔀",
      ddos: "⚡",
      cable_cut: "🔌",
    };
    return icons[type] || "📡";
  };

  const getTypeLabel = (type: InfrastructureAlert["type"]) => {
    const labels: Record<InfrastructureAlert["type"], string> = {
      outage: "OUTAGE",
      service_degradation: "SERVICE",
      bgp_anomaly: "BGP",
      ddos: "DDOS",
      cable_cut: "CABLE",
    };
    return labels[type] || "ALERT";
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-divider last:border-b-0 hover:bg-base-750 transition-colors">
      <StatusIndicator
        status={
          alert.severity === "critical"
            ? "critical"
            : alert.severity === "high"
              ? "alert"
              : alert.severity === "medium"
                ? "info"
                : "active"
        }
        size="sm"
        pulse={alert.severity === "critical" || alert.severity === "high"}
      />

      <span
        className={`text-[9px] font-mono px-1.5 py-0.5 ${
          alert.severity === "critical"
            ? "bg-critical/15 text-critical"
            : alert.severity === "high"
              ? "bg-alert/15 text-alert"
              : "bg-info/15 text-info"
        }`}
      >
        {getTypeIcon(alert.type)} {getTypeLabel(alert.type)}
      </span>

      <span className="flex-1 text-xs text-text-primary truncate">
        {alert.title}
      </span>

      <span className="text-xxs font-mono text-text-muted uppercase">
        {alert.source}
      </span>
    </div>
  );
}

// Stats summary
interface StatsSummaryProps {
  stats: {
    outages: {
      total: number;
      critical: number;
      warning: number;
    };
    services: {
      total: number;
      operational: number;
      degraded: number;
      outage: number;
    };
  } | null;
}

function StatsSummary({ stats }: StatsSummaryProps) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          OUTAGES:
        </span>
        <span
          className={`text-xs font-mono tabular-nums ${
            stats.outages.critical > 0 ? "text-critical" : "text-text-primary"
          }`}
        >
          {stats.outages.total}
        </span>
        {stats.outages.critical > 0 && (
          <span className="text-[9px] font-mono text-critical">
            ({stats.outages.critical} CRIT)
          </span>
        )}
      </div>

      <div className="w-px h-3 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          SERVICES:
        </span>
        <span
          className={`text-xs font-mono tabular-nums ${
            stats.services.outage > 0
              ? "text-critical"
              : stats.services.degraded > 0
                ? "text-alert"
                : "text-status-active"
          }`}
        >
          {stats.services.operational}/{stats.services.total}
        </span>
      </div>

      <div className="w-px h-3 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          HEALTH:
        </span>
        <span
          className={`text-xs font-mono ${
            stats.outages.critical > 0 || stats.services.outage > 0
              ? "text-critical"
              : stats.outages.warning > 0 || stats.services.degraded > 0
                ? "text-alert"
                : "text-status-active"
          }`}
        >
          {stats.outages.critical > 0 || stats.services.outage > 0
            ? "DEGRADED"
            : stats.outages.warning > 0 || stats.services.degraded > 0
              ? "ISSUES"
              : "NOMINAL"}
        </span>
      </div>
    </div>
  );
}

// Loading skeleton
function InfrastructureSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <div className="space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 bg-base-700 animate-pulse rounded" />
        ))}
      </div>
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-base-700 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

// Tab button
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}

function TabButton({ active, onClick, children, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1 text-[10px] font-semibold tracking-widest uppercase
        transition-all duration-150 ease-linear flex items-center gap-1.5
        ${
          active
            ? "bg-info/15 text-info border border-info/30"
            : "text-text-muted hover:text-text-secondary hover:bg-base-700 border border-transparent"
        }
      `}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`text-[8px] px-1 rounded ${
            active ? "bg-info/30" : "bg-base-600"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// Main component
interface InfrastructurePanelProps {
  showStats?: boolean;
  compact?: boolean;
  useLiveData?: boolean;
}

export default function InfrastructurePanel({
  showStats = true,
  compact = false,
  useLiveData = true,
}: InfrastructurePanelProps) {
  const {
    data: apiResponse,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isStale,
  } = useInfrastructureData({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000,
    enabled: useLiveData,
  });

  const [activeTab, setActiveTab] = useState<"services" | "outages" | "alerts">(
    "services",
  );

  const alerts = apiResponse?.alerts || [];
  const outages = apiResponse?.outages || [];
  const services = apiResponse?.services || [];
  const stats = apiResponse?.stats || null;

  const lastUpdateStr = lastUpdated
    ? lastUpdated.toISOString().substring(11, 19) + "Z"
    : new Date().toISOString().substring(11, 19) + "Z";

  // Determine overall health
  const overallHealth = () => {
    if (!stats) return "unknown";
    if (stats.outages.critical > 0 || stats.services.outage > 0)
      return "critical";
    if (stats.outages.warning > 0 || stats.services.degraded > 0)
      return "degraded";
    return "healthy";
  };

  const health = overallHealth();

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">INFRASTRUCTURE</span>
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={
                error
                  ? "critical"
                  : isLoading
                    ? "alert"
                    : health === "critical"
                      ? "critical"
                      : health === "degraded"
                        ? "alert"
                        : "active"
              }
              size="sm"
              pulse={isLoading || health === "critical"}
            />
            <span
              className={`text-xxs font-mono uppercase tracking-wider ${
                error
                  ? "text-critical"
                  : isLoading
                    ? "text-alert"
                    : health === "critical"
                      ? "text-critical"
                      : health === "degraded"
                        ? "text-alert"
                        : "text-status-active"
              }`}
            >
              {error
                ? "ERROR"
                : isLoading
                  ? "LOADING"
                  : health === "healthy"
                    ? "NOMINAL"
                    : health.toUpperCase()}
            </span>
          </div>
          {isStale && !isLoading && (
            <span className="text-[8px] font-mono text-alert uppercase tracking-wider animate-breathe">
              STALE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            {lastUpdateStr}
          </span>
          {useLiveData && (
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xxs font-mono text-text-muted hover:text-info disabled:opacity-50 transition-colors"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && !compact && <StatsSummary stats={stats} />}

      {/* Tabs */}
      {!compact && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-divider bg-base-850">
          <TabButton
            active={activeTab === "services"}
            onClick={() => setActiveTab("services")}
            count={services.length}
          >
            Services
          </TabButton>
          <TabButton
            active={activeTab === "outages"}
            onClick={() => setActiveTab("outages")}
            count={outages.length}
          >
            Outages
          </TabButton>
          <TabButton
            active={activeTab === "alerts"}
            onClick={() => setActiveTab("alerts")}
            count={alerts.length}
          >
            Alerts
          </TabButton>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <StatusIndicator status="critical" size="lg" />
            <span className="text-xs font-mono text-critical uppercase tracking-wider text-center">
              {error}
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-xxs font-semibold tracking-wider uppercase text-text-secondary hover:text-text-primary bg-base-700 hover:bg-base-600 border border-divider transition-colors"
            >
              RETRY
            </button>
          </div>
        ) : isLoading && services.length === 0 ? (
          <InfrastructureSkeleton />
        ) : (
          <>
            {/* Services Tab */}
            {activeTab === "services" && (
              <div>
                {services.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <span className="text-xs font-mono text-text-muted uppercase">
                      NO SERVICES MONITORED
                    </span>
                  </div>
                ) : (
                  services.map((service) => (
                    <ServiceStatusIndicator
                      key={service.name}
                      service={service}
                    />
                  ))
                )}
              </div>
            )}

            {/* Outages Tab */}
            {activeTab === "outages" && (
              <div>
                {outages.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <span className="text-xs font-mono text-status-active uppercase">
                      NO ACTIVE OUTAGES
                    </span>
                  </div>
                ) : (
                  outages
                    .slice(0, 20)
                    .map((outage) => (
                      <OutageItem key={outage.id} outage={outage} />
                    ))
                )}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === "alerts" && (
              <div>
                {alerts.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <span className="text-xs font-mono text-status-active uppercase">
                      NO ACTIVE ALERTS
                    </span>
                  </div>
                ) : (
                  alerts
                    .slice(0, 20)
                    .map((alert) => <AlertItem key={alert.id} alert={alert} />)
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-divider bg-base-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              error
                ? "bg-critical"
                : isLoading
                  ? "bg-alert animate-ping"
                  : "bg-status-active animate-breathe"
            }`}
          />
          <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
            {error
              ? "FEED ERROR"
              : isLoading
                ? "FETCHING"
                : useLiveData
                  ? "IODA + STATUS"
                  : "MOCK"}
          </span>
        </div>
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          {services.length} SVC | {outages.length} OUT | {alerts.length} ALT
        </span>
      </div>
    </div>
  );
}

// Compact variant
export function CompactInfrastructure() {
  return <InfrastructurePanel showStats={false} compact />;
}
