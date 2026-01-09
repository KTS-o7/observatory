"use client";

import { useState, useEffect, useCallback } from "react";
import { StatusIndicator } from "./StatusIndicator";

// ===========================================
// Types
// ===========================================

interface Launch {
  id: string;
  name: string;
  status: "upcoming" | "live" | "success" | "failure" | "tbd";
  date: string;
  provider: string;
  rocket: string;
  mission: string;
  launchpad: string;
  details?: string;
  webcast?: string;
  countdown?: number;
}

interface TrendingRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  url: string;
  stars: number;
  language: string;
  owner: string;
}

interface LaunchApiResponse {
  launches: Launch[];
  trending: TrendingRepo[];
  summary: {
    upcoming: number;
    live: number;
    total: number;
    nextLaunch: string | null;
    nextCountdown: number | null;
  };
  lastUpdated: string;
  error?: string;
}

// ===========================================
// Status Badge Component
// ===========================================

interface StatusBadgeProps {
  status: Launch["status"];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    upcoming: {
      bg: "bg-info/15",
      text: "text-info",
      border: "border-info/30",
      label: "T-MINUS",
    },
    live: {
      bg: "bg-critical/15",
      text: "text-critical",
      border: "border-critical/30",
      label: "LIVE",
    },
    success: {
      bg: "bg-status-active/15",
      text: "text-status-active",
      border: "border-status-active/30",
      label: "SUCCESS",
    },
    failure: {
      bg: "bg-critical/15",
      text: "text-critical",
      border: "border-critical/30",
      label: "FAILURE",
    },
    tbd: {
      bg: "bg-alert/15",
      text: "text-alert",
      border: "border-alert/30",
      label: "TBD",
    },
  };

  const { bg, text, border, label } = config[status];

  return (
    <span
      className={`
        inline-flex items-center px-1.5 py-0.5
        text-[9px] font-semibold tracking-widest uppercase
        ${bg} ${text} border ${border}
      `}
    >
      {label}
    </span>
  );
}

// ===========================================
// Countdown Display
// ===========================================

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "T-00:00:00";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `T-${days}d ${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `T-${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

interface CountdownProps {
  seconds: number;
  status: Launch["status"];
}

function Countdown({ seconds, status }: CountdownProps) {
  const [currentSeconds, setCurrentSeconds] = useState(seconds);

  useEffect(() => {
    setCurrentSeconds(seconds);
  }, [seconds]);

  useEffect(() => {
    if (status !== "upcoming" || currentSeconds <= 0) return;

    const interval = setInterval(() => {
      setCurrentSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [status, currentSeconds]);

  if (status === "live") {
    return (
      <span className="text-xs font-mono font-bold text-critical tabular-nums animate-pulse">
        🔴 LIVE NOW
      </span>
    );
  }

  if (status === "success") {
    return (
      <span className="text-xs font-mono text-status-active tabular-nums">
        ✓ COMPLETE
      </span>
    );
  }

  if (status === "failure") {
    return (
      <span className="text-xs font-mono text-critical tabular-nums">
        ✗ FAILED
      </span>
    );
  }

  if (status === "tbd" || !currentSeconds) {
    return (
      <span className="text-xs font-mono text-text-muted tabular-nums">
        TBD
      </span>
    );
  }

  return (
    <span
      className={`text-xs font-mono font-medium tabular-nums ${
        currentSeconds < 3600 ? "text-alert" : "text-info"
      }`}
    >
      {formatCountdown(currentSeconds)}
    </span>
  );
}

// ===========================================
// Launch Row Component
// ===========================================

interface LaunchRowProps {
  launch: Launch;
  isSelected: boolean;
  onClick: () => void;
}

function LaunchRow({ launch, isSelected, onClick }: LaunchRowProps) {
  const statusIndicatorType =
    launch.status === "live"
      ? ("critical" as const)
      : launch.status === "upcoming"
        ? ("info" as const)
        : launch.status === "success"
          ? ("active" as const)
          : ("alert" as const);

  return (
    <div
      onClick={onClick}
      className={`
        border-b border-divider last:border-b-0
        cursor-pointer transition-all duration-150 ease-linear
        ${isSelected ? "bg-base-700" : "hover:bg-base-750"}
      `}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2">
        {/* Status indicator */}
        <div className="flex-shrink-0">
          <StatusIndicator
            status={statusIndicatorType}
            size="sm"
            pulse={launch.status === "live" || launch.status === "upcoming"}
          />
        </div>

        {/* Provider badge */}
        <div className="flex-shrink-0 w-12">
          <span className="text-[9px] font-mono font-semibold text-cyber-cyan uppercase tracking-wider">
            {launch.provider}
          </span>
        </div>

        {/* Mission name */}
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-text-primary truncate block">
            {launch.name}
          </span>
          <span className="text-[10px] font-mono text-text-muted truncate block">
            {launch.rocket} • {launch.launchpad.split(",")[0]}
          </span>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          <StatusBadge status={launch.status} />
        </div>

        {/* Countdown */}
        <div className="flex-shrink-0 w-28 text-right">
          <Countdown seconds={launch.countdown || 0} status={launch.status} />
        </div>
      </div>

      {/* Expanded details */}
      {isSelected && launch.details && (
        <div className="px-3 pb-2 animate-fade-in">
          <p className="text-[10px] text-text-muted pl-7 border-l border-divider ml-1">
            {launch.details.substring(0, 200)}
            {launch.details.length > 200 ? "..." : ""}
          </p>
          {launch.webcast && (
            <a
              href={launch.webcast}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-info hover:text-info/80 pl-7 mt-1 inline-block"
              onClick={(e) => e.stopPropagation()}
            >
              🎬 Watch Stream →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================
// Trending Repo Row
// ===========================================

interface RepoRowProps {
  repo: TrendingRepo;
}

function RepoRow({ repo }: RepoRowProps) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2 border-b border-divider last:border-b-0 hover:bg-base-750 transition-colors"
    >
      <div className="flex-shrink-0">
        <span className="text-[10px] font-mono text-cyber-purple">⭐</span>
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-text-primary truncate block">
          {repo.fullName}
        </span>
        <span className="text-[10px] text-text-muted truncate block">
          {repo.description}
        </span>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2">
        {repo.language && (
          <span className="text-[9px] font-mono text-cyber-cyan uppercase">
            {repo.language}
          </span>
        )}
        <span className="text-xs font-mono text-alert tabular-nums">
          {repo.stars.toLocaleString()}★
        </span>
      </div>
    </a>
  );
}

// ===========================================
// Summary Bar
// ===========================================

interface SummaryBarProps {
  upcoming: number;
  live: number;
  nextCountdown: number | null;
}

function SummaryBar({ upcoming, live, nextCountdown }: SummaryBarProps) {
  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b border-divider bg-base-800">
      <div className="flex items-center gap-2">
        <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
          UPCOMING:
        </span>
        <span className="text-sm font-mono font-semibold text-info tabular-nums">
          {upcoming}
        </span>
      </div>

      <div className="w-px h-4 bg-divider" />

      {live > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
              LIVE:
            </span>
            <span className="text-sm font-mono font-semibold text-critical tabular-nums animate-pulse">
              {live}
            </span>
          </div>
          <div className="w-px h-4 bg-divider" />
        </>
      )}

      {nextCountdown && nextCountdown > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
            NEXT:
          </span>
          <span className="text-sm font-mono font-semibold text-alert tabular-nums">
            {formatCountdown(nextCountdown)}
          </span>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Loading Skeleton
// ===========================================

function LaunchSkeleton() {
  return (
    <div className="space-y-0">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 border-b border-divider animate-pulse"
        >
          <div className="w-2 h-2 bg-base-600 rounded-full" />
          <div className="w-12 h-3 bg-base-600 rounded" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-base-600 rounded w-3/4" />
            <div className="h-2 bg-base-600 rounded w-1/2" />
          </div>
          <div className="w-16 h-4 bg-base-600 rounded" />
          <div className="w-24 h-3 bg-base-600 rounded" />
        </div>
      ))}
    </div>
  );
}

// ===========================================
// Main Component
// ===========================================

interface OperationsPanelProps {
  showSummary?: boolean;
  useLiveData?: boolean;
}

export default function OperationsPanel({
  showSummary = true,
  useLiveData = true,
}: OperationsPanelProps) {
  const [data, setData] = useState<LaunchApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"launches" | "trending">(
    "launches",
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!useLiveData) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/launches");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: LaunchApiResponse = await response.json();
      setData(result);
      setLastUpdate(new Date(result.lastUpdated));

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Launch fetch error:", err);
      setError("Failed to fetch launch data");
    } finally {
      setIsLoading(false);
    }
  }, [useLiveData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!useLiveData) return;

    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData, useLiveData]);

  const lastUpdateStr = lastUpdate.toISOString().substring(11, 19) + "Z";

  return (
    <div className="panel h-full flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">MISSIONS & LAUNCHES</span>
          <div className="flex items-center gap-1.5">
            <StatusIndicator
              status={error ? "alert" : isLoading ? "info" : "active"}
              size="sm"
              pulse={isLoading || (data?.summary.live || 0) > 0}
            />
            <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
              {error
                ? "ERROR"
                : isLoading
                  ? "UPDATING"
                  : data?.summary.live
                    ? `${data.summary.live} LIVE`
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

      {/* Tab switcher */}
      <div className="flex border-b border-divider bg-base-800">
        <button
          onClick={() => setActiveTab("launches")}
          className={`flex-1 px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
            activeTab === "launches"
              ? "text-info border-b-2 border-info bg-info/5"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          🚀 LAUNCHES
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          className={`flex-1 px-3 py-1.5 text-[10px] font-semibold tracking-widest uppercase transition-colors ${
            activeTab === "trending"
              ? "text-cyber-purple border-b-2 border-cyber-purple bg-cyber-purple/5"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          ⭐ GITHUB TRENDING
        </button>
      </div>

      {/* Summary bar */}
      {showSummary && activeTab === "launches" && data && (
        <SummaryBar
          upcoming={data.summary.upcoming}
          live={data.summary.live}
          nextCountdown={data.summary.nextCountdown}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && !data ? (
          <LaunchSkeleton />
        ) : activeTab === "launches" ? (
          data?.launches && data.launches.length > 0 ? (
            data.launches.map((launch) => (
              <LaunchRow
                key={launch.id}
                launch={launch}
                isSelected={selectedId === launch.id}
                onClick={() =>
                  setSelectedId(launch.id === selectedId ? null : launch.id)
                }
              />
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-xs font-mono">
              No launches found
            </div>
          )
        ) : data?.trending && data.trending.length > 0 ? (
          data.trending.map((repo) => <RepoRow key={repo.id} repo={repo} />)
        ) : (
          <div className="flex items-center justify-center h-full text-text-muted text-xs font-mono">
            No trending repos found
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-divider bg-base-800 flex items-center justify-between">
        <span className="text-[8px] font-mono text-text-muted/60 uppercase tracking-wider">
          {activeTab === "launches"
            ? "SOURCE: SPACEX API + LAUNCH LIBRARY"
            : "SOURCE: GITHUB API"}
        </span>
        <span className="text-[8px] font-mono text-text-muted/60 uppercase tracking-wider">
          REFRESH: 5M
        </span>
      </div>
    </div>
  );
}
