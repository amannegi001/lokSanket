/**
 * Standard temporal window configuration for LokSanket.
 *
 * - Recent trend: last 14 days [refDate - 14d, refDate]
 * - Previous trend: preceding 14 days [refDate - 28d, refDate - 14d)
 * - Trend timeline: 28 days for daily chart aggregation [refDate - 28d, refDate]
 * - Monthly cycle: 30 days for active cycle reporting [refDate - 30d, refDate]
 */
export const TEMPORAL_CONFIG = {
  recentTrendDays: 14,
  previousTrendDays: 14,
  trendTimelineDays: 28,
  monthlyCycleDays: 30,
} as const;

export interface TemporalWindows {
  refDate: Date;
  refTime: number;
  recentThreshold: Date;
  previousThreshold: Date;
  timelineThreshold: Date;
  monthlyThreshold: Date;
}

/**
 * Derives consistent temporal window boundaries from a single reference date.
 */
export function getTemporalWindows(referenceDate: Date): TemporalWindows {
  const safeDate =
    referenceDate instanceof Date && !isNaN(referenceDate.getTime())
      ? referenceDate
      : new Date();

  const refTime = safeDate.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  return {
    refDate: safeDate,
    refTime,
    recentThreshold: new Date(refTime - TEMPORAL_CONFIG.recentTrendDays * dayMs),
    previousThreshold: new Date(
      refTime -
        (TEMPORAL_CONFIG.recentTrendDays + TEMPORAL_CONFIG.previousTrendDays) *
          dayMs
    ),
    timelineThreshold: new Date(
      refTime - TEMPORAL_CONFIG.trendTimelineDays * dayMs
    ),
    monthlyThreshold: new Date(
      refTime - TEMPORAL_CONFIG.monthlyCycleDays * dayMs
    ),
  };
}

/**
 * Synchronous reference date resolution (for pure functions and unit tests).
 *
 * Resolution order:
 * 1. Explicit overrideDate, if valid.
 * 2. Explicit PRIORITY_REFERENCE_DATE environment variable, if valid.
 * 3. Actual current system time (new Date()).
 */
export function resolveReferenceDateSync(
  overrideDate?: Date | string | null
): Date {
  if (overrideDate) {
    const d = overrideDate instanceof Date ? overrideDate : new Date(overrideDate);
    if (!isNaN(d.getTime())) return d;
  }

  if (process.env.PRIORITY_REFERENCE_DATE) {
    const d = new Date(process.env.PRIORITY_REFERENCE_DATE);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

/**
 * Determines the canonical reference date for calculations,
 * dashboard metrics, and trend timelines.
 *
 * Resolution order:
 * 1. Explicit overrideDate (e.g., from unit tests or API callers), if valid.
 * 2. Explicit PRIORITY_REFERENCE_DATE environment variable (for reproducible
 *    demonstrations or historical analysis), if valid.
 * 3. Current system clock (new Date()) for normal production operation.
 *
 * Note: Does NOT automatically anchor to the latest complaint in the database,
 * preventing live submissions from distorting reporting windows or triggering
 * false trend collapses across unrelated clusters.
 */
export async function getEffectiveReferenceDate(
  overrideDate?: Date | string | null
): Promise<Date> {
  return resolveReferenceDateSync(overrideDate);
}
