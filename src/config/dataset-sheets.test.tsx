import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useDynamicDatasets, DATASET_BACKUP_KEY } from "@/config/dataset-sheets";

vi.mock("@/lib/discover-sheets", () => ({
  DEFAULT_SHEET_NAMES: ["tourist arrivals"],
  getDiscoveredSheets: vi.fn(),
}));

vi.mock("@/lib/google-sheets", () => ({
  fetchSheetData: vi.fn(),
  sheetDataToRecord: vi.fn((rows: Array<{ municipality: string; value: number }>) => {
    const out: Record<string, number> = {};
    for (const row of rows) out[row.municipality] = row.value;
    return out;
  }),
  getDataRange: vi.fn((data: Record<string, number>) => {
    const values = Object.values(data);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }),
}));

import { getDiscoveredSheets } from "@/lib/discover-sheets";
import { fetchSheetData } from "@/lib/google-sheets";

describe("useDynamicDatasets resilience and backups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("falls back to backup snapshot when live discovery fails", async () => {
    const backup = {
      sheets: [
        {
          id: "tourist_arrivals",
          name: "tourist arrivals",
          label: "Tourist Arrivals",
          unit: "arrivals",
          source: "Google Sheets",
        },
      ],
      datasetData: {
        tourist_arrivals: {
          data: { "Cebu City": 42 },
          min: 42,
          max: 42,
          lastUpdated: "2026-04-10T00:00:00.000Z",
          source: "Backup",
        },
      },
      sourceUrl: "https://docs.google.com/spreadsheets/d/fake/edit",
      timestamp: Date.now(),
    };

    localStorage.setItem(DATASET_BACKUP_KEY, JSON.stringify(backup));
    vi.mocked(getDiscoveredSheets).mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useDynamicDatasets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sheets).toHaveLength(1);
    expect(result.current.datasetData.tourist_arrivals?.data["Cebu City"]).toBe(42);
    expect(result.current.error).toContain("Using backup data");
  });

  it("recovers from refresh failure by using previously saved backup", async () => {
    vi.mocked(getDiscoveredSheets).mockResolvedValue([
      {
        id: "tourist_arrivals",
        name: "tourist arrivals",
        label: "Tourist Arrivals",
        unit: "arrivals",
        source: "Google Sheets",
      },
    ]);

    const fetchMock = vi.mocked(fetchSheetData);
    fetchMock
      .mockResolvedValueOnce({
        rows: [{ municipality: "Cebu City", value: 100 }],
        source: "Live",
      })
      .mockRejectedValueOnce(new Error("timeout"));

    const { result } = renderHook(() => useDynamicDatasets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.datasetData.tourist_arrivals?.data["Cebu City"]).toBe(100);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.datasetData.tourist_arrivals?.data["Cebu City"]).toBe(100);
    expect(result.current.error).toBeNull();
  });
});
