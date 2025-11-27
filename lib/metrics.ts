/**
 * Core Web Vitals Metrics Types and Comparison Logic
 * 
 * Reference values from Next.js performance paper:
 * - Baseline: unoptimized performance
 * - Optimized: after applying performance optimizations
 * 
 * Thresholds: Core Web Vitals "good" range targets
 */

// Individual metric sample from web-vitals library
export interface MetricSample {
  name: 'TTFB' | 'LCP' | 'FID' | 'CLS';
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  navigationType: string;
  timestamp: number;
}

// Aggregated metrics (average over all samples)
export interface AggregatedMetrics {
  ttfb: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  sampleCount: number;
}

// Reference values from the published experiment
export interface ReferenceValues {
  baseline: {
    ttfb: number; // 320 ms
    lcp: number;  // 3.40 s
    fid: number;  // 190 ms
    cls: number;  // 0.24
  };
  optimized: {
    ttfb: number; // 198 ms
    lcp: number;  // 2.48 s
    fid: number;  // 68 ms
    cls: number;  // 0.06
  };
}

// Core Web Vitals thresholds ("good" range)
export interface Thresholds {
  ttfb: number; // ≤ 200 ms
  lcp: number;  // ≤ 2.5 s
  fid: number;  // ≤ 100 ms
  cls: number;  // ≤ 0.1
}

// Comparison result for a single metric
export interface MetricComparison {
  name: string;
  baseline: number;
  optimized: number;
  current: number | null;
  diffVsBaseline: number | null;
  diffVsOptimized: number | null;
  percentImprovementVsBaseline: number | null;
  percentImprovementVsOptimized: number | null;
  threshold: number;
  meetsThreshold: boolean;
  description: string;
}

// Hard-coded reference values from the published experiment
export const REFERENCE_VALUES: ReferenceValues = {
  baseline: {
    ttfb: 320,  // milliseconds
    lcp: 3.40,  // seconds
    fid: 190,   // milliseconds
    cls: 0.24,  // unitless
  },
  optimized: {
    ttfb: 198,  // milliseconds
    lcp: 2.48,  // seconds
    fid: 68,    // milliseconds
    cls: 0.06,  // unitless
  },
};

// Hard-coded Core Web Vitals thresholds
export const THRESHOLDS: Thresholds = {
  ttfb: 200,   // milliseconds
  lcp: 2.5,    // seconds
  fid: 100,    // milliseconds
  cls: 0.1,    // unitless
};

// Metric descriptions for UX context
export const METRIC_DESCRIPTIONS: Record<string, string> = {
  TTFB: 'Time to First Byte: Server response time. Lower is better.',
  LCP: 'Largest Contentful Paint: Perceived loading speed. Lower is better.',
  FID: 'First Input Delay: Interactivity responsiveness. Lower is better.',
  CLS: 'Cumulative Layout Shift: Visual stability. Lower is better.',
};

/**
 * Calculate absolute difference between current and reference value
 */
function calculateDiff(current: number | null, reference: number): number | null {
  if (current === null) return null;
  return current - reference;
}

/**
 * Calculate percentage improvement
 * Positive = improvement (current is better/lower than reference)
 * Negative = regression (current is worse/higher than reference)
 */
function calculatePercentImprovement(
  current: number | null,
  reference: number
): number | null {
  if (current === null) return null;
  if (reference === 0) return null; // Avoid division by zero
  return ((reference - current) / reference) * 100;
}

/**
 * Check if current value meets the threshold
 * For all metrics, lower is better, so we check if current <= threshold
 */
function meetsThreshold(current: number | null, threshold: number): boolean {
  if (current === null) return false;
  return current <= threshold;
}

/**
 * Compare aggregated metrics against reference values and thresholds
 * Returns an array of comparison results, one per metric
 */
export function compareMetrics(
  aggregated: AggregatedMetrics
): MetricComparison[] {
  const comparisons: MetricComparison[] = [];

  // TTFB comparison
  comparisons.push({
    name: 'TTFB',
    baseline: REFERENCE_VALUES.baseline.ttfb,
    optimized: REFERENCE_VALUES.optimized.ttfb,
    current: aggregated.ttfb,
    diffVsBaseline: calculateDiff(aggregated.ttfb, REFERENCE_VALUES.baseline.ttfb),
    diffVsOptimized: calculateDiff(aggregated.ttfb, REFERENCE_VALUES.optimized.ttfb),
    percentImprovementVsBaseline: calculatePercentImprovement(
      aggregated.ttfb,
      REFERENCE_VALUES.baseline.ttfb
    ),
    percentImprovementVsOptimized: calculatePercentImprovement(
      aggregated.ttfb,
      REFERENCE_VALUES.optimized.ttfb
    ),
    threshold: THRESHOLDS.ttfb,
    meetsThreshold: meetsThreshold(aggregated.ttfb, THRESHOLDS.ttfb),
    description: METRIC_DESCRIPTIONS.TTFB,
  });

  // LCP comparison
  comparisons.push({
    name: 'LCP',
    baseline: REFERENCE_VALUES.baseline.lcp,
    optimized: REFERENCE_VALUES.optimized.lcp,
    current: aggregated.lcp,
    diffVsBaseline: calculateDiff(aggregated.lcp, REFERENCE_VALUES.baseline.lcp),
    diffVsOptimized: calculateDiff(aggregated.lcp, REFERENCE_VALUES.optimized.lcp),
    percentImprovementVsBaseline: calculatePercentImprovement(
      aggregated.lcp,
      REFERENCE_VALUES.baseline.lcp
    ),
    percentImprovementVsOptimized: calculatePercentImprovement(
      aggregated.lcp,
      REFERENCE_VALUES.optimized.lcp
    ),
    threshold: THRESHOLDS.lcp,
    meetsThreshold: meetsThreshold(aggregated.lcp, THRESHOLDS.lcp),
    description: METRIC_DESCRIPTIONS.LCP,
  });

  // FID comparison
  comparisons.push({
    name: 'FID',
    baseline: REFERENCE_VALUES.baseline.fid,
    optimized: REFERENCE_VALUES.optimized.fid,
    current: aggregated.fid,
    diffVsBaseline: calculateDiff(aggregated.fid, REFERENCE_VALUES.baseline.fid),
    diffVsOptimized: calculateDiff(aggregated.fid, REFERENCE_VALUES.optimized.fid),
    percentImprovementVsBaseline: calculatePercentImprovement(
      aggregated.fid,
      REFERENCE_VALUES.baseline.fid
    ),
    percentImprovementVsOptimized: calculatePercentImprovement(
      aggregated.fid,
      REFERENCE_VALUES.optimized.fid
    ),
    threshold: THRESHOLDS.fid,
    meetsThreshold: meetsThreshold(aggregated.fid, THRESHOLDS.fid),
    description: METRIC_DESCRIPTIONS.FID,
  });

  // CLS comparison
  comparisons.push({
    name: 'CLS',
    baseline: REFERENCE_VALUES.baseline.cls,
    optimized: REFERENCE_VALUES.optimized.cls,
    current: aggregated.cls,
    diffVsBaseline: calculateDiff(aggregated.cls, REFERENCE_VALUES.baseline.cls),
    diffVsOptimized: calculateDiff(aggregated.cls, REFERENCE_VALUES.optimized.cls),
    percentImprovementVsBaseline: calculatePercentImprovement(
      aggregated.cls,
      REFERENCE_VALUES.baseline.cls
    ),
    percentImprovementVsOptimized: calculatePercentImprovement(
      aggregated.cls,
      REFERENCE_VALUES.optimized.cls
    ),
    threshold: THRESHOLDS.cls,
    meetsThreshold: meetsThreshold(aggregated.cls, THRESHOLDS.cls),
    description: METRIC_DESCRIPTIONS.CLS,
  });

  return comparisons;
}

/**
 * Aggregate an array of metric samples into average values
 */
export function aggregateMetrics(samples: MetricSample[]): AggregatedMetrics {
  const ttfbSamples = samples.filter((s) => s.name === 'TTFB').map((s) => s.value);
  const lcpSamples = samples.filter((s) => s.name === 'LCP').map((s) => s.value);
  const fidSamples = samples.filter((s) => s.name === 'FID').map((s) => s.value);
  const clsSamples = samples.filter((s) => s.name === 'CLS').map((s) => s.value);

  const average = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  return {
    ttfb: average(ttfbSamples),
    lcp: average(lcpSamples),
    fid: average(fidSamples),
    cls: average(clsSamples),
    sampleCount: samples.length,
  };
}

