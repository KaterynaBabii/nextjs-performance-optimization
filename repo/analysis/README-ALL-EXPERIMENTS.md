# Comprehensive Analysis - All Experiments

This tool analyzes metrics from **all test experiments** and generates comprehensive reports.

## Overview

The `analyze-all-experiments.js` tool processes:

1. **Performance Metrics Experiments**:
   - Baseline (Unoptimized)
   - Optimized (ISR + Edge)
   - AI-Enhanced (with Prefetching)

2. **Load Test Experiments**:
   - k6 Ramp Test
   - k6 Spike Test
   - Artillery Spike Test

## Usage

### Basic Usage

```bash
node analyze-all-experiments.js [output_dir]
```

**Example:**
```bash
node analyze-all-experiments.js ./results/all-experiments
```

### Expected Directory Structure

The tool expects the following directory structure:

```
tests/
├── metrics/
│   └── results/
│       ├── baseline/          # Baseline experiment results
│       ├── optimized/         # Optimized experiment results
│       └── ai-enhanced/       # AI-enhanced experiment results
│
└── load/
    └── results/
        ├── k6-ramp/           # k6 ramp test results
        ├── k6-spike/           # k6 spike test results
        └── artillery-spike/    # Artillery spike test results
```

## Output Files

The tool generates:

1. **Individual Experiment CSVs**: One CSV per experiment
   - `baseline-unoptimized-results.csv`
   - `optimized-isr-edge-results.csv`
   - `ai-enhanced-with-prefetching-results.csv`
   - `k6-ramp-test-results.csv`
   - `k6-spike-test-results.csv`
   - `artillery-spike-test-results.csv`

2. **Comparison Table**: `all-experiments-comparison.csv`
   - Side-by-side comparison of all experiments
   - Grouped by metric type

3. **HTML Report**: `all-experiments-report.html`
   - Visual report with tables
   - Easy to view in browser

4. **Summary JSON**: `all-experiments-summary.json`
   - Complete data in JSON format
   - For programmatic access

## Example Output

```
============================================================
Comprehensive Analysis - All Experiments
============================================================

📊 PERFORMANCE METRICS EXPERIMENTS
------------------------------------------------------------

Analyzing: Baseline (Unoptimized)
Directory: ./tests/metrics/results/baseline
Loaded metrics:
  TTFB: 30 samples
  LCP: 30 samples
  FID: 30 samples
  CLS: 30 samples

=== Statistical Analysis Results ===

TTFB:
  N: 30
  Mean: 320.45
  SD: 18.32
  95% CI: [313.75, 327.15]
  ...

Analyzing: Optimized (ISR + Edge)
...

⚡ LOAD TEST EXPERIMENTS
------------------------------------------------------------

Analyzing: k6 Ramp Test
...

📈 GENERATING REPORTS
------------------------------------------------------------
✓ Baseline (Unoptimized): baseline-unoptimized-results.csv
✓ Optimized (ISR + Edge): optimized-isr-edge-results.csv
✓ AI-Enhanced (with Prefetching): ai-enhanced-with-prefetching-results.csv
✓ Comparison table: all-experiments-comparison.csv
✓ HTML report: all-experiments-report.html
✓ Summary JSON: all-experiments-summary.json

✅ Analysis complete!
```

## Supported Input Formats

### Performance Metrics (Lighthouse/WebPageTest)
- Lighthouse JSON format (with `audits` object)
- Custom JSON format (with `metrics` object)

### Load Tests

**k6 JSON format:**
```json
{
  "metrics": {
    "http_req_duration": { "values": { "avg": 215 } },
    "ttfb": { "values": { "avg": 150 } },
    "http_req_failed": { "values": { "rate": 0.01 } },
    "http_reqs": { "values": { "rate": 100 } }
  }
}
```

**Artillery JSON format:**
```json
{
  "aggregate": {
    "latency": { "mean": 215 },
    "errors": 5,
    "codes": { "200": 995 },
    "rate": 100
  }
}
```

## Metrics Analyzed

### Performance Metrics
- **TTFB**: Time to First Byte
- **LCP**: Largest Contentful Paint
- **FID**: First Input Delay
- **CLS**: Cumulative Layout Shift

### Load Test Metrics
- **Response Time**: Average response time
- **TTFB**: Time to First Byte
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per second

## Statistical Methods

For each metric, the tool computes:
- **Mean**: Average value
- **Standard Deviation**: Measure of variability
- **95% Confidence Interval**: Using Student's t-distribution
- **Sample Size (N)**: Number of measurements

## Integration

Add to your testing pipeline:

```bash
#!/bin/bash
# Run all experiments
npm run test:baseline
npm run test:optimized
npm run test:ai-enhanced
npm run test:load

# Analyze all results
node analysis/analyze-all-experiments.js ./analysis/results/all-experiments

# View HTML report
open ./analysis/results/all-experiments/all-experiments-report.html
```

## Customization

To add more experiments, edit the `EXPERIMENTS` or `LOAD_TEST_EXPERIMENTS` objects in `analyze-all-experiments.js`:

```javascript
const EXPERIMENTS = {
  myNewExperiment: {
    name: 'My New Experiment',
    dir: './tests/metrics/results/my-experiment',
    color: '#ff6b6b',
  },
  // ... add more
}
```

## Requirements

- Node.js 18+
- All experiment result files in expected directories
- Results in supported JSON formats

