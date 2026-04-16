# Cebu LGU Heatmap

Interactive choropleth map of Cebu Island that shades individual cities and municipalities based on values from Google Sheets.

## Project Overview

This project creates an interactive choropleth map of Cebu Island that visualizes various data points for local government units (LGUs). The map automatically updates based on values maintained in a Google Sheet, making it easy to visualize changing data without code changes.

## Features

- **Production Choropleth Map**:
  - Leaflet-based Cebu LGU map optimized for dashboard and embed use
  - Hover-driven LGU highlighting with name and value display
  - Click-to-select workflow with ranking panel integration

- **Google Sheets Data Pipeline**:
  - Automatically reads from a Google Sheet (no code changes needed after setup)
  - Dynamic dataset discovery and switching
  - Municipalities shaded on a dynamic color gradient based on live values
  - Auto-refresh with manual refresh support

- **Multiple Use Cases**:
  - Tourist arrivals visualization
  - Motorist volume tracking for fuel allocation
  - Voting population mapping
  - Power situation monitoring
  - Easily adaptable for other metrics

## Technical Stack

- React + TypeScript with Vite build system
- Leaflet for choropleth rendering
- shadcn/ui components with TailwindCSS styling
- Google Sheets API for data sourcing
- GeoJSON boundaries from faeldon/philippines-json-maps

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Build for production: `npm run build`

## Project Structure

```bash
src/
├── components/     # React components
│   ├── ui/         # shadcn/ui primitives
│   └── map/        # Map-specific components
├── pages/          # Main map page and route-level components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
└── data/           # Data transformation functions

public/
└── data/
  ├── geo/        # GeoJSON/JSON boundaries and region files
  └── tiles/      # MBTiles source artifacts
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run build:dev` - Create development build
- `npm run lint` - Run ESLint
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

## Deployment Targets

- Internal dashboard access
- Embeddable on agas.ph
- CPTO displays
- Interactive kiosks
- Other internal platforms