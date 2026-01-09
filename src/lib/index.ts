// Data exports for the Observatory dashboard
// Command-and-control situational awareness interface

// Types
export type {
  Coordinates,
  EventCategory,
  SeverityLevel,
  StatusType,
  IntelEvent,
  MapMarker,
  SystemMetric,
  ThreatLevel,
  ActiveOperation,
  NetworkNode,
} from "./data";

// Utility functions
export {
  formatTimestamp,
  formatTimeAgo,
  getSeverityColor,
  getCategoryColor,
  generateEventId,
  getCurrentTimestamp,
} from "./data";
