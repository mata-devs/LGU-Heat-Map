# Google Sheets Integration

This document describes how to set up Google Sheets for the Cebu LGU Dashboard.

## Sheet Format

Each dataset should have its own Google Sheet with exactly **2 columns**:

| Column A | Column B |
|----------|----------|
| Municipality/City Name | Value |

### Example:

| Municipality | Tourist Arrivals |
|--------------|------------------|
| Cebu City | 185000 |
| Lapu-Lapu City | 142000 |
| Mandaue City | 35000 |
| Talisay City | 12000 |
| ... | ... |

### Supported Column Headers

The code auto-detects column headers. These variations work:
- `Municipality`, `City`, `Location`, `Name` → First column
- `Value`, `Count`, `Number`, `Arrivals`, `Volume` → Second column

## Getting Your Sheet URL

### Option 1: Direct Share (Simplest)
1. Create your Google Sheet
2. Click **Share** → **Copy link**
3. The link looks like: `https://docs.google.com/spreadsheets/d/abc123.../edit`
4. Paste this URL in `src/config/dataset-sheets.ts`

### Option 2: Publish to Web (More Stable)
1. Open your Google Sheet
2. Go to **File → Share → Publish to web**
3. Select **Comma-separated values (.csv)**
4. Click **Publish**
5. Copy the published URL

## Configuration

Edit `src/config/dataset-sheets.ts`:

```typescript
export const DATASET_SHEET_URLS: Record<string, string> = {
  tourist_arrivals: 'YOUR_SHEET_URL_HERE',
  motorist_volume: 'YOUR_SHEET_URL_HERE',
  // ... other datasets
};
```

### Environment Variable Override

You can also set a single URL that applies to all datasets:

```bash
# .env file
VITE_GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/YOUR_ID/edit
```

## Municipality Name Matching

The code automatically normalizes municipality names. These variations are handled:

| Google Sheet | Normalized To |
|--------------|---------------|
| `Cebu City` | `Cebu City` |
| `cebu city` | `Cebu City` |
| `City of Cebu` | `Cebu City` |
| `Mactan` | `Lapu-Lapu City` |
| `Mandaue` | `Mandaue City` |

If a name doesn't match, check the browser console for warnings showing unrecognized names.

## Data Refresh

- **Auto-refresh**: Every 5 minutes (configurable in `src/lib/google-sheets.ts`)
- **Manual**: Click the "Refresh" button in the top-right corner
- **On load**: Always fetches fresh data from the sheet

## Fallback Data

If no sheet URL is configured, the app uses the built-in sample data in `src/data/datasets.ts`.