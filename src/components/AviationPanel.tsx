"use client";

import React, { useState, useEffect } from "react";
import { StatusIndicator } from "./StatusIndicator";

// Types
interface Aircraft {
  icao24: string;
  callsign: string;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  verticalRate: number | null;
  onGround: boolean;
  squawk: string | null;
  category: string;
  isMilitary: boolean;
}

interface AviationStats {
  totalAircraft: number;
  militaryCount: number;
  avgAltitude: number;
  avgSpeed: number;
  byCountry: Record<string, number>;
}

interface AviationApiResponse {
  aircraft: Aircraft[];
  stats: AviationStats;
  timestamp: string;
  region: string;
  militaryFilter: boolean;
  lastUpdated: string;
  error?: string;
}

// Category badge
interface CategoryBadgeProps {
  category: string;
  isMilitary: boolean;
}

function CategoryBadge({ category, isMilitary }: CategoryBadgeProps) {
  if (isMilitary) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold tracking-widest uppercase bg-critical/15 text-critical">
        ⚔️ MIL
      </span>
    );
  }

  const categoryConfig: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    heavy: { bg: "bg-alert/15", text: "text-alert", label: "HEAVY" },
    large: { bg: "bg-info/15", text: "text-info", label: "LARGE" },
    medium: { bg: "bg-cyber-cyan/15", text: "text-cyber-cyan", label: "MED" },
    light: {
      bg: "bg-status-active/15",
      text: "text-status-active",
      label: "LIGHT",
    },
    helicopter: {
      bg: "bg-cyber-purple/15",
      text: "text-cyber-purple",
      label: "HELO",
    },
    glider: {
      bg: "bg-text-muted/15",
      text: "text-text-muted",
      label: "GLIDER",
    },
  };

  const config = categoryConfig[category] || categoryConfig.medium;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-semibold tracking-widest uppercase ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

// Format altitude
function formatAltitude(alt: number | null): string {
  if (alt === null) return "---";
  return `${Math.round(alt).toLocaleString()}ft`;
}

// Format speed (convert m/s to knots)
function formatSpeed(speed: number | null | undefined): string {
  if (speed === null || speed === undefined || isNaN(speed)) return "---";
  const knots = Math.round(speed * 1.94384);
  return `${knots}kts`;
}

// Format heading
function formatHeading(heading: number | null): string {
  if (heading === null) return "---";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(heading / 45) % 8;
  return `${Math.round(heading)}° ${dirs[index]}`;
}

// Aircraft row
interface AircraftRowProps {
  aircraft: Aircraft;
  isSelected?: boolean;
  onClick?: () => void;
}

function AircraftRow({ aircraft, isSelected, onClick }: AircraftRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null);

  // Scroll into view when selected
  React.useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  return (
    <div
      ref={rowRef}
      onClick={onClick}
      className={`
        group flex items-center gap-2 px-3 py-2 cursor-pointer
        border-b border-divider last:border-b-0
        transition-colors duration-150
        ${isSelected ? "bg-base-700 border-l-2 border-l-info" : "hover:bg-base-750"}
        ${aircraft.isMilitary && !isSelected ? "border-l-2 border-l-critical" : ""}
      `}
    >
      {/* Status indicator */}
      <div className="flex-shrink-0 w-4">
        <StatusIndicator
          status={
            aircraft.isMilitary
              ? "alert"
              : aircraft.onGround
                ? "info"
                : "active"
          }
          size="sm"
          pulse={aircraft.isMilitary}
        />
      </div>

      {/* Callsign */}
      <div className="flex-shrink-0 w-20">
        <span className="text-xs font-mono font-semibold text-text-primary">
          {aircraft.callsign || "N/A"}
        </span>
      </div>

      {/* Category */}
      <div className="flex-shrink-0 w-14">
        <CategoryBadge
          category={aircraft.category}
          isMilitary={aircraft.isMilitary}
        />
      </div>

      {/* Country */}
      <div className="flex-shrink-0 w-16">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          {aircraft.originCountry.substring(0, 10)}
        </span>
      </div>

      {/* Altitude */}
      <div className="flex-shrink-0 w-16 text-right">
        <span className="text-xxs font-mono text-text-secondary tabular-nums">
          {formatAltitude(aircraft.altitude)}
        </span>
      </div>

      {/* Speed */}
      <div className="flex-shrink-0 w-14 text-right">
        <span className="text-xxs font-mono text-text-secondary tabular-nums">
          {formatSpeed(aircraft.speed)}
        </span>
      </div>

      {/* Heading */}
      <div className="flex-shrink-0 w-16 text-right hidden lg:block">
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          {formatHeading(aircraft.heading)}
        </span>
      </div>

      {/* Ground status */}
      <div className="flex-shrink-0 w-8 text-center">
        {aircraft.onGround ? (
          <span className="text-[9px] font-mono text-alert">GND</span>
        ) : (
          <span className="text-[9px] font-mono text-status-active">AIR</span>
        )}
      </div>
    </div>
  );
}

// Stats bar
interface StatsBarProps {
  stats: AviationStats;
}

function StatsBar({ stats }: StatsBarProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          TOTAL:
        </span>
        <span className="text-xs font-mono text-text-primary tabular-nums">
          {stats.totalAircraft.toLocaleString()}
        </span>
      </div>

      <div className="w-px h-3 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          MILITARY:
        </span>
        <span
          className={`text-xs font-mono tabular-nums ${stats.militaryCount > 0 ? "text-critical" : "text-text-primary"}`}
        >
          {stats.militaryCount}
        </span>
      </div>

      <div className="w-px h-3 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          AVG ALT:
        </span>
        <span className="text-xs font-mono text-text-secondary tabular-nums">
          {formatAltitude(stats.avgAltitude)}
        </span>
      </div>

      <div className="w-px h-3 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          AVG SPD:
        </span>
        <span className="text-xs font-mono text-text-secondary tabular-nums">
          {formatSpeed(stats.avgSpeed)}
        </span>
      </div>
    </div>
  );
}

// Filter controls
interface FilterControlsProps {
  showMilitaryOnly: boolean;
  onMilitaryToggle: () => void;
  region: string;
  onRegionChange: (region: string) => void;
}

function FilterControls({
  showMilitaryOnly,
  onMilitaryToggle,
  region,
  onRegionChange,
}: FilterControlsProps) {
  const regions = [
    { id: "global", label: "GLOBAL" },
    { id: "europe", label: "EU" },
    { id: "north_america", label: "NA" },
    { id: "asia_pacific", label: "ASIA" },
    { id: "middle_east", label: "ME" },
  ];

  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      {/* Region filters */}
      <div className="flex items-center gap-1">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider mr-2">
          REGION:
        </span>
        {regions.map((r) => (
          <button
            key={r.id}
            onClick={() => onRegionChange(r.id)}
            className={`
              px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase
              transition-all duration-150 ease-linear
              ${
                region === r.id
                  ? "bg-info/20 text-info border border-info/30"
                  : "text-text-muted hover:text-text-secondary hover:bg-base-700 border border-transparent"
              }
            `}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-divider" />

      {/* Military filter */}
      <button
        onClick={onMilitaryToggle}
        className={`
          flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase
          transition-all duration-150 ease-linear
          ${
            showMilitaryOnly
              ? "bg-critical/20 text-critical border border-critical/30"
              : "text-text-muted hover:text-text-secondary hover:bg-base-700 border border-transparent"
          }
        `}
      >
        <span>⚔️</span>
        MIL ONLY
      </button>
    </div>
  );
}

// Loading skeleton
function AviationSkeleton() {
  return (
    <div className="space-y-0">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 border-b border-divider animate-pulse"
        >
          <div className="w-4 h-2 bg-base-600 rounded" />
          <div className="w-20 h-4 bg-base-600 rounded" />
          <div className="w-14 h-4 bg-base-600 rounded" />
          <div className="w-16 h-3 bg-base-600 rounded" />
          <div className="flex-1" />
          <div className="w-16 h-3 bg-base-600 rounded" />
          <div className="w-14 h-3 bg-base-600 rounded" />
        </div>
      ))}
    </div>
  );
}

// Main component
interface AviationPanelProps {
  maxItems?: number;
  showFilters?: boolean;
  showStats?: boolean;
  useLiveData?: boolean;
  region?: string;
  onRegionChange?: (region: string) => void;
  selectedAircraftId?: string | null;
  onAircraftSelect?: (icao24: string | null) => void;
  showMilitaryOnly?: boolean;
  onMilitaryFilterChange?: (militaryOnly: boolean) => void;
}

export default function AviationPanel({
  maxItems = 15,
  showFilters = true,
  showStats = true,
  useLiveData = true,
  region: externalRegion,
  onRegionChange,
  selectedAircraftId: externalSelectedId,
  onAircraftSelect,
  showMilitaryOnly: externalShowMilitaryOnly,
  onMilitaryFilterChange,
}: AviationPanelProps) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [stats, setStats] = useState<AviationStats>({
    totalAircraft: 0,
    militaryCount: 0,
    avgAltitude: 0,
    avgSpeed: 0,
    byCountry: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null,
  );
  const [internalShowMilitaryOnly, setInternalShowMilitaryOnly] =
    useState(false);
  const [internalRegion, setInternalRegion] = useState("europe");

  // Use external props if provided, otherwise use internal state
  const region = externalRegion !== undefined ? externalRegion : internalRegion;
  const selectedId =
    externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const showMilitaryOnly =
    externalShowMilitaryOnly !== undefined
      ? externalShowMilitaryOnly
      : internalShowMilitaryOnly;

  const handleMilitaryFilterChange = (value: boolean) => {
    if (onMilitaryFilterChange) {
      onMilitaryFilterChange(value);
    } else {
      setInternalShowMilitaryOnly(value);
    }
  };

  const handleRegionChange = (newRegion: string) => {
    if (onRegionChange) {
      onRegionChange(newRegion);
    } else {
      setInternalRegion(newRegion);
    }
  };

  const handleAircraftSelect = (icao24: string | null) => {
    if (onAircraftSelect) {
      onAircraftSelect(icao24);
    } else {
      setInternalSelectedId(icao24);
    }
  };

  const fetchData = async () => {
    if (!useLiveData) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const params = new URLSearchParams({
        region,
        military: showMilitaryOnly ? "true" : "false",
      });
      const response = await fetch(`/api/aviation?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: AviationApiResponse = await response.json();
      setAircraft(data.aircraft || []);
      setStats(data.stats || stats);
      setLastUpdated(new Date(data.lastUpdated));

      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error("Aviation fetch error:", err);
      setError("Failed to fetch aviation data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [useLiveData, region, showMilitaryOnly]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!useLiveData) return;

    const interval = setInterval(fetchData, 30 * 1000);
    return () => clearInterval(interval);
  }, [useLiveData, region, showMilitaryOnly]);

  // Filter and sort aircraft
  const displayAircraft = aircraft
    .filter((a) => !showMilitaryOnly || a.isMilitary)
    .sort((a, b) => {
      // Military first
      if (a.isMilitary && !b.isMilitary) return -1;
      if (!a.isMilitary && b.isMilitary) return 1;
      // Then by altitude
      return (b.altitude || 0) - (a.altitude || 0);
    })
    .slice(0, maxItems);

  const lastUpdateStr = lastUpdated.toISOString().substring(11, 19) + "Z";

  const overallStatus = error
    ? "critical"
    : isLoading
      ? "alert"
      : stats.militaryCount > 0
        ? "alert"
        : "active";

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">✈️ AVIATION TRACKER</span>
          <div className="flex items-center gap-1.5">
            <StatusIndicator
              status={overallStatus as "active" | "alert" | "critical"}
              size="sm"
              pulse={isLoading || stats.militaryCount > 0}
            />
            <span
              className={`text-xxs font-mono uppercase tracking-wider ${
                error
                  ? "text-critical"
                  : isLoading
                    ? "text-alert"
                    : stats.militaryCount > 0
                      ? "text-alert"
                      : "text-status-active"
              }`}
            >
              {error
                ? "ERROR"
                : isLoading
                  ? "LOADING"
                  : stats.militaryCount > 0
                    ? `${stats.militaryCount} MILITARY`
                    : "TRACKING"}
            </span>
          </div>
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

      {/* Filters */}
      {showFilters && (
        <FilterControls
          showMilitaryOnly={showMilitaryOnly}
          onMilitaryToggle={() => handleMilitaryFilterChange(!showMilitaryOnly)}
          region={region}
          onRegionChange={handleRegionChange}
        />
      )}

      {/* Stats */}
      {showStats && !isLoading && stats.totalAircraft > 0 && (
        <StatsBar stats={stats} />
      )}

      {/* Aircraft list */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <StatusIndicator status="critical" size="lg" />
            <span className="text-xs font-mono text-critical uppercase tracking-wider text-center">
              {error}
            </span>
            <button
              onClick={() => fetchData()}
              className="px-3 py-1 text-xxs font-semibold tracking-wider uppercase text-text-secondary hover:text-text-primary bg-base-700 hover:bg-base-600 border border-divider transition-colors"
            >
              RETRY
            </button>
          </div>
        ) : isLoading && aircraft.length === 0 ? (
          <AviationSkeleton />
        ) : displayAircraft.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
              NO AIRCRAFT IN REGION
            </span>
          </div>
        ) : (
          displayAircraft.map((a) => (
            <AircraftRow
              key={a.icao24}
              aircraft={a}
              isSelected={selectedId === a.icao24}
              onClick={() =>
                handleAircraftSelect(selectedId === a.icao24 ? null : a.icao24)
              }
            />
          ))
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
            {error ? "OFFLINE" : useLiveData ? "OPENSKY NETWORK" : "MOCK DATA"}
          </span>
        </div>
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          {displayAircraft.length} / {stats.totalAircraft} AIRCRAFT
        </span>
      </div>
    </div>
  );
}

// Compact variant
export function CompactAviationPanel() {
  return <AviationPanel maxItems={8} showFilters={false} showStats={false} />;
}
