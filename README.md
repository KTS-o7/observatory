# OBSERVATORY // COMMAND CENTER

A command-and-control situational awareness dashboard built with Next.js, React, and Tailwind CSS. This interface follows a military operations room / intelligence dashboard design language, prioritizing information density, semantic clarity, and operational seriousness.

**🚀 All APIs work immediately - NO API keys required!**

## Quick Start

```bash
cd observatory
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - the dashboard will start fetching live data immediately.

## Live Data Sources (All Free, No Auth Required)

| API | Data Provided | Update Frequency |
|-----|---------------|------------------|
| **CoinGecko** | Cryptocurrency prices, market cap, 24h changes, trending coins | 1-2 minutes |
| **Fear & Greed Index** | Crypto market sentiment (0-100 scale) | 30 minutes |
| **ExchangeRate-API** | Currency exchange rates (USD, EUR, GBP, etc.) | 1 hour |
| **USGS Earthquake** | Global earthquake data (M2.5+), real-time | 2-3 minutes |
| **NASA EONET** | Natural events - wildfires, storms, volcanoes, floods | 3-5 minutes |
| **GDELT Project** | Global news and events monitoring | 3-5 minutes |
| **Hacker News** | Tech and security news | 3-5 minutes |
| **Reddit** | World news, geopolitics, technology (public JSON) | 5 minutes |

## Design Philosophy

This dashboard embodies a **command-and-control situational awareness design language** inspired by:
- Military operations rooms
- Intelligence dashboards  
- Early digital radar systems
- CRT phosphor aesthetics

### Core Principles

1. **Information Density** - Maximum signal per pixel with compact layouts
2. **Semantic Color** - Every color has meaning, never decoration
   - 🟢 Green: Active, live, normal states
   - 🔵 Blue: Neutral, informational content
   - 🟡 Amber: Attention, developing situations
   - 🔴 Red: Conflict, critical alerts
   - 🟣 Purple/Cyan: Technology, cyber-related
   - ⚫ Grey: Inactive, archived
3. **Planar Interface** - Flat, instrument-like panels with glow effects instead of shadows
4. **Functional Motion** - Animation indicates state changes only
5. **Grid Precision** - Every element aligns to a 4px global grid

## Features

### Dashboard Views

- **Overview** - Balanced layout with map, metrics, threats, intel, and operations
- **Intel** - Large intel feed with supporting map and threat matrix
- **Operations** - Focus on active operations and network status
- **Network** - Detailed network topology and node monitoring

### Components

| Component | Description |
|-----------|-------------|
| **Header** | UTC clock, system status, operator info |
| **IntelFeed** | Real-time news from GDELT, Hacker News, Reddit |
| **MetricsPanel** | Live crypto prices, Fear/Greed Index |
| **ThreatMatrix** | Regional threat levels with trends |
| **GlobalMap** | SVG world map with earthquake & disaster markers |
| **OperationsPanel** | Active operations tracking |
| **NetworkStatus** | Node topology visualization |
| **CommandInput** | Terminal-style command interface |

### Toggle Live/Mock Data

Click the **LIVE/MOCK** button in the navigation bar to switch between:
- **LIVE**: Real-time data from all APIs
- **MOCK**: Static sample data (useful for development/demos)

## Project Structure

```
observatory/
├── app/
│   ├── layout.tsx          # Root layout with fonts
│   └── page.tsx            # Main dashboard with view layouts
├── src/
│   ├── components/         # All UI components
│   ├── hooks/              # Custom React hooks (useApiData, etc.)
│   ├── lib/
│   │   ├── api/            # API services (all no-auth)
│   │   │   ├── config.ts   # API endpoints & rate limiting
│   │   │   ├── news.ts     # GDELT, Hacker News, Reddit
│   │   │   ├── finance.ts  # CoinGecko, Fear&Greed, ExchangeRates
│   │   │   ├── events.ts   # USGS, NASA EONET
│   │   │   └── index.ts    # Aggregated exports
│   │   └── data.ts         # Types and mock data
│   └── styles/
│       └── globals.css     # Global styles, CSS variables
├── tailwind.config.js      # Custom theme configuration
└── package.json
```

## Data Hooks

```typescript
import { 
  useIntelFeed,      // News from GDELT, HN, Reddit
  useMapMarkers,     // Earthquake & disaster locations
  useCryptoData,     // CoinGecko cryptocurrency prices
  useFearGreedIndex, // Market sentiment index
  useNaturalEvents,  // NASA EONET events
  useDashboardData,  // All data combined
} from '@/hooks/useApiData';

// Example usage
function MyComponent() {
  const { data, isLoading, error, refetch, isStale } = useIntelFeed({
    autoRefresh: true,
    refreshInterval: 120000, // 2 minutes
  });
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error} onRetry={refetch} />;
  return <Feed events={data} />;
}
```

## API Rate Limiting

Built-in rate limiting prevents exceeding API quotas:

- Automatic request throttling per API
- Response caching (1-60 minutes depending on data type)
- Graceful fallback to cached data on errors
- Visual indicators for stale/loading states

## Typography

- **Headlines**: Inter, uppercase, condensed, letter-spaced
- **Body**: Inter, small but readable
- **Data**: JetBrains Mono, tabular figures enabled
- **Timestamps**: JetBrains Mono, muted color

## Animation Guidelines

✅ **Allowed:**
- Fades and opacity changes
- Subtle glow pulses
- Slow breathing effects on live indicators
- Linear transitions (150ms default)

❌ **Disallowed:**
- Bounces and springs
- Elastic easing
- Playful micro-interactions
- Dramatic movement

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## API Credits

This dashboard uses the following free, open APIs:

- [CoinGecko](https://www.coingecko.com/en/api) - Cryptocurrency data
- [Alternative.me](https://alternative.me/crypto/fear-and-greed-index/) - Fear & Greed Index
- [ExchangeRate-API](https://www.exchangerate-api.com/) - Currency rates
- [USGS](https://earthquake.usgs.gov/fdsnws/event/1/) - Earthquake data
- [NASA EONET](https://eonet.gsfc.nasa.gov/) - Natural events
- [GDELT Project](https://www.gdeltproject.org/) - Global events
- [Hacker News](https://github.com/HackerNews/API) - Tech news
- [Reddit](https://www.reddit.com/dev/api/) - Public JSON endpoints

## License

MIT License - See LICENSE file for details.

---

*"The user should feel like an operator monitoring live systems, not a consumer browsing content."*