# Statistical Analysis Tools

This directory contains tools for statistical analysis of performance metrics, generating Table III style results with mean, standard deviation, and 95% confidence intervals.

## Overview

The analysis tool computes:
- **Mean**: Average value across all samples
- **Standard Deviation (SD)**: Measure of variability
- **95% Confidence Interval (CI)**: Using Student's t-distribution
- **Improvement %**: Comparison vs baseline and optimized values

## Usage

### Basic Usage

```bash
node analyze-metrics.js [input_dir] [output_dir]
```

**Example:**
```bash
# Analyze Lighthouse results
node analyze-metrics.js ./lighthouse/results ./analysis/results

# Analyze WebPageTest results
node analyze-metrics.js ./wpt/results ./analysis/results
```

### Input Format

The tool expects JSON files in the input directory. Supported formats:

**Lighthouse format:**
```json
{
  "audits": {
    "server-response-time": { "numericValue": 215 },
    "largest-contentful-paint": { "numericValue": 2650 },
    "max-potential-fid": { "numericValue": 85 },
    "cumulative-layout-shift": { "numericValue": 0.08 }
  }
}
```

**Custom format:**
```json
{
  "metrics": {
    "ttfb": 215,
    "lcp": 2.65,
    "fid": 85,
    "cls": 0.08
  }
}
```

### Output

The tool generates two output files:

1. **`table3-results.csv`**: Table III style CSV with all metrics
2. **`statistical-analysis.json`**: Detailed JSON results

### Example Output

```
=== Statistical Analysis Results ===

TTFB:
  N: 30
  Mean: 215.45
  SD: 18.32
  95% CI: [208.75, 222.15]
  Improvement vs Baseline: 32.67%
  Improvement vs Optimized: -8.81%

LCP:
  N: 30
  Mean: 2.65
  SD: 0.28
  95% CI: [2.55, 2.75]
  Improvement vs Baseline: 22.06%
  Improvement vs Optimized: -6.85%
...
```

## Statistical Methods

### Mean Calculation
```
μ = (1/n) * Σ(x_i)
```

### Standard Deviation
```
σ = √[(1/n) * Σ(x_i - μ)²]
```

### 95% Confidence Interval

For sample size n < 30, uses Student's t-distribution:
```
CI = μ ± t(α/2, n-1) * (σ/√n)
```

For n ≥ 30, approximates with normal distribution (t ≈ 1.96):
```
CI = μ ± 1.96 * (σ/√n)
```

### Percentage Improvement
```
Improvement % = ((reference - current) / reference) * 100
```

Positive values indicate improvement (lower is better for all metrics).

## Reference Values

The tool uses the following reference values from the manuscript:

**Baseline (Unoptimized):**
- TTFB: 320 ms
- LCP: 3.40 s
- FID: 190 ms
- CLS: 0.24

**Optimized:**
- TTFB: 198 ms
- LCP: 2.48 s
- FID: 68 ms
- CLS: 0.06

## Example Dataset

See `table3-example.csv` for an example of the expected output format with sample data from 30 runs.

## Integration with Testing Pipeline

The analysis tool can be integrated into the testing pipeline:

```bash
# Run Lighthouse tests
npm run lighthouse

# Analyze results
node analyze-metrics.js ./lighthouse/results ./analysis/results

# View results
cat ./analysis/results/table3-results.csv
```

## Requirements

- Node.js 18+
- No external dependencies (uses only built-in modules)

## Notes

- The tool automatically handles missing data (returns N/A)
- Confidence intervals use appropriate t-values for small samples
- All metrics assume lower values are better (TTFB, LCP, FID, CLS)

