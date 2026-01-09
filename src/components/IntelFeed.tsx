"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusIndicator } from "./StatusIndicator";
import { useIntelFeed, useOsintMetrics } from "@/hooks/useApiData";
import {
  IntelEvent,
  EventCategory,
  SeverityLevel,
  formatTimeAgo,
} from "@/lib/data";

// Category badge component
interface CategoryBadgeProps {
  category: EventCategory;
}

function CategoryBadge({ category }: CategoryBadgeProps) {
  const categoryConfig: Record<
    EventCategory,
    { bg: string; text: string; label: string }
  > = {
    military: {
      bg: "bg-critical/15",
      text: "text-critical",
      label: "MILITARY",
    },
    political: {
      bg: "bg-info/15",
      text: "text-info",
      label: "POLITICAL",
    },
    economic: {
      bg: "bg-status-active/15",
      text: "text-status-active",
      label: "ECONOMIC",
    },
    cyber: {
      bg: "bg-cyber-purple/15",
      text: "text-cyber-purple",
      label: "CYBER",
    },
    intel: {
      bg: "bg-cyber-cyan/15",
      text: "text-cyber-cyan",
      label: "INTEL",
    },
    alert: {
      bg: "bg-alert/15",
      text: "text-alert",
      label: "ALERT",
    },
  };

  const config = categoryConfig[category];

  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5
        text-[9px] font-semibold tracking-widest uppercase
        ${config.bg} ${config.text}
      `}
    >
      {config.label}
    </span>
  );
}

// Severity indicator
interface SeverityIndicatorProps {
  severity: SeverityLevel;
}

function SeverityIndicator({ severity }: SeverityIndicatorProps) {
  const severityConfig: Record<
    SeverityLevel,
    { status: "active" | "info" | "alert" | "critical" }
  > = {
    low: { status: "active" },
    medium: { status: "info" },
    high: { status: "alert" },
    critical: { status: "critical" },
  };

  return (
    <StatusIndicator
      status={severityConfig[severity].status}
      size="sm"
      pulse={severity === "critical" || severity === "high"}
    />
  );
}

// Single feed item
interface FeedItemProps {
  event: IntelEvent;
  isNew?: boolean;
}

function FeedItem({ event, isNew = false }: FeedItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (event.url) {
      window.open(event.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={`
        feed-row group cursor-pointer
        ${isNew ? "animate-fade-in bg-base-750" : ""}
        ${isHovered ? "bg-base-750" : ""}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      title={event.url ? `Click to open: ${event.url}` : undefined}
    >
      {/* Severity indicator */}
      <div className="flex-shrink-0 w-4">
        <SeverityIndicator severity={event.severity} />
      </div>

      {/* Category badge - prominent per design spec */}
      <div className="flex-shrink-0 w-16">
        <CategoryBadge category={event.category} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Title row */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium truncate ${event.url ? "text-text-primary group-hover:text-info transition-colors" : "text-text-primary"}`}
          >
            {event.title}
          </span>
          {event.url && (
            <span className="flex-shrink-0 text-[9px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              ↗
            </span>
          )}
          {event.status === "active" && (
            <span className="flex-shrink-0 text-[8px] font-bold tracking-widest text-status-active uppercase animate-breathe">
              LIVE
            </span>
          )}
        </div>

        {/* Summary - visible on hover or for high priority */}
        {(isHovered || event.severity === "critical") && (
          <p className="text-xxs text-text-muted line-clamp-1 animate-fade-in">
            {event.summary}
          </p>
        )}
      </div>

      {/* Location */}
      {event.location && (
        <div className="flex-shrink-0 hidden sm:block">
          <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
            {event.location}
          </span>
        </div>
      )}

      {/* Timestamp */}
      <div className="flex-shrink-0 w-16 text-right">
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          {formatTimeAgo(event.timestamp)}
        </span>
      </div>

      {/* Source indicator with link icon */}
      <div className="flex-shrink-0 w-16 text-right hidden lg:block">
        <span className="text-xxs font-mono text-text-muted/60 tabular-nums">
          {event.source?.split("/")[0] || event.id}
        </span>
      </div>

      {/* External link indicator */}
      {event.url && (
        <div className="flex-shrink-0 w-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-3 h-3 text-info"
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
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function FeedSkeleton() {
  return (
    <div className="space-y-0">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="feed-row animate-pulse">
          <div className="w-4 h-2 bg-base-600 rounded" />
          <div className="w-16 h-4 bg-base-600 rounded" />
          <div className="flex-1 h-4 bg-base-600 rounded" />
          <div className="w-16 h-3 bg-base-600 rounded" />
        </div>
      ))}
    </div>
  );
}

// Error display
interface FeedErrorProps {
  message: string;
  onRetry: () => void;
}

function FeedError({ message, onRetry }: FeedErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
      <StatusIndicator status="critical" size="lg" />
      <span className="text-xs font-mono text-critical uppercase tracking-wider text-center">
        {message}
      </span>
      <button
        onClick={onRetry}
        className="px-3 py-1 text-xxs font-semibold tracking-wider uppercase text-text-secondary hover:text-text-primary bg-base-700 hover:bg-base-600 border border-divider transition-colors"
      >
        RETRY
      </button>
    </div>
  );
}

// Filter controls
interface FilterControlsProps {
  activeCategory: EventCategory | "all";
  activeSeverity: SeverityLevel | "all";
  onCategoryChange: (category: EventCategory | "all") => void;
  onSeverityChange: (severity: SeverityLevel | "all") => void;
}

function FilterControls({
  activeCategory,
  activeSeverity,
  onCategoryChange,
  onSeverityChange,
}: FilterControlsProps) {
  const categories: (EventCategory | "all")[] = [
    "all",
    "military",
    "political",
    "economic",
    "cyber",
    "intel",
    "alert",
  ];
  const severities: (SeverityLevel | "all")[] = [
    "all",
    "critical",
    "high",
    "medium",
    "low",
  ];

  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      {/* Category filters */}
      <div className="flex items-center gap-1">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider mr-2">
          CAT:
        </span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`
              px-2 py-0.5 text-[9px] font-semibold tracking-wider uppercase
              transition-all duration-150 ease-linear
              ${
                activeCategory === cat
                  ? "bg-info/20 text-info border border-info/30"
                  : "text-text-muted hover:text-text-secondary hover:bg-base-700 border border-transparent"
              }
            `}
          >
            {cat === "all" ? "ALL" : cat.slice(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Divider */}
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
                  ? "bg-info/20 text-info border border-info/30"
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

// Main IntelFeed component
interface IntelFeedProps {
  maxItems?: number;
  showFilters?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  useLiveData?: boolean;
}

export default function IntelFeed({
  maxItems = 10,
  showFilters = true,
  compact = false,
  autoRefresh = true,
  refreshInterval = 30000,
  useLiveData = true,
}: IntelFeedProps) {
  // Use the custom hook for fetching live data
  const {
    data: liveEvents,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isStale,
  } = useIntelFeed({
    autoRefresh,
    refreshInterval: refreshInterval * 2, // API refresh less frequently
    enabled: useLiveData,
  });

  // Use OSINT metrics as fallback for intel events
  const {
    data: osintData,
    isLoading: osintLoading,
    refetch: refetchOsint,
  } = useOsintMetrics({
    enabled: useLiveData,
  });

  // Convert OSINT intel events to IntelEvent format
  const osintEvents: IntelEvent[] = (osintData?.intelEvents || []).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    category: e.category as EventCategory,
    severity: e.severity as SeverityLevel,
    title: e.title,
    summary: e.summary,
    location: e.location,
    source: e.source,
    status: e.status as "active" | "monitoring" | "resolved" | "archived",
    tags: e.tags,
  }));

  // Fall back to OSINT events if live news data is unavailable
  const baseEvents =
    useLiveData && liveEvents && liveEvents.length > 0
      ? liveEvents
      : osintEvents.length > 0
        ? osintEvents
        : [];

  const [filteredEvents, setFilteredEvents] =
    useState<IntelEvent[]>(baseEvents);
  const [activeCategory, setActiveCategory] = useState<EventCategory | "all">(
    "all",
  );
  const [activeSeverity, setActiveSeverity] = useState<SeverityLevel | "all">(
    "all",
  );
  const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
  const [displayTime, setDisplayTime] = useState<Date>(new Date());

  // Update display time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter events when filters or source data change
  useEffect(() => {
    let filtered = [...baseEvents];

    if (activeCategory !== "all") {
      filtered = filtered.filter((e) => e.category === activeCategory);
    }

    if (activeSeverity !== "all") {
      filtered = filtered.filter((e) => e.severity === activeSeverity);
    }

    // Sort by timestamp (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Limit items
    filtered = filtered.slice(0, maxItems);

    setFilteredEvents(filtered);
  }, [baseEvents, activeCategory, activeSeverity, maxItems]);

  // Track new events for highlighting
  useEffect(() => {
    if (liveEvents && liveEvents.length > 0) {
      const currentIds = new Set(filteredEvents.map((e) => e.id));
      const newIds = liveEvents
        .filter((e) => !currentIds.has(e.id))
        .map((e) => e.id);

      if (newIds.length > 0) {
        setNewEventIds(new Set(newIds));
        // Clear highlights after animation
        setTimeout(() => setNewEventIds(new Set()), 3000);
      }
    }
  }, [liveEvents]);

  const eventCounts = {
    total: baseEvents.length,
    critical: baseEvents.filter((e) => e.severity === "critical").length,
    active: baseEvents.filter((e) => e.status === "active").length,
  };

  // Format last update time
  const lastUpdateStr = lastUpdated
    ? lastUpdated.toISOString().substring(11, 19) + "Z"
    : displayTime.toISOString().substring(11, 19) + "Z";

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">INTELLIGENCE FEED</span>
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
                  : `${eventCounts.active} ACTIVE`}
            </span>
          </div>
          {eventCounts.critical > 0 && !error && (
            <div className="flex items-center gap-2">
              <StatusIndicator status="critical" size="sm" />
              <span className="text-xxs font-mono text-critical uppercase tracking-wider">
                {eventCounts.critical} CRITICAL
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
            {eventCounts.total} EVENTS
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

      {/* Filters */}
      {showFilters && (
        <FilterControls
          activeCategory={activeCategory}
          activeSeverity={activeSeverity}
          onCategoryChange={setActiveCategory}
          onSeverityChange={setActiveSeverity}
        />
      )}

      {/* Feed list */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <FeedError message={error} onRetry={refetch} />
        ) : isLoading && filteredEvents.length === 0 ? (
          <FeedSkeleton />
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">
              NO EVENTS MATCH FILTERS
            </span>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <FeedItem
              key={event.id}
              event={event}
              isNew={newEventIds.has(event.id)}
            />
          ))
        )}
      </div>

      {/* Footer status bar */}
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
              ? "STREAM ERROR"
              : isLoading
                ? "FETCHING"
                : useLiveData
                  ? "LIVE STREAM"
                  : "MOCK DATA"}
          </span>
        </div>
        <span className="text-xxs font-mono text-text-muted tabular-nums">
          SHOWING {filteredEvents.length} OF {eventCounts.total}
        </span>
      </div>
    </div>
  );
}

// Export compact feed variant
export function CompactIntelFeed() {
  return <IntelFeed maxItems={5} showFilters={false} compact />;
}
