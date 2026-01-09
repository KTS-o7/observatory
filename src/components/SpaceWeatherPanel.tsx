"use client";

import { useState, useEffect } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { useSpaceWeather } from "@/hooks/useApiData";

// Types
type StormLevel = "G0" | "G1" | "G2" | "G3" | "G4" | "G5";

interface SpaceWeatherAlert {
  id: string;
  type: "geomagnetic" | "solar_radiation" | "radio_blackout" | "cme" | "solar_flare";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  issueTime: string;
  impacts: string[];
  source: string;
}

// Storm level indicator
interface StormLevelIndicatorProps {
  level: StormLevel;
  label: string;
}

function StormLevelIndicator({ level, label }: StormLevelIndicatorProps) {
  const levelNum = parseInt(level.charAt(1));

  const getColor = (num: number) => {
    if (num >= 4) return "critical";
    if (num >= 3) return "alert";
    if (num >= 2) return "info";
    if (num >= 1) return "active";
    return "inactive";
  };

  const getBarColor = (index: number, num: number) => {
    if (index < num) {
      if (num >= 4) return "bg-critical";
      if (num >= 3) return "bg-alert";
      if (num >= 2) return "bg-info";
      return "bg-status-active";
    }
    return "bg-base-600";
  };

  const getDescription = (l: StormLevel) => {
    const descriptions: Record<StormLevel, string> = {
      G0: "None",
      G1: "Minor",
      G2: "Moderate",
      G3: "Strong",
      G4: "Severe",
      G5: "Extreme",
    };
    return descriptions[l];
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          {label}
        </span>
        <span
          className={`text-xs font-mono font-semibold ${
            levelNum >= 4
              ? "text-critical"
              : levelNum >= 3
                ? "text-alert"
                : levelNum >= 2
                  ? "text-info"
                  : levelNum >= 1
                    ? "text-status-active"
                    : "text-text-muted"
          }`}
        >
          {level}
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 ${getBarColor(i, levelNum)} transition-all duration-300`}
          />
        ))}
      </div>
      <span className="text-[9px] font-mono text-text-muted text-right">
        {getDescription(level)}
      </span>
    </div>
  );
}

// Kp Index display
interface KpIndexDisplayProps {
  value: number;
  status: string;
  description: string;
}

function KpIndexDisplay({ value, status, description }: KpIndexDisplayProps) {
  const getColor = () => {
    if (status === "storm") return "text-critical";
    if (status === "active") return "text-alert";
    if (status === "unsettled") return "text-info";
    return "text-status-active";
  };

  const getGlow = () => {
    if (status === "storm") return "glow-red";
    if (status === "active") return "glow-amber";
    return "";
  };

  return (
    <div className="bg-base-800 border border-divider p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-widest">
          Kp INDEX
        </span>
        <StatusIndicator
          status={
            status === "storm"
              ? "critical"
              : status === "active"
                ? "alert"
                : status === "unsettled"
                  ? "info"
                  : "active"
          }
          size="sm"
          pulse={status === "storm" || status === "active"}
        />
      </div>
      <div className={`text-3xl font-mono font-bold ${getColor()} ${getGlow()}`}>
        {value.toFixed(1)}
      </div>
      <div className="text-xxs font-mono text-text-muted uppercase mt-1">
        {description}
      </div>
    </div>
  );
}

// Solar wind display
interface SolarWindDisplayProps {
  speed: string;
  status: string;
}

function SolarWindDisplay({ speed, status }: SolarWindDisplayProps) {
  const getColor = () => {
    if (status === "extreme") return "text-critical";
    if (status === "high") return "text-alert";
    if (status === "elevated") return "text-info";
    return "text-status-active";
  };

  return (
    <div className="bg-base-800 border border-divider p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-widest">
          SOLAR WIND
        </span>
        <StatusIndicator
          status={
            status === "extreme"
              ? "critical"
              : status === "high"
                ? "alert"
                : status === "elevated"
                  ? "info"
                  : "active"
          }
          size="sm"
          pulse={status === "extreme" || status === "high"}
        />
      </div>
      <div className={`text-2xl font-mono font-bold ${getColor()}`}>{speed}</div>
      <div className="text-xxs font-mono text-text-muted uppercase mt-1">
        {status.toUpperCase()}
      </div>
    </div>
  );
}

// Alert item
interface AlertItemProps {
  alert: SpaceWeatherAlert;
}

function AlertItem({ alert }: AlertItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeIcon = (type: SpaceWeatherAlert["type"]) => {
    const icons: Record<SpaceWeatherAlert["type"], string> = {
      geomagnetic: "🌍",
      solar_radiation: "☢️",
      radio_blackout: "📡",
      cme: "💥",
      solar_flare: "☀️",
    };
    return icons[type];
  };

  const getTypeLabel = (type: SpaceWeatherAlert["type"]) => {
    const labels: Record<SpaceWeatherAlert["type"], string> = {
      geomagnetic: "GEO",
      solar_radiation: "RAD",
      radio_blackout: "RADIO",
      cme: "CME",
      solar_flare: "FLARE",
    };
    return labels[type];
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toISOString().substring(11, 16) + "Z";
  };

  return (
    <div
      className="border-b border-divider last:border-b-0 cursor-pointer hover:bg-base-750 transition-colors"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
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

        <span className="text-xxs font-mono text-text-muted">
          {formatTime(alert.issueTime)}
        </span>
      </div>

      {isExpanded && (
        <div className="px-3 pb-2 animate-fade-in">
          <p className="text-xxs text-text-secondary mb-2 line-clamp-3">
            {alert.description}
          </p>
          {alert.impacts.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {alert.impacts.map((impact, i) => (
                <span
                  key={i}
                  className="text-[8px] font-mono text-text-muted bg-base-700 px-1.5 py-0.5"
                >
                  {impact}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function SpaceWeatherSkeleton() {
  return (
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="h-24 bg-base-700 animate-pulse rounded" />
        <div className="h-24 bg-base-700 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 bg-base-700 animate-pulse rounded" />
        <div className="h-16 bg-base-700 animate-pulse rounded" />
        <div className="h-16 bg-base-700 animate-pulse rounded" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-base-700 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}

// Main component
interface SpaceWeatherPanelProps {
  showAlerts?: boolean;
  compact?: boolean;
  useLiveData?: boolean;
}

export default function SpaceWeatherPanel({
  showAlerts = true,
  compact = false,
  useLiveData = true,
}: SpaceWeatherPanelProps) {
  const {
    data: apiResponse,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isStale,
  } = useSpaceWeather({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000,
    enabled: useLiveData,
  });

  const summary = apiResponse?.summary;
  const alerts = apiResponse?.alerts || [];
  const kp = apiResponse?.kp?.current;
  const solarWind = apiResponse?.solarWind?.current;
  const stats = apiResponse?.stats;

  const lastUpdateStr = lastUpdated
    ? lastUpdated.toISOString().substring(11, 19) + "Z"
    : new Date().toISOString().substring(11, 19) + "Z";

  // Determine overall status
  const overallStatus = () => {
    if (!summary) return "unknown";
    const gLevel = parseInt(summary.geomagneticStorm.current.charAt(1));
    if (gLevel >= 4) return "critical";
    if (gLevel >= 3) return "high";
    if (gLevel >= 2) return "medium";
    if (gLevel >= 1) return "low";
    return "normal";
  };

  const status = overallStatus();

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">SPACE WEATHER</span>
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={
                error
                  ? "critical"
                  : isLoading
                    ? "alert"
                    : status === "critical"
                      ? "critical"
                      : status === "high"
                        ? "alert"
                        : "active"
              }
              size="sm"
              pulse={isLoading || status === "critical" || status === "high"}
            />
            <span
              className={`text-xxs font-mono uppercase tracking-wider ${
                error
                  ? "text-critical"
                  : isLoading
                    ? "text-alert"
                    : status === "critical"
                      ? "text-critical"
                      : status === "high"
                        ? "text-alert"
                        : "text-status-active"
              }`}
            >
              {error
                ? "ERROR"
                : isLoading
                  ? "LOADING"
                  : status === "normal"
                    ? "QUIET"
                    : status.toUpperCase()}
            </span>
          </div>
          {stats && stats.criticalAlerts > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-critical/10 border border-critical/20">
              <StatusIndicator status="critical" size="sm" pulse />
              <span className="text-xxs font-mono text-critical uppercase">
                {stats.criticalAlerts} CRIT
              </span>
            </div>
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
        ) : isLoading && !summary ? (
          <SpaceWeatherSkeleton />
        ) : (
          <div className="p-3 space-y-3">
            {/* Main indicators */}
            <div className="grid grid-cols-2 gap-2">
              {kp && (
                <KpIndexDisplay
                  value={parseFloat(kp.value)}
                  status={kp.status}
                  description={kp.description}
                />
              )}
              {solarWind && (
                <SolarWindDisplay speed={solarWind.speed} status={solarWind.status} />
              )}
            </div>

            {/* Storm scales */}
            {summary && !compact && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-base-800 border border-divider p-2">
                  <StormLevelIndicator
                    level={summary.geomagneticStorm.current}
                    label="GEOMAG"
                  />
                </div>
                <div className="bg-base-800 border border-divider p-2">
                  <StormLevelIndicator
                    level={summary.solarRadiation.current as StormLevel}
                    label="SOLAR RAD"
                  />
                </div>
                <div className="bg-base-800 border border-divider p-2">
                  <StormLevelIndicator
                    level={summary.radioBlackout.current as StormLevel}
                    label="RADIO"
                  />
                </div>
              </div>
            )}

            {/* Alerts */}
            {showAlerts && alerts.length > 0 && (
              <div className="border border-divider bg-base-800">
                <div className="px-3 py-1.5 border-b border-divider">
                  <span className="text-xxs font-semibold text-text-muted uppercase tracking-widest">
                    ACTIVE ALERTS ({alerts.length})
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {alerts.slice(0, 10).map((alert) => (
                    <AlertItem key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            )}

            {/* No alerts message */}
            {showAlerts && alerts.length === 0 && !isLoading && (
              <div className="text-center py-4">
                <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
                  NO ACTIVE ALERTS
                </span>
              </div>
            )}
          </div>
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
            SOURCE: NOAA SWPC
          </span>
        </div>
        {stats && (
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            {stats.recentFlares} M/X FLARES
          </span>
        )}
      </div>
    </div>
  );
}

// Compact variant
export function CompactSpaceWeather() {
  return <SpaceWeatherPanel showAlerts={false} compact />;
}
