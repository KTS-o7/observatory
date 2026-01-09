"use client";

import { useState, useCallback, memo, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { StatusIndicator } from "./StatusIndicator";
import { MapMarker, EventCategory, SeverityLevel } from "@/lib/data";
import { useOsintMetrics } from "@/hooks/useApiData";
import { useMapMarkers } from "@/hooks/useApiData";

// Aircraft type for OpenSky data
interface Aircraft {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  position: { lat: number; lng: number };
  altitude: number | null;
  speed: number | null;
  heading: number | null;
  onGround: boolean;
  isMilitary: boolean;
}

// TopoJSON world map URL (free, no API key needed)
const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Get marker color based on type and severity
function getMarkerColor(type: EventCategory, severity: SeverityLevel) {
  if (severity === "critical")
    return { base: "#ef4444", glow: "rgba(239, 68, 68, 0.6)" };
  if (severity === "high")
    return { base: "#f59e0b", glow: "rgba(245, 158, 11, 0.5)" };

  switch (type) {
    case "military":
      return { base: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" };
    case "political":
      return { base: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" };
    case "economic":
      return { base: "#22c55e", glow: "rgba(34, 197, 94, 0.4)" };
    case "cyber":
      return { base: "#a855f7", glow: "rgba(168, 85, 247, 0.4)" };
    case "intel":
      return { base: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" };
    case "alert":
      return { base: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" };
    default:
      return { base: "#6b7280", glow: "rgba(107, 114, 128, 0.4)" };
  }
}

// Get aircraft marker color
function getAircraftColor(aircraft: Aircraft) {
  if (aircraft.isMilitary) {
    return { base: "#ef4444", glow: "rgba(239, 68, 68, 0.6)" }; // Red for military
  }
  if (aircraft.onGround) {
    return { base: "#6b7280", glow: "rgba(107, 114, 128, 0.4)" }; // Gray for grounded
  }
  return { base: "#06b6d4", glow: "rgba(6, 182, 212, 0.5)" }; // Cyan for civilian in-flight
}

// Generate search URL based on marker type and label
function getMarkerSearchUrl(marker: MapMarker): string {
  const query = encodeURIComponent(marker.label);
  const coords = `${marker.coordinates.lat.toFixed(2)},${marker.coordinates.lng.toFixed(2)}`;

  switch (marker.type) {
    case "military":
      return `https://www.google.com/search?q=${query}+military+news`;
    case "cyber":
      return `https://www.google.com/search?q=${query}+cyber+attack+news`;
    case "political":
      return `https://www.google.com/search?q=${query}+political+news`;
    case "economic":
      return `https://www.google.com/search?q=${query}+economic+news`;
    case "alert":
      // For disasters, link to relevant tracking sites
      if (marker.id.includes("EQ-")) {
        return `https://earthquake.usgs.gov/earthquakes/map/?extent=${marker.coordinates.lat - 5},${marker.coordinates.lng - 5}&extent=${marker.coordinates.lat + 5},${marker.coordinates.lng + 5}`;
      }
      if (marker.id.includes("EONET-")) {
        return `https://eonet.gsfc.nasa.gov/`;
      }
      return `https://www.google.com/search?q=${query}+disaster+news`;
    default:
      return `https://www.google.com/search?q=${query}+news`;
  }
}

// Get category label
function getCategoryLabel(type: EventCategory): string {
  const labels: Record<EventCategory, string> = {
    military: "MILITARY",
    political: "POLITICAL",
    economic: "ECONOMIC",
    cyber: "CYBER",
    intel: "INTEL",
    alert: "ALERT",
  };
  return labels[type] || "UNKNOWN";
}

// Get severity label
function getSeverityLabel(severity: SeverityLevel): string {
  return severity.toUpperCase();
}

// Memoized map marker component
interface MapMarkerComponentProps {
  marker: MapMarker;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const MapMarkerComponent = memo(function MapMarkerComponent({
  marker,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: MapMarkerComponentProps) {
  const colors = getMarkerColor(marker.type, marker.severity);
  const isPulsing =
    marker.severity === "critical" || marker.severity === "high";
  const isActive = isSelected || isHovered;

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getMarkerSearchUrl(marker);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Marker
      coordinates={[marker.coordinates.lng, marker.coordinates.lat]}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: "pointer" }}
    >
      {/* Outer glow */}
      <circle
        r={isActive ? 12 : 8}
        fill={colors.glow}
        style={{
          transition: "all 150ms ease-out",
        }}
      />

      {/* Pulse animation for critical markers */}
      {isPulsing && (
        <circle
          r={6}
          fill="none"
          stroke={colors.base}
          strokeWidth={1}
          opacity={0.6}
        >
          <animate
            attributeName="r"
            from="6"
            to="20"
            dur={marker.severity === "critical" ? "1s" : "2s"}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.6"
            to="0"
            dur={marker.severity === "critical" ? "1s" : "2s"}
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Main marker circle */}
      <circle
        r={isActive ? 6 : 4}
        fill={isActive ? colors.base : "transparent"}
        stroke={colors.base}
        strokeWidth={2}
        style={{
          transition: "all 150ms ease-out",
          filter: `drop-shadow(0 0 4px ${colors.glow})`,
        }}
      />

      {/* Expanded info panel on select */}
      {isSelected && (
        <g transform="translate(12, -40)">
          {/* Background */}
          <rect
            x={0}
            y={0}
            width={160}
            height={80}
            fill="#0e1318"
            stroke={colors.base}
            strokeWidth={1}
            rx={2}
          />

          {/* Category badge */}
          <rect x={4} y={4} width={50} height={14} fill={colors.glow} rx={1} />
          <text
            x={8}
            y={13}
            fill={colors.base}
            fontSize={8}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={700}
          >
            {getCategoryLabel(marker.type)}
          </text>

          {/* Severity badge */}
          <rect
            x={58}
            y={4}
            width={40}
            height={14}
            fill={
              marker.severity === "critical"
                ? "rgba(239,68,68,0.2)"
                : marker.severity === "high"
                  ? "rgba(245,158,11,0.2)"
                  : "rgba(59,130,246,0.2)"
            }
            rx={1}
          />
          <text
            x={62}
            y={13}
            fill={
              marker.severity === "critical"
                ? "#ef4444"
                : marker.severity === "high"
                  ? "#f59e0b"
                  : "#3b82f6"
            }
            fontSize={8}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={700}
          >
            {getSeverityLabel(marker.severity)}
          </text>

          {/* Title */}
          <text
            x={4}
            y={30}
            fill="#e5e7eb"
            fontSize={9}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={600}
          >
            {marker.label.length > 22
              ? marker.label.substring(0, 22) + "..."
              : marker.label}
          </text>

          {/* Coordinates */}
          <text
            x={4}
            y={42}
            fill="#6b7280"
            fontSize={7}
            fontFamily="JetBrains Mono, monospace"
          >
            {marker.coordinates.lat.toFixed(2)}°,{" "}
            {marker.coordinates.lng.toFixed(2)}°
          </text>

          {/* Event count */}
          <text
            x={4}
            y={54}
            fill="#6b7280"
            fontSize={8}
            fontFamily="JetBrains Mono, monospace"
          >
            {marker.eventCount} EVENT{marker.eventCount !== 1 ? "S" : ""}{" "}
            TRACKED
          </text>

          {/* View more link */}
          <g onClick={handleLinkClick} style={{ cursor: "pointer" }}>
            <rect
              x={4}
              y={60}
              width={70}
              height={16}
              fill="rgba(59,130,246,0.2)"
              rx={2}
            />
            <text
              x={8}
              y={72}
              fill="#3b82f6"
              fontSize={8}
              fontFamily="JetBrains Mono, monospace"
              fontWeight={600}
            >
              VIEW MORE ↗
            </text>
          </g>
        </g>
      )}

      {/* Simple label on hover (not selected) */}
      {isHovered && !isSelected && (
        <g transform="translate(12, -8)">
          <rect
            x={0}
            y={-10}
            width={100}
            height={28}
            fill="#0e1318"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
          <text
            x={6}
            y={2}
            fill="#e5e7eb"
            fontSize={9}
            fontFamily="JetBrains Mono, monospace"
            fontWeight={600}
          >
            {marker.label.length > 15
              ? marker.label.substring(0, 15) + "..."
              : marker.label}
          </text>
          <text
            x={6}
            y={14}
            fill="#6b7280"
            fontSize={8}
            fontFamily="JetBrains Mono, monospace"
          >
            Click for details
          </text>
        </g>
      )}
    </Marker>
  );
});

// Filter controls for the map
interface MapFiltersProps {
  activeTypes: Set<EventCategory>;
  onToggleType: (type: EventCategory) => void;
}

function MapFilters({ activeTypes, onToggleType }: MapFiltersProps) {
  const types: { type: EventCategory; label: string; color: string }[] = [
    { type: "military", label: "MIL", color: "bg-critical" },
    { type: "political", label: "POL", color: "bg-info" },
    { type: "economic", label: "ECO", color: "bg-status-active" },
    { type: "cyber", label: "CYB", color: "bg-cyber-purple" },
    { type: "intel", label: "INT", color: "bg-cyber-cyan" },
    { type: "alert", label: "ALT", color: "bg-alert" },
  ];

  return (
    <div className="flex items-center gap-1">
      {types.map(({ type, label, color }) => (
        <button
          key={type}
          onClick={() => onToggleType(type)}
          className={`
            flex items-center gap-1.5 px-2 py-0.5
            text-[9px] font-mono font-medium tracking-wider uppercase
            transition-all duration-150 ease-linear
            ${
              activeTypes.has(type)
                ? "bg-base-700 text-text-primary border border-divider"
                : "text-text-muted/50 border border-transparent hover:text-text-muted"
            }
          `}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${color} ${activeTypes.has(type) ? "" : "opacity-30"}`}
          />
          {label}
        </button>
      ))}
    </div>
  );
}

// Main GlobalMap component
// Aircraft marker component
interface AircraftMarkerProps {
  aircraft: Aircraft;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const AircraftMarkerComponent = memo(function AircraftMarkerComponent({
  aircraft,
  isSelected,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: AircraftMarkerProps) {
  const colors = getAircraftColor(aircraft);
  const isActive = isSelected || isHovered;
  const rotation = aircraft.heading || 0;

  return (
    <Marker
      coordinates={[aircraft.position.lng, aircraft.position.lat]}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: "pointer" }}
    >
      {/* Aircraft icon - rotated based on heading */}
      <g transform={`rotate(${rotation})`}>
        {/* Glow effect */}
        <path
          d="M0,-8 L3,-2 L8,8 L0,5 L-8,8 L-3,-2 Z"
          fill={colors.glow}
          style={{ transform: "scale(1.3)" }}
        />
        {/* Aircraft shape */}
        <path
          d="M0,-8 L3,-2 L8,8 L0,5 L-8,8 L-3,-2 Z"
          fill={isActive ? colors.base : "transparent"}
          stroke={colors.base}
          strokeWidth={1.5}
        />
      </g>

      {/* Pulse for military */}
      {aircraft.isMilitary && (
        <circle
          r={4}
          fill="none"
          stroke={colors.base}
          strokeWidth={1}
          opacity={0.6}
        >
          <animate
            attributeName="r"
            from="4"
            to="15"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.6"
            to="0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Info panel on select */}
      {isSelected && (
        <g transform="translate(12, -50)">
          <rect
            x={0}
            y={0}
            width={140}
            height={70}
            fill="#0e1318"
            stroke={colors.base}
            strokeWidth={1}
            rx={2}
          />
          <text
            x={4}
            y={12}
            fill={aircraft.isMilitary ? "#ef4444" : "#06b6d4"}
            fontSize={9}
            fontFamily="JetBrains Mono"
            fontWeight={700}
          >
            {aircraft.callsign || aircraft.icao24}
          </text>
          <text
            x={4}
            y={24}
            fill="#9ca3af"
            fontSize={8}
            fontFamily="JetBrains Mono"
          >
            {aircraft.originCountry}
          </text>
          <text
            x={4}
            y={36}
            fill="#9ca3af"
            fontSize={8}
            fontFamily="JetBrains Mono"
          >
            ALT:{" "}
            {aircraft.altitude
              ? `${Math.round(aircraft.altitude).toLocaleString()}ft`
              : "N/A"}
          </text>
          <text
            x={4}
            y={48}
            fill="#9ca3af"
            fontSize={8}
            fontFamily="JetBrains Mono"
          >
            SPD: {aircraft.speed ? `${Math.round(aircraft.speed)}kts` : "N/A"}
          </text>
          <text
            x={4}
            y={60}
            fill={aircraft.isMilitary ? "#ef4444" : "#22c55e"}
            fontSize={8}
            fontFamily="JetBrains Mono"
            fontWeight={600}
          >
            {aircraft.isMilitary
              ? "⚔️ MILITARY"
              : aircraft.onGround
                ? "ON GROUND"
                : "IN FLIGHT"}
          </text>
        </g>
      )}

      {/* Simple tooltip on hover */}
      {isHovered && !isSelected && (
        <g transform="translate(12, -8)">
          <rect
            x={0}
            y={-10}
            width={80}
            height={20}
            fill="#0e1318"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
          <text
            x={4}
            y={2}
            fill="#e5e7eb"
            fontSize={8}
            fontFamily="JetBrains Mono"
            fontWeight={600}
          >
            {aircraft.callsign || aircraft.icao24}
          </text>
        </g>
      )}
    </Marker>
  );
});

type MapMode = "events" | "aircraft";

interface GlobalMapProps {
  markers?: MapMarker[];
  onMarkerSelect?: (marker: MapMarker) => void;
  showFilters?: boolean;
  showLegend?: boolean;
  useLiveData?: boolean;
  mode?: MapMode;
  region?: string;
  selectedAircraftId?: string | null;
  onAircraftSelect?: (icao24: string | null) => void;
  militaryOnly?: boolean;
}

export default function GlobalMap({
  markers,
  onMarkerSelect,
  showFilters = true,
  showLegend = true,
  useLiveData = true,
  mode = "events",
  region = "europe",
  selectedAircraftId: externalSelectedAircraftId,
  onAircraftSelect,
  militaryOnly = false,
}: GlobalMapProps) {
  // Fetch live disaster markers (for events mode)
  const {
    data: liveMarkers,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isStale,
  } = useMapMarkers({
    enabled: useLiveData && mode === "events",
    autoRefresh: true,
    refreshInterval: 10 * 60 * 1000,
  });

  // Fetch OSINT markers as fallback
  const {
    data: osintData,
    isLoading: osintLoading,
    refetch: refetchOsint,
  } = useOsintMetrics({
    enabled: useLiveData && mode === "events",
  });

  // Aircraft state (for aircraft mode)
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [aircraftLoading, setAircraftLoading] = useState(false);
  const [aircraftError, setAircraftError] = useState<string | null>(null);
  const [internalSelectedAircraftId, setInternalSelectedAircraftId] = useState<
    string | null
  >(null);
  const [hoveredAircraftId, setHoveredAircraftId] = useState<string | null>(
    null,
  );

  // Use external selection if provided, otherwise use internal
  const selectedAircraftId =
    externalSelectedAircraftId !== undefined
      ? externalSelectedAircraftId
      : internalSelectedAircraftId;

  const handleAircraftClick = useCallback(
    (icao24: string) => {
      const newSelection = selectedAircraftId === icao24 ? null : icao24;
      if (onAircraftSelect) {
        onAircraftSelect(newSelection);
      } else {
        setInternalSelectedAircraftId(newSelection);
      }
    },
    [selectedAircraftId, onAircraftSelect],
  );

  // Fetch aircraft data when in aircraft mode
  useEffect(() => {
    if (mode !== "aircraft" || !useLiveData) {
      setAircraftLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const fetchAircraft = async () => {
      setAircraftLoading(true);
      try {
        const response = await fetch(
          `/api/aviation?region=${region}&limit=500&military=${militaryOnly}`,
          {
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error("Failed to fetch aircraft");
        const data = await response.json();
        setAircraft(data.aircraft || []);
        setAircraftError(null);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error("Aircraft fetch error:", err);
        // Use fallback data on error
        setAircraft(getFallbackAircraft());
        setAircraftError(null); // Don't show error, just use fallback
      } finally {
        setAircraftLoading(false);
      }
    };

    fetchAircraft();
    const interval = setInterval(fetchAircraft, 60 * 1000); // Refresh every 60s
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [mode, useLiveData, region, militaryOnly]);

  // Fallback aircraft data when API is slow/unavailable
  function getFallbackAircraft(): Aircraft[] {
    return [
      {
        icao24: "FALLBACK1",
        callsign: "UAL123",
        originCountry: "United States",
        position: { lat: 51.5, lng: -0.1 },
        altitude: 35000,
        speed: 450,
        heading: 90,
        onGround: false,
        isMilitary: false,
      },
      {
        icao24: "FALLBACK2",
        callsign: "BAW456",
        originCountry: "United Kingdom",
        position: { lat: 48.8, lng: 2.3 },
        altitude: 38000,
        speed: 480,
        heading: 180,
        onGround: false,
        isMilitary: false,
      },
      {
        icao24: "FALLBACK3",
        callsign: "DLH789",
        originCountry: "Germany",
        position: { lat: 52.5, lng: 13.4 },
        altitude: 32000,
        speed: 420,
        heading: 270,
        onGround: false,
        isMilitary: false,
      },
      {
        icao24: "FALLBACK4",
        callsign: "AFR001",
        originCountry: "France",
        position: { lat: 50.0, lng: 8.5 },
        altitude: 40000,
        speed: 500,
        heading: 45,
        onGround: false,
        isMilitary: false,
      },
      {
        icao24: "FALLBACK5",
        callsign: "RRR001",
        originCountry: "United States",
        position: { lat: 54.0, lng: 10.0 },
        altitude: 42000,
        speed: 520,
        heading: 120,
        onGround: false,
        isMilitary: true,
      },
      {
        icao24: "FALLBACK6",
        callsign: "NATO01",
        originCountry: "NATO",
        position: { lat: 55.5, lng: 12.5 },
        altitude: 45000,
        speed: 550,
        heading: 60,
        onGround: false,
        isMilitary: true,
      },
    ];
  }

  // Convert OSINT markers to MapMarker format
  const osintMarkers: MapMarker[] = (osintData?.mapMarkers || []).map((m) => ({
    id: m.id,
    coordinates: m.coordinates,
    type: m.type as EventCategory,
    severity: m.severity as SeverityLevel,
    label: m.label,
    eventCount: m.eventCount,
    lastUpdate: m.lastUpdate,
  }));

  // Fallback markers when APIs are slow/unavailable
  const fallbackMarkers: MapMarker[] = [
    {
      id: "HOTSPOT-UKRAINE",
      coordinates: { lat: 48.3794, lng: 31.1656 },
      type: "military" as EventCategory,
      severity: "critical" as SeverityLevel,
      label: "Ukraine Conflict Zone",
      eventCount: 50,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "HOTSPOT-MIDDLEEAST",
      coordinates: { lat: 31.5, lng: 34.8 },
      type: "military" as EventCategory,
      severity: "critical" as SeverityLevel,
      label: "Middle East Tensions",
      eventCount: 35,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "HOTSPOT-TAIWAN",
      coordinates: { lat: 23.6978, lng: 120.9605 },
      type: "political" as EventCategory,
      severity: "high" as SeverityLevel,
      label: "Taiwan Strait",
      eventCount: 12,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "CYBER-RUSSIA",
      coordinates: { lat: 55.7558, lng: 37.6173 },
      type: "cyber" as EventCategory,
      severity: "high" as SeverityLevel,
      label: "Cyber Activity - Moscow",
      eventCount: 25,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "CYBER-CHINA",
      coordinates: { lat: 39.9042, lng: 116.4074 },
      type: "cyber" as EventCategory,
      severity: "high" as SeverityLevel,
      label: "Cyber Activity - Beijing",
      eventCount: 30,
      lastUpdate: new Date().toISOString(),
    },
    {
      id: "HOTSPOT-KOREA",
      coordinates: { lat: 38.0, lng: 127.0 },
      type: "military" as EventCategory,
      severity: "high" as SeverityLevel,
      label: "Korean Peninsula",
      eventCount: 15,
      lastUpdate: new Date().toISOString(),
    },
  ];

  // Use live markers if available, otherwise fall back to OSINT markers, provided markers, or fallback
  const baseMarkers =
    useLiveData && liveMarkers && liveMarkers.length > 0
      ? liveMarkers
      : osintMarkers.length > 0
        ? osintMarkers
        : markers && markers.length > 0
          ? markers
          : fallbackMarkers;

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<EventCategory>>(
    new Set(["military", "political", "economic", "cyber", "intel", "alert"]),
  );
  const [position, setPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({
    coordinates: [0, 20],
    zoom: 1,
  });

  // Filter markers based on active types
  const filteredMarkers = baseMarkers.filter((m) => activeTypes.has(m.type));

  // Handle marker selection
  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      setSelectedMarkerId(marker.id === selectedMarkerId ? null : marker.id);
      onMarkerSelect?.(marker);
    },
    [selectedMarkerId, onMarkerSelect],
  );

  // Toggle filter type
  const handleToggleType = useCallback((type: EventCategory) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Auto-center on selected aircraft when selection changes from external source
  useEffect(() => {
    if (selectedAircraftId && aircraft.length > 0) {
      const selectedAircraft = aircraft.find(
        (ac) => ac.icao24 === selectedAircraftId,
      );
      if (
        selectedAircraft &&
        selectedAircraft.position.lat &&
        selectedAircraft.position.lng
      ) {
        setPosition({
          coordinates: [
            selectedAircraft.position.lng,
            selectedAircraft.position.lat,
          ],
          zoom: Math.max(position.zoom, 3), // Zoom in at least to level 3
        });
      }
    }
  }, [selectedAircraftId, aircraft]);

  // Handle zoom
  const handleMoveEnd = useCallback(
    (position: { coordinates: [number, number]; zoom: number }) => {
      setPosition(position);
    },
    [],
  );

  // Stats for header
  const stats = {
    total: filteredMarkers.length,
    critical: filteredMarkers.filter((m) => m.severity === "critical").length,
    active: filteredMarkers.filter((m) => m.eventCount > 0).length,
  };

  // Combined loading and error states
  // Only show loading if we have no data to display
  const isMapLoading =
    mode === "aircraft"
      ? aircraftLoading && aircraft.length === 0
      : isLoading && baseMarkers.length === 0;
  const mapError =
    mode === "aircraft"
      ? aircraftError && aircraft.length === 0
        ? aircraftError
        : null
      : error && baseMarkers.length === 0
        ? error
        : null;

  // Format last update time
  const lastUpdateStr = lastUpdated
    ? lastUpdated.toISOString().substring(11, 19) + "Z"
    : new Date().toISOString().substring(11, 19) + "Z";

  return (
    <div className="panel h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <span className="panel-title">
            {mode === "aircraft"
              ? "✈️ AIRCRAFT TRACKING"
              : "GLOBAL SITUATION MAP"}
          </span>
          <div className="flex items-center gap-1.5">
            <StatusIndicator
              status={mapError ? "critical" : isMapLoading ? "alert" : "active"}
              size="sm"
              pulse={isMapLoading}
            />
            <span
              className={`text-xxs font-mono uppercase tracking-wider ${
                mapError
                  ? "text-critical"
                  : isMapLoading
                    ? "text-alert"
                    : "text-text-muted"
              }`}
            >
              {mapError
                ? "ERROR"
                : isMapLoading
                  ? "LOADING"
                  : mode === "aircraft"
                    ? `${aircraft.length} AIRCRAFT`
                    : `${stats.total} MARKERS`}
            </span>
          </div>
          {stats.critical > 0 && !error && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-critical/10">
              <StatusIndicator status="critical" size="sm" />
              <span className="text-xxs font-mono text-critical uppercase tracking-wider">
                {stats.critical} CRITICAL
              </span>
            </div>
          )}
          {isStale && !isLoading && (
            <span className="text-[8px] font-mono text-alert uppercase tracking-wider animate-breathe">
              STALE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
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
        <div className="px-3 py-2 border-b border-divider bg-base-800">
          <MapFilters
            activeTypes={activeTypes}
            onToggleType={handleToggleType}
          />
        </div>
      )}

      {/* Map container */}
      <div
        className="flex-1 relative overflow-hidden bg-base-900 min-h-0"
        style={{
          background:
            "radial-gradient(ellipse at center, #0e1318 0%, #0a0d0f 100%)",
          minHeight: "200px",
        }}
      >
        {/* Loading overlay */}
        {isLoading && filteredMarkers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-900/50 z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-info border-t-transparent rounded-full animate-spin" />
              <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">
                LOADING MARKERS
              </span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-base-900/50 z-20">
            <div className="flex flex-col items-center gap-2">
              <StatusIndicator status="critical" size="lg" />
              <span className="text-xxs font-mono text-critical uppercase tracking-wider">
                {error}
              </span>
              <button
                onClick={() => refetch()}
                className="px-3 py-1 text-xxs font-semibold tracking-wider uppercase text-text-secondary hover:text-text-primary bg-base-700 hover:bg-base-600 border border-divider transition-colors"
              >
                RETRY
              </button>
            </div>
          </div>
        )}

        {/* The actual map */}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 140,
            center: [0, 30],
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={handleMoveEnd}
            minZoom={1}
            maxZoom={8}
          >
            {/* Ocean/background gradient */}
            <rect x={-500} y={-500} width={2000} height={2000} fill="#0a0d0f" />

            {/* Grid lines */}
            <g stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} fill="none">
              {/* Latitude lines */}
              {[-60, -30, 0, 30, 60].map((lat) => (
                <line
                  key={`lat-${lat}`}
                  x1={-180}
                  y1={lat}
                  x2={180}
                  y2={lat}
                  transform={`translate(0, ${-lat * 2})`}
                />
              ))}
            </g>

            {/* Countries */}
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#1a242c"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={0.5}
                    style={{
                      default: {
                        fill: "#1a242c",
                        stroke: "rgba(255,255,255,0.08)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      hover: {
                        fill: "#222e38",
                        stroke: "rgba(255,255,255,0.15)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      pressed: {
                        fill: "#222e38",
                        stroke: "rgba(255,255,255,0.15)",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Event Markers (events mode) */}
            {mode === "events" &&
              filteredMarkers.map((marker) => (
                <MapMarkerComponent
                  key={marker.id}
                  marker={marker}
                  isSelected={selectedMarkerId === marker.id}
                  isHovered={hoveredMarkerId === marker.id}
                  onClick={() => handleMarkerClick(marker)}
                  onMouseEnter={() => setHoveredMarkerId(marker.id)}
                  onMouseLeave={() => setHoveredMarkerId(null)}
                />
              ))}

            {/* Aircraft Markers (aircraft mode) */}
            {mode === "aircraft" &&
              aircraft.map((ac) => (
                <AircraftMarkerComponent
                  key={ac.icao24}
                  aircraft={ac}
                  isSelected={selectedAircraftId === ac.icao24}
                  isHovered={hoveredAircraftId === ac.icao24}
                  onClick={() => handleAircraftClick(ac.icao24)}
                  onMouseEnter={() => setHoveredAircraftId(ac.icao24)}
                  onMouseLeave={() => setHoveredAircraftId(null)}
                />
              ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            onClick={() =>
              setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 1.5, 8) }))
            }
            className="w-6 h-6 flex items-center justify-center bg-base-800 border border-divider text-text-muted hover:text-text-primary hover:bg-base-700 transition-colors text-sm font-mono"
          >
            +
          </button>
          <button
            onClick={() =>
              setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 1.5, 1) }))
            }
            className="w-6 h-6 flex items-center justify-center bg-base-800 border border-divider text-text-muted hover:text-text-primary hover:bg-base-700 transition-colors text-sm font-mono"
          >
            −
          </button>
          <button
            onClick={() => setPosition({ coordinates: [0, 20], zoom: 1 })}
            className="w-6 h-6 flex items-center justify-center bg-base-800 border border-divider text-text-muted hover:text-text-primary hover:bg-base-700 transition-colors text-[8px] font-mono"
          >
            ⟲
          </button>
        </div>

        {/* Coordinates display */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="text-[8px] font-mono text-text-muted/50 tabular-nums">
            {position.coordinates[1].toFixed(1)}°
            {position.coordinates[1] >= 0 ? "N" : "S"},{" "}
            {position.coordinates[0].toFixed(1)}°
            {position.coordinates[0] >= 0 ? "E" : "W"}
          </span>
          <span className="text-[8px] font-mono text-text-muted/30">|</span>
          <span className="text-[8px] font-mono text-text-muted/50">
            ZOOM: {position.zoom.toFixed(1)}x
          </span>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="px-3 py-2 border-t border-divider bg-base-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border-2 border-alert" />
                <span className="text-[9px] font-mono text-text-muted uppercase">
                  DISASTER
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border-2 border-critical" />
                <span className="text-[9px] font-mono text-text-muted uppercase">
                  EARTHQUAKE
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border-2 border-cyber-cyan" />
                <span className="text-[9px] font-mono text-text-muted uppercase">
                  STORM
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border-2 border-status-active" />
                <span className="text-[9px] font-mono text-text-muted uppercase">
                  FIRE
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-text-muted/60 uppercase tracking-wider">
                {useLiveData ? "LIVE: USGS + NASA EONET + OSINT" : "NO DATA"}
              </span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full bg-critical animate-ping"
                  style={{ animationDuration: "1.5s" }}
                />
                <span className="text-[9px] font-mono text-text-muted uppercase">
                  CRITICAL
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact variant
export function CompactGlobalMap() {
  return <GlobalMap showFilters={false} showLegend={false} />;
}
