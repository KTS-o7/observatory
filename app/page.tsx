"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import IntelFeed from "@/components/IntelFeed";
import MetricsPanel from "@/components/MetricsPanel";
import ThreatMatrix from "@/components/ThreatMatrix";
import GlobalMap from "@/components/GlobalMap";
import OperationsPanel from "@/components/OperationsPanel";
import NetworkStatus from "@/components/NetworkStatus";
import CommandInput from "@/components/CommandInput";
import { StatusIndicator } from "@/components/StatusIndicator";
import CyberThreatFeed from "@/components/CyberThreatFeed";
import SpaceWeatherPanel from "@/components/SpaceWeatherPanel";
import InfrastructurePanel from "@/components/InfrastructurePanel";
import AviationPanel from "@/components/AviationPanel";
import OsintMetricsPanel from "@/components/OsintMetricsPanel";

import VulnerabilityPanel from "@/components/VulnerabilityPanel";
import { getApiStatus } from "@/lib/api";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [selectedView, setSelectedView] = useState<
    "overview" | "intel" | "operations" | "network" | "osint"
  >("overview");
  const [showGrid, setShowGrid] = useState(false);
  const [useLiveData, setUseLiveData] = useState(true);
  const [apiStatus, setApiStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toISOString().replace("T", " ").substring(0, 19) + "Z",
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check API status on mount
  useEffect(() => {
    setApiStatus(getApiStatus());
  }, []);

  // Count available free APIs (no key required)
  const freeApisAvailable = [
    "coingecko",
    "gdelt",
    "usgs",
    "eonet",
    "exchangerate",
  ].filter((api) => apiStatus[api]).length;

  // Count OSINT sources
  const osintSourcesCount = 10; // URLhaus, Feodo, Ransomware.live, IODA, SWPC, OpenSky, ThreatFox, OpenSanctions, etc.

  // Quick stats for top bar
  const quickStats = [
    { label: "THREATS", value: "47", status: "alert" as const },
    { label: "ACTIVE OPS", value: "3", status: "active" as const },
    { label: "NODES", value: "7/8", status: "active" as const },
    { label: "LATENCY", value: "42ms", status: "active" as const },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-base-900">
      {/* Grid overlay for development */}
      {showGrid && <div className="grid-overlay visible" />}

      {/* Main Header */}
      <Header />

      {/* Secondary nav bar */}
      <div className="h-8 bg-base-850 border-b border-divider flex items-center justify-between px-4">
        {/* View tabs */}
        <div className="flex items-center gap-1">
          {(
            ["overview", "intel", "operations", "network", "osint"] as const
          ).map((view) => (
            <button
              key={view}
              onClick={() => setSelectedView(view)}
              className={`
                px-3 py-1 text-[10px] font-semibold tracking-widest uppercase
                transition-all duration-150 ease-linear
                ${
                  selectedView === view
                    ? "bg-info/15 text-info border border-info/30"
                    : "text-text-muted hover:text-text-secondary hover:bg-base-700 border border-transparent"
                }
              `}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                {stat.label}:
              </span>
              <StatusIndicator
                status={stat.status}
                size="sm"
                pulse={stat.status === "alert"}
              />
              <span
                className={`text-xs font-mono font-medium tabular-nums ${
                  stat.status === "alert" ? "text-alert" : "text-text-primary"
                }`}
              >
                {stat.value}
              </span>
            </div>
          ))}

          <div className="w-px h-4 bg-divider" />

          {/* Live data toggle */}
          <button
            onClick={() => setUseLiveData(!useLiveData)}
            className={`
              px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider
              ${useLiveData ? "text-status-active" : "text-text-muted/50"}
              hover:text-text-muted transition-colors duration-150
            `}
          >
            {useLiveData ? "LIVE" : "MOCK"}
          </button>

          <div className="w-px h-4 bg-divider" />

          {/* Grid toggle for dev */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`
              px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider
              ${showGrid ? "text-cyber-cyan" : "text-text-muted/50"}
              hover:text-text-muted transition-colors duration-150
            `}
          >
            GRID
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {selectedView === "overview" && (
          <OverviewLayout useLiveData={useLiveData} />
        )}
        {selectedView === "intel" && <IntelLayout useLiveData={useLiveData} />}
        {selectedView === "operations" && (
          <OperationsLayout useLiveData={useLiveData} />
        )}
        {selectedView === "network" && (
          <NetworkLayout useLiveData={useLiveData} />
        )}
        {selectedView === "osint" && <OsintLayout useLiveData={useLiveData} />}
      </div>

      {/* Bottom status bar */}
      <div className="h-6 bg-base-850 border-t border-divider flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-status-active rounded-full animate-breathe" />
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
              ALL SYSTEMS OPERATIONAL
            </span>
          </div>

          <div className="w-px h-3 bg-divider" />

          <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider">
            {useLiveData
              ? `LIVE: ${freeApisAvailable + osintSourcesCount} SOURCES`
              : "OSINT FALLBACK"}
          </span>

          <div className="w-px h-3 bg-divider" />

          <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider">
            REFRESH: 60S
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider">
            BUILD: 2024.03.15-A
          </span>

          <div className="w-px h-3 bg-divider" />

          <span className="text-[9px] font-mono text-text-muted tabular-nums">
            {currentTime}
          </span>
        </div>
      </div>
    </div>
  );
}

// Overview layout - main dashboard view
function OverviewLayout({ useLiveData }: { useLiveData: boolean }) {
  return (
    <div
      className="h-full grid grid-cols-12 gap-px bg-divider"
      style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}
    >
      {/* Map - spans 8 cols, 4 rows */}
      <div className="col-span-8 row-span-4 bg-base-850">
        <GlobalMap useLiveData={useLiveData} />
      </div>

      {/* Metrics panel - 4 cols, 2 rows */}
      <div className="col-span-4 row-span-2 bg-base-850">
        <MetricsPanel columns={2} useLiveData={useLiveData} />
      </div>

      {/* Threat matrix - 4 cols, 2 rows */}
      <div className="col-span-4 row-span-2 bg-base-850">
        <ThreatMatrix useLiveData={useLiveData} />
      </div>

      {/* Intel feed - 5 cols, 2 rows */}
      <div className="col-span-5 row-span-2 bg-base-850">
        <IntelFeed maxItems={6} showFilters={false} useLiveData={useLiveData} />
      </div>

      {/* Operations - 4 cols, 2 rows */}
      <div className="col-span-4 row-span-2 bg-base-850">
        <OperationsPanel showSummary={false} useLiveData={useLiveData} />
      </div>

      {/* Command input - 3 cols, 2 rows */}
      <div className="col-span-3 row-span-2 bg-base-850">
        <CommandInput maxHistory={20} />
      </div>
    </div>
  );
}

// Intel-focused layout - News, Events, Cyber Intel
function IntelLayout({ useLiveData }: { useLiveData: boolean }) {
  return (
    <div
      className="h-full grid grid-cols-12 gap-px bg-divider"
      style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}
    >
      {/* Main intel feed - large */}
      <div className="col-span-6 row-span-6 bg-base-850">
        <IntelFeed maxItems={20} useLiveData={useLiveData} />
      </div>

      {/* Cyber Threat Feed */}
      <div className="col-span-6 row-span-3 bg-base-850">
        <CyberThreatFeed useLiveData={useLiveData} maxItems={10} />
      </div>

      {/* Vulnerability Feed */}
      <div className="col-span-6 row-span-3 bg-base-850">
        <VulnerabilityPanel useLiveData={useLiveData} maxItems={8} />
      </div>
    </div>
  );
}

// Operations-focused layout - Launches, Aviation, Active Ops
function OperationsLayout({ useLiveData }: { useLiveData: boolean }) {
  const [selectedRegion, setSelectedRegion] = useState("europe");
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(
    null,
  );
  const [showMilitaryOnly, setShowMilitaryOnly] = useState(false);

  const handleAircraftSelect = useCallback((icao24: string | null) => {
    setSelectedAircraftId(icao24);
  }, []);

  const handleRegionChange = useCallback((region: string) => {
    setSelectedRegion(region);
    setSelectedAircraftId(null); // Clear selection when region changes
  }, []);

  const handleMilitaryFilterChange = useCallback((militaryOnly: boolean) => {
    setShowMilitaryOnly(militaryOnly);
    setSelectedAircraftId(null); // Clear selection when filter changes
  }, []);

  return (
    <div
      className="h-full grid grid-cols-12 gap-px bg-divider"
      style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}
    >
      {/* Map with Aircraft Tracking */}
      <div className="col-span-6 row-span-4 bg-base-850">
        <GlobalMap
          useLiveData={useLiveData}
          mode="aircraft"
          region={selectedRegion}
          selectedAircraftId={selectedAircraftId}
          onAircraftSelect={handleAircraftSelect}
          militaryOnly={showMilitaryOnly}
        />
      </div>

      {/* Aviation Tracker */}
      <div className="col-span-6 row-span-4 bg-base-850">
        <AviationPanel
          useLiveData={useLiveData}
          maxItems={15}
          region={selectedRegion}
          onRegionChange={handleRegionChange}
          selectedAircraftId={selectedAircraftId}
          onAircraftSelect={handleAircraftSelect}
          showMilitaryOnly={showMilitaryOnly}
          onMilitaryFilterChange={handleMilitaryFilterChange}
        />
      </div>

      {/* Operations panel (launches/repos) */}
      <div className="col-span-6 row-span-2 bg-base-850">
        <OperationsPanel showSummary={false} useLiveData={useLiveData} />
      </div>

      {/* Command input */}
      <div className="col-span-6 row-span-2 bg-base-850">
        <CommandInput />
      </div>
    </div>
  );
}

// Network-focused layout - Infrastructure, Connectivity, Outages
function NetworkLayout({ useLiveData }: { useLiveData: boolean }) {
  return (
    <div
      className="h-full grid grid-cols-12 gap-px bg-divider"
      style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}
    >
      {/* Network status - main */}
      <div className="col-span-6 row-span-4 bg-base-850">
        <NetworkStatus useLiveData={useLiveData} />
      </div>

      {/* Infrastructure Status */}
      <div className="col-span-6 row-span-4 bg-base-850">
        <InfrastructurePanel useLiveData={useLiveData} />
      </div>

      {/* Metrics */}
      <div className="col-span-6 row-span-2 bg-base-850">
        <MetricsPanel layout="compact" useLiveData={useLiveData} />
      </div>

      {/* Command input */}
      <div className="col-span-6 row-span-2 bg-base-850">
        <CommandInput />
      </div>
    </div>
  );
}

// OSINT-focused layout - Space Weather, Cyber Threats, Infrastructure, Vulnerabilities
function OsintLayout({ useLiveData }: { useLiveData: boolean }) {
  return (
    <div
      className="h-full grid grid-cols-12 gap-px bg-divider"
      style={{ gridTemplateRows: "repeat(6, minmax(0, 1fr))" }}
    >
      {/* OSINT Metrics Dashboard - top spanning */}
      <div className="col-span-8 row-span-3 bg-base-850">
        <OsintMetricsPanel useLiveData={useLiveData} />
      </div>

      {/* Space Weather - top right */}
      <div className="col-span-4 row-span-3 bg-base-850">
        <SpaceWeatherPanel useLiveData={useLiveData} />
      </div>

      {/* Cyber Threat Feed - bottom left */}
      <div className="col-span-4 row-span-3 bg-base-850">
        <CyberThreatFeed useLiveData={useLiveData} maxItems={12} />
      </div>

      {/* Vulnerability Feed - bottom center */}
      <div className="col-span-4 row-span-3 bg-base-850">
        <VulnerabilityPanel useLiveData={useLiveData} maxItems={10} />
      </div>

      {/* Threat Matrix - bottom right */}
      <div className="col-span-4 row-span-3 bg-base-850">
        <ThreatMatrix useLiveData={useLiveData} />
      </div>
    </div>
  );
}
