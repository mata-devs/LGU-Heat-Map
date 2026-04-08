/**
 * Data validation utilities for Cebu LGU data joins
 * Run these on app initialization to catch name mismatches
 */

import { SAMPLE_DATA } from "@/data/datasets";
import { CEBU_LGU_NAMES, getMissingLGUs, nameNormalizer } from "@/data/cebu-geo";

/**
 * Validate that all SAMPLE_DATA keys match CEBU_LGU_NAMES
 * Reports any data for LGUs that don't exist in the boundaries
 */
export function validateDatasetLGUs(): {
  valid: boolean;
  unmatchedDataLGUs: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const unmatchedDataLGUs: string[] = [];

  // Get all unique LGU names from SAMPLE_DATA
  const dataLGUs = new Set<string>();
  Object.values(SAMPLE_DATA).forEach((dataset) => {
    Object.keys(dataset).forEach((name) => dataLGUs.add(name));
  });

  // Check each data LGU exists in CEBU_LGU_NAMES
  const cebuSet = new Set(CEBU_LGU_NAMES);
  dataLGUs.forEach((lguName) => {
    if (!cebuSet.has(lguName as unknown as (typeof CEBU_LGU_NAMES)[number])) {
      unmatchedDataLGUs.push(lguName);
      warnings.push(`⚠️  SAMPLE_DATA has data for "${lguName}" but it's not in CEBU_LGU_NAMES`);
    }
  });

  return {
    valid: unmatchedDataLGUs.length === 0,
    unmatchedDataLGUs,
    warnings,
  };
}

/**
 * Validate that all CEBU_LGU_NAMES have data in at least one dataset
 * Reports any boundaries that have no matching data
 */
export function validateBoundaryDataCoverage(): {
  valid: boolean;
  noCoverageCount: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  const dataLGUs = new Set<string>();

  Object.values(SAMPLE_DATA).forEach((dataset) => {
    Object.keys(dataset).forEach((name) => dataLGUs.add(name));
  });

  let noCoverageCount = 0;
  CEBU_LGU_NAMES.forEach((lguName) => {
    if (!dataLGUs.has(lguName as unknown as string)) {
      noCoverageCount++;
      warnings.push(`⚠️  CEBU_LGU_NAMES has "${lguName}" but no SAMPLE_DATA for it`);
    }
  });

  return {
    valid: noCoverageCount === 0,
    noCoverageCount,
    warnings,
  };
}

/**
 * Check for name normalization issues
 * Warns about normalized names that deviate from expected format
 */
export function validateNameNormalize(): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const cebuSet = new Set(CEBU_LGU_NAMES);

  Object.entries(nameNormalizer).forEach(([source, normalized]) => {
    if (!cebuSet.has(normalized as unknown as (typeof CEBU_LGU_NAMES)[number])) {
      warnings.push(
        `⚠️  nameNormalizer maps "${source}" to "${normalized}" but "${normalized}" is not in CEBU_LGU_NAMES`
      );
    }
  });

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Full validation report - call this on app initialization
 */
export function validateAllDataJoins(): void {
  console.group("🗺️  Cebu Insights Data Validation");

  // Validate datasets
  const datasetValidation = validateDatasetLGUs();
  console.log(
    `${datasetValidation.valid ? "✅" : "❌"} Dataset LGUs: ${SAMPLE_DATA.tourist_arrivals ? Object.keys(SAMPLE_DATA.tourist_arrivals).length : 0} unique LGUs in SAMPLE_DATA`
  );
  if (datasetValidation.warnings.length > 0) {
    console.warn("Dataset warnings:", datasetValidation.warnings);
  }

  // Validate coverage
  const coverageValidation = validateBoundaryDataCoverage();
  console.log(
    `${coverageValidation.valid ? "✅" : "⚠️"} Boundary Coverage: ${CEBU_LGU_NAMES.length} LGUs, ${coverageValidation.noCoverageCount} with no data`
  );
  if (coverageValidation.warnings.length > 0 && coverageValidation.noCoverageCount <= 3) {
    coverageValidation.warnings.forEach((w) => console.warn(w));
  } else if (coverageValidation.noCoverageCount > 3) {
    console.warn(`${coverageValidation.noCoverageCount} LGUs have no data coverage`);
  }

  // Validate normalizer
  const normalizerValidation = validateNameNormalize();
  console.log(`${normalizerValidation.valid ? "✅" : "⚠️"} Name Normalizer valid`);
  if (normalizerValidation.warnings.length > 0) {
    console.warn("Normalizer warnings:", normalizerValidation.warnings);
  }

  // Check for missing GeoJSON LGUs
  try {
    const missingLGUs = getMissingLGUs();
    if (missingLGUs.length > 0) {
      console.warn(
        `⚠️  GeoJSON: ${missingLGUs.length} LGUs not found in loaded GeoJSON:`,
        missingLGUs
      );
    } else {
      console.log("✅ GeoJSON: All LGUs loaded");
    }
  } catch (error) {
    console.warn("⚠️  Could not check GeoJSON LGUs:", error);
  }

  console.groupEnd();
}
