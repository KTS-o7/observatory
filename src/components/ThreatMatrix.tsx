"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { useOsintMetrics } from "@/hooks/useApiData";

// Types
interface ThreatLevel {
  region: string;
  level: number;
  trend: "increasing" | "stable" | "decreasing";
  factors?: string[];
  articleCount?: number;
  lastUpdated?: string;
}

interface ThreatApiResponse {
  threats: ThreatLevel[];
  summary: {
    avgLevel: number;
    criticalCount: number;
    increasingCount: number;
    totalRegions: number;
  };
  lastUpdated: string;
  error?: string;
}

// Threat level bar component
interface ThreatBarProps {
  level: number;
  trend: "increasing" | "stable" | "decreasing";
}

function ThreatBar({ level, trend }: ThreatBarProps) {
  const getBarColor = (level: number) => {
    if (level >= 80) return "bg-critical";
    if (level >= 60) return "bg-alert";
    if (level >= 40) return "bg-info";
    return "bg-status-active";
  };

  const getGlowColor = (level: number) => {
    if (level >= 80) return "shadow-[0_0_10px_rgba(239,68,68,0.3)]";
    if (level >= 60) return "shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    if (level >= 40) return "shadow-[0_0_10px_rgba(59,130,246,0.3)]";
    return "shadow-[0_0_10px_rgba(34,197,94,0.3)]";
  };

  return (
    <div className="flex-1 h-1.5 bg-base-700 relative overflow-hidden">
      <div
        className={`
          h-full transition-all duration-500 ease-linear
          ${getBarColor(level)} ${getGlowColor(level)}
        `}
        style={{ width: `${level}%` }}
      />
      {/* Grid overlay on bar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent, transparent 9px, rgba(0,0,0,0.3) 9px, rgba(0,0,0,0.3) 10px)",
        }}
      />
    </div>
  );
}

// Trend indicator
interface TrendIndicatorProps {
  trend: "increasing" | "stable" | "decreasing";
}

function TrendIndicator({ trend }: TrendIndicatorProps) {
  const config = {
    increasing: {
      icon: "▲",
      color: "text-critical",
      label: "RISING",
    },
    stable: {
      icon: "◆",
      color: "text-info",
      label: "STABLE",
    },
    decreasing: {
      icon: "▼",
      color: "text-status-active",
      label: "FALLING",
    },
  };

  const { icon, color, label } = config[trend];

  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <span className="text-[8px]">{icon}</span>
      <span className="text-[9px] font-mono font-medium tracking-wider uppercase">
        {label}
      </span>
    </div>
  );
}

// Single threat row
interface ThreatRowProps {
  threat: ThreatLevel;
  isSelected?: boolean;
  onClick?: () => void;
}

function ThreatRow({ threat, isSelected, onClick }: ThreatRowProps) {
  const [displayLevel, setDisplayLevel] = useState(0);

  // Animate level on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayLevel(threat.level);
    }, 100);
    return () => clearTimeout(timer);
  }, [threat.level]);

  const getStatusType = (level: number) => {
    if (level >= 80) return "critical";
    if (level >= 60) return "alert";
    if (level >= 40) return "info";
    return "active";
  };

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2
        border-b border-divider last:border-b-0
        cursor-pointer transition-all duration-150 ease-linear
        ${isSelected ? "bg-base-700" : "hover:bg-base-750"}
      `}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0">
        <StatusIndicator
          status={
            getStatusType(threat.level) as
              | "active"
              | "info"
              | "alert"
              | "critical"
          }
          size="sm"
          pulse={threat.level >= 70 || threat.trend === "increasing"}
        />
      </div>

      {/* Region name */}
      <div className="w-28 flex-shrink-0">
        <span className="text-xs font-semibold tracking-wider text-text-primary uppercase">
          {threat.region}
        </span>
      </div>

      {/* Threat bar */}
      <ThreatBar level={displayLevel} trend={threat.trend} />

      {/* Level value */}
      <div className="w-10 flex-shrink-0 text-right">
        <span
          className={`
            text-xs font-mono font-semibold tabular-nums
            ${threat.level >= 80 ? "text-critical" : ""}
            ${threat.level >= 60 && threat.level < 80 ? "text-alert" : ""}
            ${threat.level >= 40 && threat.level < 60 ? "text-info" : ""}
            ${threat.level < 40 ? "text-status-active" : ""}
          `}
        >
          {displayLevel}
        </span>
      </div>

      {/* Trend indicator */}
      <div className="w-16 flex-shrink-0">
        <TrendIndicator trend={threat.trend} />
      </div>
    </div>
  );
}

// Summary stats component
interface ThreatSummaryProps {
  avgLevel: number;
  criticalCount: number;
  increasingCount: number;
}

function ThreatSummary({
  avgLevel,
  criticalCount,
  increasingCount,
}: ThreatSummaryProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      <div className="flex items-center gap-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          AVG:
        </span>
        <span
          className={`
            text-sm font-mono font-semibold tabular-nums
            ${avgLevel >= 60 ? "text-alert glow-amber" : "text-text-primary"}
          `}
        >
          {avgLevel}
        </span>
      </div>

      <div className="w-px h-4 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          CRIT:
        </span>
        <span
          className={`
            text-sm font-mono font-semibold tabular-nums
            ${criticalCount > 0 ? "text-critical" : "text-text-primary"}
          `}
        >
          {criticalCount}
        </span>
      </div>

      <div className="w-px h-4 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          RISING:
        </span>
        <span
          className={`
            text-sm font-mono font-semibold tabular-nums
            ${increasingCount > 0 ? "text-alert" : "text-text-primary"}
          `}
        >
          {increasingCount}
        </span>
      </div>
    </div>
  );
}

// Loading skeleton
function ThreatSkeleton() {
  return (
    <div className="space-y-0">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 border-b border-divider animate-pulse"
        >
          <div className="w-2 h-2 bg-base-600 rounded-full" />
          <div className="w-28 h-3 bg-base-600 rounded" />
          <div className="flex-1 h-1.5 bg-base-600 rounded" />
          <div className="w-10 h-3 bg-base-600 rounded" />
          <div className="w-16 h-3 bg-base-600 rounded" />
        </div>
      ))}
    </div>
  );
}

// Main ThreatMatrix component
interface ThreatMatrixProps {
  showSummary?: boolean;
  onRegionSelect?: (region: string) => void;
  useLiveData?: boolean;
}

export default function ThreatMatrix({
  showSummary = true,
  onRegionSelect,
  useLiveData = true,
}: ThreatMatrixProps) {
  const [threats, setThreats] = useState<ThreatLevel[]>([]);
  const [summary, setSummary] = useState({
    avgLevel: 0,
    criticalCount: 0,
    increasingCount: 0,
  });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch OSINT data for fallback
  const { data: osintData } = useOsintMetrics({
    enabled: useLiveData,
  });

  // Generate threat levels from OSINT data
  const generateOsintThreats = useCallback((): ThreatLevel[] => {
    if (!osintData) return [];

    const summary = osintData.summary;
    const cyberLevel = Math.min(
      100,
      Math.round(
        (summary.totalThreats / 100) * 50 + summary.criticalCount * 10,
      ),
    );
    const infraLevel = Math.min(100, summary.activeOutages * 5 + 30);
    const spaceLevel = Math.min(100, summary.spaceWeatherLevel * 15 + 20);

    return [
      {
        region: "CYBER",
        level: cyberLevel,
        trend: summary.criticalCount > 5 ? "increasing" : "stable",
      },
      {
        region: "INFRASTRUCTURE",
        level: infraLevel,
        trend: summary.activeOutages > 10 ? "increasing" : "stable",
      },
      {
        region: "SPACE WX",
        level: spaceLevel,
        trend: summary.spaceWeatherLevel >= 3 ? "increasing" : "stable",
      },
      {
        region: "GLOBAL",
        level: Math.round((cyberLevel + infraLevel + spaceLevel) / 3),
        trend: "stable",
      },
    ];
  }, [osintData]);

  // Fetch threat data from API
  const fetchThreats = useCallback(async () => {
    if (!useLiveData) {
      // Use OSINT-derived data if available, otherwise minimal fallback
      const osintThreats = generateOsintThreats();
      if (osintThreats.length > 0) {
        setThreats(osintThreats);
        const avgLevel = Math.round(
          osintThreats.reduce((sum, t) => sum + t.level, 0) /
            osintThreats.length,
        );
        setSummary({
          avgLevel,
          criticalCount: osintThreats.filter((t) => t.level >= 70).length,
          increasingCount: osintThreats.filter((t) => t.trend === "increasing")
            .length,
        });
      } else {
        setThreats([]);
        setSummary({ avgLevel: 0, criticalCount: 0, increasingCount: 0 });
      }
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/threats");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ThreatApiResponse = await response.json();

      setThreats(data.threats);
      setSummary(data.summary);
      setLastUpdate(new Date(data.lastUpdated));

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Threat fetch error:", err);
      setError("Failed to fetch threat data");

      // Use OSINT-derived fallback on error
      const osintThreats = generateOsintThreats();
      if (osintThreats.length > 0) {
        setThreats(osintThreats);
        const avgLevel = Math.round(
          osintThreats.reduce((sum, t) => sum + t.level, 0) /
            osintThreats.length,
        );
        setSummary({
          avgLevel,
          criticalCount: osintThreats.filter((t) => t.level >= 70).length,
          increasingCount: osintThreats.filter((t) => t.trend === "increasing")
            .length,
        });
      } else {
        setThreats([]);
        setSummary({ avgLevel: 0, criticalCount: 0, increasingCount: 0 });
      }
    } finally {
      setIsLoading(false);
    }
  }, [useLiveData, generateOsintThreats]);

  // Initial fetch
  useEffect(() => {
    fetchThreats();
  }, [fetchThreats]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!useLiveData) return;

    const interval = setInterval(
      () => {
        fetchThreats();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [fetchThreats, useLiveData]);

  // Sort threats by level (highest first)
  const sortedThreats = [...threats].sort((a, b) => b.level - a.level);

  const handleRegionClick = (region: string) => {
    setSelectedRegion(region === selectedRegion ? null : region);
    onRegionSelect?.(region);
  };

  const lastUpdateStr = lastUpdate.toISOString().substring(11, 19) + "Z";

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">THREAT MATRIX</span>
          <div className="flex items-center gap-1.5">
            <StatusIndicator
              status={error ? "alert" : isLoading ? "info" : "active"}
              size="sm"
              pulse={isLoading}
            />
            <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
              {error
                ? "ERROR"
                : isLoading
                  ? "UPDATING"
                  : useLiveData
                    ? "LIVE"
                    : "MOCK"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            {lastUpdateStr}
          </span>
          {useLiveData && (
            <button
              onClick={() => fetchThreats()}
              disabled={isLoading}
              className="text-xxs font-mono text-text-muted hover:text-info uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {showSummary && !isLoading && (
        <ThreatSummary
          avgLevel={summary.avgLevel}
          criticalCount={summary.criticalCount}
          increasingCount={summary.increasingCount}
        />
      )}

      {/* Threat list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && threats.length === 0 ? (
          <ThreatSkeleton />
        ) : (
          sortedThreats.map((threat) => (
            <ThreatRow
              key={threat.region}
              threat={threat}
              isSelected={selectedRegion === threat.region}
              onClick={() => handleRegionClick(threat.region)}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-divider bg-base-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 bg-critical" />
              <span className="text-[9px] font-mono text-text-muted uppercase">
                80+
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 bg-alert" />
              <span className="text-[9px] font-mono text-text-muted uppercase">
                60-79
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 bg-info" />
              <span className="text-[9px] font-mono text-text-muted uppercase">
                40-59
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 bg-status-active" />
              <span className="text-[9px] font-mono text-text-muted uppercase">
                0-39
              </span>
            </div>
          </div>

          <span className="text-[8px] font-mono text-text-muted/60 uppercase tracking-wider">
            {useLiveData ? "SOURCE: GDELT + OSINT" : "OSINT DATA"}
          </span>
        </div>
      </div>
    </div>
  );
}

// Compact variant for smaller spaces
export function CompactThreatMatrix({
  useLiveData = true,
}: {
  useLiveData?: boolean;
}) {
  return <ThreatMatrix showSummary={false} useLiveData={useLiveData} />;
}
