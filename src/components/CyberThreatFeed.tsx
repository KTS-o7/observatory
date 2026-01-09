"use client";

import { useState, useEffect } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { useCyberThreats } from "@/hooks/useApiData";

// Types - import from API to ensure consistency
import type { CyberThreat } from "@/lib/api/cyber";

// Type badge component
interface TypeBadgeProps {
  type: string;
}

function TypeBadge({ type }: TypeBadgeProps) {
  const config: Record<
    string,
    { bg: string; text: string; label: string; icon: string }
  > = {
    malware_url: {
      bg: "bg-critical/15",
      text: "text-critical",
      label: "MALWARE",
      icon: "🔗",
    },
    botnet_c2: {
      bg: "bg-cyber-purple/15",
      text: "text-cyber-purple",
      label: "BOTNET",
      icon: "🤖",
    },
    ransomware: {
      bg: "bg-alert/15",
      text: "text-alert",
      label: "RANSOM",
      icon: "💀",
    },
    ioc: {
      bg: "bg-cyber-cyan/15",
      text: "text-cyber-cyan",
      label: "IOC",
      icon: "🎯",
    },
    tor_exit: {
      bg: "bg-info/15",
      text: "text-info",
      label: "TOR",
      icon: "🧅",
    },
    vulnerability: {
      bg: "bg-alert/15",
      text: "text-alert",
      label: "VULN",
      icon: "⚠️",
    },
  };

  const c = config[type] || config.ioc;

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5
        text-[9px] font-semibold tracking-widest uppercase
        ${c.bg} ${c.text}
      `}
    >
      <span className="text-[8px]">{c.icon}</span>
      {c.label}
    </span>
  );
}

// Severity indicator
interface SeverityIndicatorProps {
  severity: string;
}

function SeverityIndicator({ severity }: SeverityIndicatorProps) {
  const config: Record<
    string,
    { status: "active" | "info" | "alert" | "critical" }
  > = {
    low: { status: "active" },
    medium: { status: "info" },
    high: { status: "alert" },
    critical: { status: "critical" },
  };

  return (
    <StatusIndicator
      status={config[severity]?.status || "info"}
      size="sm"
      pulse={severity === "critical" || severity === "high"}
    />
  );
}

// Single threat item
interface ThreatItemProps {
  threat: CyberThreat;
  isNew?: boolean;
}

function ThreatItem({ threat, isNew = false }: ThreatItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate external link based on threat type and metadata
  const getExternalLink = (): string | null => {
    const meta = threat.metadata as Record<string, string>;

    // Check for direct URL in metadata
    if (meta?.url) return meta.url;
    if (meta?.urlhausReference) return meta.urlhausReference;
    if (meta?.postUrl) return meta.postUrl;
    if (meta?.reference) return meta.reference;

    // Generate link based on threat type
    if (threat.type === "malware_url" && threat.indicator) {
      return `https://urlhaus.abuse.ch/browse.php?search=${encodeURIComponent(threat.indicator)}`;
    }
    if (threat.type === "botnet_c2" && threat.indicator) {
      return `https://feodotracker.abuse.ch/browse/host/${encodeURIComponent(threat.indicator)}/`;
    }
    if (threat.type === "ransomware" && meta?.groupName) {
      return `https://ransomware.live/#/group/${encodeURIComponent(meta.groupName)}`;
    }
    if (threat.type === "ioc" && threat.indicator) {
      return `https://threatfox.abuse.ch/browse.php?search=ioc%3A${encodeURIComponent(threat.indicator)}`;
    }

    return null;
  };

  const externalLink = getExternalLink();

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (externalLink) {
      window.open(externalLink, "_blank", "noopener,noreferrer");
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "NOW";
    if (diffMins < 60) return `${diffMins}M`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}H`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}D`;
  };

  const truncateIndicator = (indicator: string, maxLen: number = 40) => {
    if (indicator.length <= maxLen) return indicator;
    return indicator.substring(0, maxLen) + "...";
  };

  return (
    <div
      className={`
        group cursor-pointer border-b border-divider last:border-b-0
        ${isNew ? "animate-fade-in bg-base-750" : ""}
        ${isHovered ? "bg-base-750" : ""}
        transition-colors duration-150
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Severity indicator */}
        <div className="flex-shrink-0 w-4">
          <SeverityIndicator severity={threat.severity} />
        </div>

        {/* Type badge */}
        <div className="flex-shrink-0 w-16">
          <TypeBadge type={threat.type} />
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <span
            className={`text-xs font-medium truncate block ${externalLink ? "text-text-primary group-hover:text-info transition-colors" : "text-text-primary"}`}
          >
            {threat.title}
          </span>
        </div>

        {/* External link indicator */}
        {externalLink && (
          <div className="flex-shrink-0 w-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleExternalClick}
              className="text-info hover:text-cyber-cyan"
              title="View details"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Source */}
        <div className="flex-shrink-0 hidden sm:block">
          <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
            {threat.source}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex-shrink-0 w-10 text-right">
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            {formatTimeAgo(threat.timestamp)}
          </span>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-2 animate-fade-in">
          <div className="pl-6 border-l-2 border-divider ml-1.5">
            {/* Description */}
            <p className="text-xxs text-text-secondary mb-2">
              {threat.description}
            </p>

            {/* Indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono text-text-muted uppercase">
                {threat.indicatorType}:
              </span>
              <code className="text-[10px] font-mono text-cyber-cyan bg-base-700 px-1.5 py-0.5 break-all">
                {truncateIndicator(threat.indicator, 60)}
              </code>
            </div>

            {/* Tags */}
            {threat.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {threat.tags.slice(0, 5).map((tag, i) => (
                  <span
                    key={i}
                    className="text-[8px] font-mono text-text-muted bg-base-700 px-1.5 py-0.5 uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* External link button */}
            {externalLink && (
              <div className="mt-2">
                <button
                  onClick={handleExternalClick}
                  className="text-[9px] font-mono text-info hover:text-cyber-cyan bg-info/10 hover:bg-info/20 px-2 py-1 transition-colors inline-flex items-center gap-1"
                >
                  VIEW DETAILS ↗
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
          className="flex items-center gap-2 px-3 py-2 border-b border-divider animate-pulse"
        >
          <div className="w-4 h-2 bg-base-600 rounded" />
          <div className="w-16 h-4 bg-base-600 rounded" />
          <div className="flex-1 h-4 bg-base-600 rounded" />
          <div className="w-16 h-3 bg-base-600 rounded" />
          <div className="w-10 h-3 bg-base-600 rounded" />
        </div>
      ))}
    </div>
  );
}

// Stats bar
interface StatsBarProps {
  stats: {
    malwareUrls: { total: number; online: number };
    ransomware: { total: number; last24h: number };
    botnets: { total: number; online: number };
  } | null;
}

function StatsBar({ stats }: StatsBarProps) {
  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          MALWARE:
        </span>
        <span className="text-xs font-mono text-critical tabular-nums">
          {stats.malwareUrls.online}
        </span>
        <span className="text-[9px] font-mono text-text-muted">/</span>
        <span className="text-[9px] font-mono text-text-muted tabular-nums">
          {stats.malwareUrls.total}
        </span>
      </div>

      <div className="w-px h-3 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          RANSOM 24H:
        </span>
        <span
          className={`text-xs font-mono tabular-nums ${stats.ransomware.last24h > 0 ? "text-alert" : "text-text-primary"}`}
        >
          {stats.ransomware.last24h}
        </span>
      </div>

      <div className="w-px h-3 bg-divider" />

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono text-text-muted uppercase">
          C2 ACTIVE:
        </span>
        <span className="text-xs font-mono text-cyber-purple tabular-nums">
          {stats.botnets.online}
        </span>
      </div>
    </div>
  );
}

// Filter controls
interface FilterControlsProps {
  activeType: string;
  activeSeverity: string;
  onTypeChange: (type: string) => void;
  onSeverityChange: (severity: string) => void;
}

function FilterControls({
  activeType,
  activeSeverity,
  onTypeChange,
  onSeverityChange,
}: FilterControlsProps) {
  const types: string[] = [
    "all",
    "ransomware",
    "malware_url",
    "botnet_c2",
    "ioc",
  ];
  const severities: string[] = ["all", "critical", "high", "medium", "low"];

  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      {/* Type filters */}
      <div className="flex items-center gap-1">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider mr-2">
          TYPE:
        </span>
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`
              px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase
              transition-all duration-150 ease-linear
              ${
                activeType === type
                  ? "bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30"
                  : "text-text-muted hover:text-text-secondary hover:bg-base-700 border border-transparent"
              }
            `}
          >
            {type === "all"
              ? "ALL"
              : type === "malware_url"
                ? "MAL"
                : type === "botnet_c2"
                  ? "C2"
                  : type === "ransomware"
                    ? "RW"
                    : "IOC"}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-divider" />

      {/* Severity filters */}
      <div className="flex items-center gap-1">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider mr-2">
          SEV:
        </span>
        {severities.map((sev) => (
          <button
            key={sev}
            onClick={() => onSeverityChange(sev)}
            className={`
              px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase
              transition-all duration-150 ease-linear
              ${
                activeSeverity === sev
                  ? "bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30"
                  : "text-text-muted hover:text-text-secondary hover:bg-base-700 border border-transparent"
              }
            `}
          >
            {sev === "all" ? "ALL" : sev.slice(0, 4).toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

// Main component
interface CyberThreatFeedProps {
  maxItems?: number;
  showFilters?: boolean;
  showStats?: boolean;
  compact?: boolean;
  useLiveData?: boolean;
}

export default function CyberThreatFeed({
  maxItems = 20,
  showFilters = true,
  showStats = true,
  compact = false,
  useLiveData = true,
}: CyberThreatFeedProps) {
  const {
    data: apiResponse,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isStale,
  } = useCyberThreats({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    enabled: useLiveData,
  });

  const [filteredThreats, setFilteredThreats] = useState<CyberThreat[]>([]);
  const [activeType, setActiveType] = useState<string>("all");
  const [activeSeverity, setActiveSeverity] = useState<string>("all");
  const [newThreatIds, setNewThreatIds] = useState<Set<string>>(new Set());

  // Get threats from API response
  const threats = apiResponse?.threats || [];
  const stats = apiResponse?.stats || null;

  // Filter threats
  useEffect(() => {
    let filtered = [...threats];

    if (activeType !== "all") {
      filtered = filtered.filter((t) => t.type === activeType);
    }

    if (activeSeverity !== "all") {
      filtered = filtered.filter((t) => t.severity === activeSeverity);
    }

    // Sort by severity and timestamp
    filtered.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff =
        severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setFilteredThreats(filtered.slice(0, maxItems));
  }, [threats, activeType, activeSeverity, maxItems]);

  // Track new threats
  useEffect(() => {
    if (threats.length > 0) {
      const currentIds = new Set(filteredThreats.map((t) => t.id));
      const newIds = threats
        .filter((t) => !currentIds.has(t.id))
        .map((t) => t.id);

      if (newIds.length > 0) {
        setNewThreatIds(new Set(newIds));
        setTimeout(() => setNewThreatIds(new Set()), 3000);
      }
    }
  }, [threats]);

  const threatCounts = {
    total: threats.length,
    critical: threats.filter((t) => t.severity === "critical").length,
    ransomware: threats.filter((t) => t.type === "ransomware").length,
  };

  const lastUpdateStr = lastUpdated
    ? lastUpdated.toISOString().substring(11, 19) + "Z"
    : new Date().toISOString().substring(11, 19) + "Z";

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">CYBER THREAT INTEL</span>
          <div className="flex items-center gap-2">
            <StatusIndicator
              status={error ? "critical" : isLoading ? "alert" : "active"}
              size="sm"
              pulse={isLoading}
            />
            <span
              className={`text-xxs font-mono uppercase tracking-wider ${
                error
                  ? "text-critical"
                  : isLoading
                    ? "text-alert"
                    : "text-status-active"
              }`}
            >
              {error
                ? "ERROR"
                : isLoading
                  ? "LOADING"
                  : `${threatCounts.critical} CRITICAL`}
            </span>
          </div>
          {threatCounts.ransomware > 0 && !error && (
            <div className="flex items-center gap-2">
              <StatusIndicator status="alert" size="sm" pulse />
              <span className="text-xxs font-mono text-alert uppercase tracking-wider">
                {threatCounts.ransomware} RANSOM
              </span>
            </div>
          )}
          {isStale && !isLoading && (
            <span className="text-[8px] font-mono text-alert uppercase tracking-wider animate-breathe">
              STALE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            {threatCounts.total} THREATS
          </span>
          <div className="w-px h-3 bg-divider" />
          <span className="text-xxs font-mono text-text-muted tabular-nums">
            UPD: {lastUpdateStr}
          </span>
          {useLiveData && (
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xxs font-mono text-text-muted hover:text-info uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              ↻
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {showStats && !compact && <StatsBar stats={stats} />}

      {/* Filters */}
      {showFilters && !compact && (
        <FilterControls
          activeType={activeType}
          activeSeverity={activeSeverity}
          onTypeChange={setActiveType}
          onSeverityChange={setActiveSeverity}
        />
      )}

      {/* Threat list */}
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
        ) : isLoading && filteredThreats.length === 0 ? (
          <ThreatSkeleton />
        ) : filteredThreats.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
              NO THREATS MATCH FILTERS
            </span>
          </div>
        ) : (
          filteredThreats.map((threat) => (
            <ThreatItem
              key={threat.id}
              threat={threat}
              isNew={newThreatIds.has(threat.id)}
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
                  : "bg-cyber-purple animate-breathe"
            }`}
          />
          <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
            {error
              ? "FEED ERROR"
              : isLoading
                ? "FETCHING"
                : useLiveData
                  ? "LIVE FEED"
                  : "MOCK DATA"}
          </span>
        </div>
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          SHOWING {filteredThreats.length} OF {threatCounts.total}
        </span>
      </div>
    </div>
  );
}

// Compact variant
export function CompactCyberFeed() {
  return (
    <CyberThreatFeed
      maxItems={8}
      showFilters={false}
      showStats={false}
      compact
    />
  );
}
