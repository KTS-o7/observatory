// Observatory Dashboard - Custom Hooks
// Exports all custom hooks for data fetching and state management

export {
  // Generic API data hook
  useApiData,
  // Specialized data hooks
  useDashboardData,
  useIntelFeed,
  useMapMarkers,
  useCryptoData,
  useFearGreedIndex,
  useFinanceData,
  useNaturalEvents,
  useDisasterEvents,
  // Combined hooks
  useSystemMetrics,
  // Utility hooks
  useApiRefreshStatus,
  usePolling,
} from "./useApiData";

export type { UseApiDataOptions, UseApiDataResult } from "./useApiData";
