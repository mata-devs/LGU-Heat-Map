import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSheetData, sheetDataToRecord, getDataRange } from "@/lib/google-sheets";

describe("google-sheets worst-case parsing", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("parses valid CSV with commas and source column", async () => {
    const csv = [
      "Municipality,Value,Source",
      "Cebu City,\"1,234\",DOT",
      "Lapu-Lapu City,987,DOT",
    ].join("\n");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csv,
      status: 200,
      statusText: "OK",
    } as Response);

    const result = await fetchSheetData("https://docs.google.com/spreadsheets/d/test/edit", "tourist arrivals");

    expect(result.rows).toEqual([
      { municipality: "Cebu City", value: 1234, source: "DOT" },
      { municipality: "Lapu-Lapu City", value: 987, source: "DOT" },
    ]);
    expect(result.source).toBe("DOT");
  });

  it("throws when municipality column header is missing", async () => {
    const csv = ["Area,Value", "Cebu City,123"].join("\n");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csv,
      status: 200,
      statusText: "OK",
    } as Response);

    await expect(fetchSheetData("https://docs.google.com/spreadsheets/d/test/edit", "tourist arrivals")).rejects.toThrow(
      "Could not find Municipality/City name column",
    );
  });

  it("throws when sheet has no data rows", async () => {
    const csv = "Municipality,Value";

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => csv,
      status: 200,
      statusText: "OK",
    } as Response);

    await expect(fetchSheetData("https://docs.google.com/spreadsheets/d/test/edit", "tourist arrivals")).rejects.toThrow(
      "Sheet appears to be empty or has no data rows",
    );
  });

  it("drops unmapped municipalities and computes range safely", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const record = sheetDataToRecord([
      { municipality: "Cebu City", value: 100 },
      { municipality: "Unknown Place", value: 999 },
    ]);

    expect(record).toEqual({ "Cebu City": 100 });
    expect(warnSpy).toHaveBeenCalled();
    expect(getDataRange(record)).toEqual({ min: 100, max: 100 });

    warnSpy.mockRestore();
  });
});
