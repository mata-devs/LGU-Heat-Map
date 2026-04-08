# Agent Instructions for Cebu LGU Heatmap

## Project Overview
- React + TypeScript application with Vite build system
- Dual-map architecture using Leaflet for production choropleth and Kepler.gl for geoanalysis
- Interactive choropleth map of Cebu Island showing municipalities shaded by data values
- Data sourced from Google Sheets with automatic refresh
- Target: Live before mid-April for agas.ph launch

## Architecture

### Two-Page System
1. **Leaflet Page** - Main production choropleth map
   - Fast, lightweight interactive map
   - Custom UI with hover stat cards
   - City/municipality shading based on Google Sheets values
   - Embed-friendly layout for agas.ph and other platforms

2. **Kepler Page** - Advanced geoanalysis environment
   - Rich exploratory geoanalysis tools
   - Heatmaps, hexbin/H3 exploration
   - Multiple data layers and filters
   - Experimental visualization work

### Shared Data Pipeline
- Single source of truth: Google Sheets (public sheet or service account)
- Normalization layer to clean names, values, and joins
- Both pages consume same underlying LGU data and geometry

## Core Commands
```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run build:dev    # Development build

# Testing
npm run test         # Run tests once
npm run test:watch   # Watch mode for tests

# Code Quality
npm run lint         # Run ESLint
```

## Project Structure
- `src/App.tsx` - Main application component with routing
- `src/pages/` - Page components (Index.tsx = Leaflet map, Kepler.tsx = Kepler map)
- `src/components/` - Reusable UI components
- `src/components/ui/` - shadcn/ui primitive components
- `src/hooks/` - Custom React hooks for data fetching
- `src/lib/` - Utility functions and helpers
- `src/data/` - Data transformation functions

## Technical Requirements
- GeoJSON source: github.com/faeldon/philippines-json-maps for Cebu municipality boundaries
- Data source: Google Sheets via Sheets API
- Municipality names in GeoJSON and Sheets must match exactly
- No code changes required after initial setup - Sheets is the only interface

## Development Workflow
1. Always run `npm run lint` before committing
2. Run `npm run test` to ensure no regressions
3. Import aliases available via `@/` pointing to `src/

## Testing
- Uses Vitest with React Testing Library
- Test files colocated with components (`*.test.tsx`)
- Global test setup in `src/test/setup.ts`
- Run individual tests: `npm run test -- components/MyComponent.test.tsx`

## UI Conventions
- shadcn/ui components located in `src/components/ui/`
- All UI components use Tailwind classes
- Components should be functional and typed with TypeScript interfaces

## Map Implementation Details
- Leaflet page: `src/components/CebuMap.tsx` for choropleth rendering
- Kepler page: Separate component for advanced geoanalysis
- HoverInfoCard.tsx: Displays municipality name and current value on hover
- Color gradient shading based on values from Google Sheets
- Automatic refresh or manual refresh capability