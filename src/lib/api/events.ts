// Natural Events API Service for Observatory Dashboard
// Fetches earthquake data from USGS and natural events from NASA EONET
// These APIs do not require API keys

import { API_ENDPOINTS, fetchWithCache, getRateLimiter } from './config';
import type { IntelEvent, MapMarker, Coordinates } from '../data';

// ===========================================
// TYPES
// ===========================================

// USGS Earthquake types
interface USGSFeature {
  type: 'Feature';
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    tz: number | null;
    url: string;
    detail: string;
    felt: number | null;
    cdi: number | null;
    mmi: number | null;
    alert: 'green' | 'yellow' | 'orange' | 'red' | null;
    status: 'automatic' | 'reviewed' | 'deleted';
    tsunami: number;
    sig: number;
    net: string;
    code: string;
    ids: string;
    sources: string;
    types: string;
    nst: number | null;
    dmin: number | null;
    rms: number;
    gap: number | null;
    magType: string;
    type: string;
    title: string;
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number, number]; // [longitude, latitude, depth]
  };
}

interface USGSResponse {
  type: 'FeatureCollection';
  metadata: {
    generated: number;
    url: string;
    title: string;
    status: number;
    api: string;
    count: number;
  };
  features: USGSFeature[];
}

// NASA EONET types
interface EONETGeometry {
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  date: string;
  type: 'Point' | 'Polygon';
  coordinates: number[] | number[][];
}

interface EONETCategory {
  id: string;
  title: string;
}

interface EONETSource {
  id: string;
  url: string;
}

interface EONETEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  categories: EONETCategory[];
  sources: EONETSource[];
  geometry: EONETGeometry[];
}

interface EONETResponse {
  title: string;
  description: string;
  link: string;
  events: EONETEvent[];
}

// Processed event types
export interface EarthquakeEvent {
  id: string;
  magnitude: number;
  place: string;
  coordinates: Coordinates;
  depth: number;
  time: string;
  alert: 'green' | 'yellow' | 'orange' | 'red' | null;
  tsunami: boolean;
  significance: number;
  url: string;
}

export interface NaturalEvent {
  id: string;
  title: string;
  description: string | null;
  category: string;
  categoryId: string;
  coordinates: Coordinates | null;
  date: string;
  isClosed: boolean;
  magnitude: number | null;
  magnitudeUnit: string | null;
  sources: string[];
}

// ===========================================
// USGS EARTHQUAKE API
// ===========================================

export interface EarthquakeQueryParams {
  startTime?: string;  // ISO 8601 format
  endTime?: string;    // ISO 8601 format
  minMagnitude?: number;
  maxMagnitude?: number;
  minLatitude?: number;
  maxLatitude?: number;
  minLongitude?: number;
  maxLongitude?: number;
  limit?: number;
  orderBy?: 'time' | 'time-asc' | 'magnitude' | 'magnitude-asc';
}

export async function fetchEarthquakes(
  params: EarthquakeQueryParams = {}
): Promise<EarthquakeEvent[]> {
  const rateLimiter = getRateLimiter('usgs');
  await rateLimiter.waitForSlot();

  // Default to last 24 hours, magnitude 2.5+
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const queryParams = new URLSearchParams({
    format: 'geojson',
    starttime: params.startTime || yesterday.toISOString(),
    endtime: params.endTime || now.toISOString(),
    minmagnitude: String(params.minMagnitude ?? 2.5),
    orderby: params.orderBy || 'time',
    limit: String(params.limit ?? 50),
    ...(params.maxMagnitude && { maxmagnitude: String(params.maxMagnitude) }),
    ...(params.minLatitude && { minlatitude: String(params.minLatitude) }),
    ...(params.maxLatitude && { maxlatitude: String(params.maxLatitude) }),
    ...(params.minLongitude && { minlongitude: String(params.minLongitude) }),
    ...(params.maxLongitude && { maxlongitude: String(params.maxLongitude) }),
  });

  const url = `${API_ENDPOINTS.usgsEarthquake.base}${API_ENDPOINTS.usgsEarthquake.query}?${queryParams}`;
  const response = await fetchWithCache<USGSResponse>(url, {}, 2 * 60 * 1000); // 2 min cache

  if (response.error || !response.data) {
    console.error('USGS earthquake error:', response.error);
    return [];
  }

  return response.data.features.map(transformUSGSFeature);
}

export async function fetchSignificantEarthquakes(
  days: number = 7
): Promise<EarthquakeEvent[]> {
  const rateLimiter = getRateLimiter('usgs');
  await rateLimiter.waitForSlot();

  // USGS has pre-built feeds for significant earthquakes
  const feedUrl = `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson`;
  const response = await fetchWithCache<USGSResponse>(feedUrl, {}, 5 * 60 * 1000);

  if (response.error || !response.data) {
    console.error('USGS significant earthquakes error:', response.error);
    return [];
  }

  return response.data.features.map(transformUSGSFeature);
}

export async function fetchLargeEarthquakes(
  minMagnitude: number = 4.5,
  days: number = 1
): Promise<EarthquakeEvent[]> {
  const rateLimiter = getRateLimiter('usgs');
  await rateLimiter.waitForSlot();

  // Use pre-built feed for M4.5+ earthquakes (past day)
  const feedUrl = days === 1
    ? 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson'
    : 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';

  const response = await fetchWithCache<USGSResponse>(feedUrl, {}, 5 * 60 * 1000);

  if (response.error || !response.data) {
    console.error('USGS large earthquakes error:', response.error);
    return [];
  }

  return response.data.features
    .filter(f => f.properties.mag >= minMagnitude)
    .map(transformUSGSFeature);
}

function transformUSGSFeature(feature: USGSFeature): EarthquakeEvent {
  const { properties, geometry } = feature;
  const [longitude, latitude, depth] = geometry.coordinates;

  return {
    id: feature.id,
    magnitude: properties.mag,
    place: properties.place,
    coordinates: { lat: latitude, lng: longitude },
    depth,
    time: new Date(properties.time).toISOString(),
    alert: properties.alert,
    tsunami: properties.tsunami === 1,
    significance: properties.sig,
    url: properties.url,
  };
}

// ===========================================
// NASA EONET API
// ===========================================

export interface EONETQueryParams {
  status?: 'open' | 'closed' | 'all';
  limit?: number;
  days?: number;
  categories?: string[];
}

// EONET Category IDs
export const EONET_CATEGORIES = {
  drought: 'drought',
  dustHaze: 'dustHaze',
  earthquakes: 'earthquakes',
  floods: 'floods',
  landslides: 'landslides',
  manmade: 'manmade',
  seaLakeIce: 'seaLakeIce',
  severeStorms: 'severeStorms',
  snow: 'snow',
  tempExtremes: 'tempExtremes',
  volcanoes: 'volcanoes',
  waterColor: 'waterColor',
  wildfires: 'wildfires',
} as const;

export async function fetchNaturalEvents(
  params: EONETQueryParams = {}
): Promise<NaturalEvent[]> {
  const rateLimiter = getRateLimiter('eonet');
  await rateLimiter.waitForSlot();

  const queryParams = new URLSearchParams({
    status: params.status || 'open',
    limit: String(params.limit ?? 30),
    ...(params.days && { days: String(params.days) }),
  });

  // Add categories if specified
  if (params.categories && params.categories.length > 0) {
    queryParams.set('category', params.categories.join(','));
  }

  const url = `${API_ENDPOINTS.eonet.base}${API_ENDPOINTS.eonet.events}?${queryParams}`;
  const response = await fetchWithCache<EONETResponse>(url, {}, 10 * 60 * 1000); // 10 min cache

  if (response.error || !response.data) {
    console.error('EONET error:', response.error);
    return [];
  }

  return response.data.events.map(transformEONETEvent);
}

export async function fetchActiveWildfires(): Promise<NaturalEvent[]> {
  return fetchNaturalEvents({
    status: 'open',
    categories: [EONET_CATEGORIES.wildfires],
    limit: 50,
  });
}

export async function fetchActiveStorms(): Promise<NaturalEvent[]> {
  return fetchNaturalEvents({
    status: 'open',
    categories: [EONET_CATEGORIES.severeStorms],
    limit: 30,
  });
}

export async function fetchVolcanicActivity(): Promise<NaturalEvent[]> {
  return fetchNaturalEvents({
    status: 'open',
    categories: [EONET_CATEGORIES.volcanoes],
    limit: 20,
  });
}

export async function fetchActiveFloods(): Promise<NaturalEvent[]> {
  return fetchNaturalEvents({
    status: 'open',
    categories: [EONET_CATEGORIES.floods],
    limit: 30,
  });
}

function transformEONETEvent(event: EONETEvent): NaturalEvent {
  // Get the most recent geometry
  const latestGeometry = event.geometry[event.geometry.length - 1];

  let coordinates: Coordinates | null = null;
  if (latestGeometry && latestGeometry.type === 'Point') {
    const [lng, lat] = latestGeometry.coordinates as number[];
    coordinates = { lat, lng };
  }

  const category = event.categories[0] || { id: 'unknown', title: 'Unknown' };

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: category.title,
    categoryId: category.id,
    coordinates,
    date: latestGeometry?.date || new Date().toISOString(),
    isClosed: event.closed !== null,
    magnitude: latestGeometry?.magnitudeValue || null,
    magnitudeUnit: latestGeometry?.magnitudeUnit || null,
    sources: event.sources.map(s => s.id),
  };
}

// ===========================================
// CONVERT TO INTEL EVENTS
// ===========================================

export function earthquakeToIntelEvent(earthquake: EarthquakeEvent): IntelEvent {
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (earthquake.magnitude >= 7.0 || earthquake.alert === 'red') {
    severity = 'critical';
  } else if (earthquake.magnitude >= 6.0 || earthquake.alert === 'orange') {
    severity = 'high';
  } else if (earthquake.magnitude >= 5.0 || earthquake.alert === 'yellow') {
    severity = 'medium';
  }

  const tsunamiWarning = earthquake.tsunami ? ' // TSUNAMI ALERT' : '';

  return {
    id: `EQ-${earthquake.id}`,
    timestamp: earthquake.time,
    category: 'alert',
    severity,
    title: `M${earthquake.magnitude.toFixed(1)} Earthquake - ${earthquake.place}`,
    summary: `Magnitude ${earthquake.magnitude.toFixed(1)} earthquake at depth of ${earthquake.depth.toFixed(1)}km. Significance: ${earthquake.significance}${tsunamiWarning}`,
    location: earthquake.place,
    coordinates: earthquake.coordinates,
    source: 'USGS-NEIC',
    status: 'active',
    tags: [
      'earthquake',
      'seismic',
      `m${Math.floor(earthquake.magnitude)}`,
      ...(earthquake.tsunami ? ['tsunami'] : []),
      ...(earthquake.alert ? [`alert-${earthquake.alert}`] : []),
    ],
  };
}

export function naturalEventToIntelEvent(event: NaturalEvent): IntelEvent {
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let category: 'military' | 'political' | 'economic' | 'cyber' | 'intel' | 'alert' = 'alert';

  // Determine severity based on category and status
  switch (event.categoryId) {
    case 'volcanoes':
      severity = event.magnitude && event.magnitude > 3 ? 'critical' : 'high';
      break;
    case 'severeStorms':
      severity = event.magnitude && event.magnitude > 100 ? 'critical' : 'high';
      break;
    case 'wildfires':
      severity = 'high';
      break;
    case 'floods':
      severity = 'high';
      break;
    case 'earthquakes':
      severity = event.magnitude && event.magnitude >= 6 ? 'critical' : 'high';
      break;
    case 'landslides':
      severity = 'medium';
      break;
    default:
      severity = 'medium';
  }

  const magnitudeStr = event.magnitude
    ? ` | Magnitude: ${event.magnitude}${event.magnitudeUnit || ''}`
    : '';

  return {
    id: `EONET-${event.id}`,
    timestamp: event.date,
    category,
    severity,
    title: event.title,
    summary: `${event.category} event${magnitudeStr}. Status: ${event.isClosed ? 'Closed' : 'Active'}. Sources: ${event.sources.join(', ')}`,
    location: extractLocationFromTitle(event.title),
    coordinates: event.coordinates || undefined,
    source: `NASA-EONET/${event.sources[0] || 'UNKNOWN'}`,
    status: event.isClosed ? 'resolved' : 'active',
    tags: [
      event.categoryId,
      event.isClosed ? 'closed' : 'active',
      'natural-disaster',
      ...event.sources,
    ],
  };
}

function extractLocationFromTitle(title: string): string | undefined {
  // Try to extract location from event title
  // Common patterns: "Event Name, Location" or "Event Name (Location)"
  const commaMatch = title.match(/,\s*([^,]+)$/);
  if (commaMatch) return commaMatch[1].trim();

  const parenMatch = title.match(/\(([^)]+)\)$/);
  if (parenMatch) return parenMatch[1].trim();

  return undefined;
}

// ===========================================
// CONVERT TO MAP MARKERS
// ===========================================

export function earthquakeToMapMarker(earthquake: EarthquakeEvent): MapMarker {
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (earthquake.magnitude >= 7.0) severity = 'critical';
  else if (earthquake.magnitude >= 6.0) severity = 'high';
  else if (earthquake.magnitude >= 5.0) severity = 'medium';

  return {
    id: `EQ-${earthquake.id}`,
    coordinates: earthquake.coordinates,
    type: 'alert',
    severity,
    label: `M${earthquake.magnitude.toFixed(1)}`,
    eventCount: 1,
    lastUpdate: earthquake.time,
  };
}

export function naturalEventToMapMarker(event: NaturalEvent): MapMarker | null {
  if (!event.coordinates) return null;

  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  if (['volcanoes', 'severeStorms'].includes(event.categoryId)) {
    severity = 'high';
  }

  // Map EONET categories to our event categories
  const categoryMap: Record<string, 'military' | 'political' | 'economic' | 'cyber' | 'intel' | 'alert'> = {
    wildfires: 'alert',
    severeStorms: 'alert',
    volcanoes: 'alert',
    floods: 'alert',
    earthquakes: 'alert',
    landslides: 'alert',
    drought: 'economic',
    default: 'intel',
  };

  return {
    id: `EONET-${event.id}`,
    coordinates: event.coordinates,
    type: categoryMap[event.categoryId] || categoryMap.default,
    severity,
    label: event.categoryId.toUpperCase().substring(0, 6),
    eventCount: 1,
    lastUpdate: event.date,
  };
}

// ===========================================
// AGGREGATED NATURAL EVENTS
// ===========================================

export interface NaturalEventsOverview {
  earthquakes: EarthquakeEvent[];
  wildfires: NaturalEvent[];
  storms: NaturalEvent[];
  volcanoes: NaturalEvent[];
  floods: NaturalEvent[];
  other: NaturalEvent[];
  lastUpdated: string;
}

export async function fetchNaturalEventsOverview(): Promise<NaturalEventsOverview> {
  const [earthquakes, allEvents] = await Promise.all([
    fetchLargeEarthquakes(4.5, 1).catch(() => []),
    fetchNaturalEvents({ status: 'open', limit: 100 }).catch(() => []),
  ]);

  // Categorize EONET events
  const wildfires = allEvents.filter(e => e.categoryId === 'wildfires');
  const storms = allEvents.filter(e => e.categoryId === 'severeStorms');
  const volcanoes = allEvents.filter(e => e.categoryId === 'volcanoes');
  const floods = allEvents.filter(e => e.categoryId === 'floods');
  const other = allEvents.filter(
    e => !['wildfires', 'severeStorms', 'volcanoes', 'floods', 'earthquakes'].includes(e.categoryId)
  );

  return {
    earthquakes,
    wildfires,
    storms,
    volcanoes,
    floods,
    other,
    lastUpdated: new Date().toISOString(),
  };
}

// ===========================================
// COMBINED INTEL EVENTS FROM NATURAL DISASTERS
// ===========================================

export async function fetchDisasterIntelEvents(): Promise<IntelEvent[]> {
  const overview = await fetchNaturalEventsOverview();
  const events: IntelEvent[] = [];

  // Add earthquakes
  events.push(...overview.earthquakes.map(earthquakeToIntelEvent));

  // Add other natural events
  events.push(...overview.wildfires.map(naturalEventToIntelEvent));
  events.push(...overview.storms.map(naturalEventToIntelEvent));
  events.push(...overview.volcanoes.map(naturalEventToIntelEvent));
  events.push(...overview.floods.map(naturalEventToIntelEvent));
  events.push(...overview.other.map(naturalEventToIntelEvent));

  // Sort by timestamp (newest first)
  events.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return events;
}

// ===========================================
// COMBINED MAP MARKERS FROM NATURAL DISASTERS
// ===========================================

export async function fetchDisasterMapMarkers(): Promise<MapMarker[]> {
  const overview = await fetchNaturalEventsOverview();
  const markers: MapMarker[] = [];

  // Add earthquake markers
  markers.push(...overview.earthquakes.map(earthquakeToMapMarker));

  // Add natural event markers
  const allNaturalEvents = [
    ...overview.wildfires,
    ...overview.storms,
    ...overview.volcanoes,
    ...overview.floods,
  ];

  for (const event of allNaturalEvents) {
    const marker = naturalEventToMapMarker(event);
    if (marker) markers.push(marker);
  }

  return markers;
}
