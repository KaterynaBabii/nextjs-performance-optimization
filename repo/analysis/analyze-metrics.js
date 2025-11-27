/**
 * Statistical Analysis Tool
 * 
 * Computes statistical metrics for performance experiments:
 * - Mean
 * - Standard Deviation
 * - 95% Confidence Interval (Student's t-distribution)
 * - Improvement % vs baseline and optimized
 * 
 * Generates Table III style CSV output
 */

const fs = require('fs')
const path = require('path')

// Reference values from manuscript
const BASELINE = {
  ttfb: 320,  // ms
  lcp: 3.40,  // s
  fid: 190,   // ms
  cls: 0.24,  // unitless
}

const OPTIMIZED = {
  ttfb: 198,  // ms
  lcp: 2.48,  // s
  fid: 68,    // ms
  cls: 0.06,  // unitless
}

/**
 * Calculate mean of an array
 */
function mean(values) {
  if (values.length === 0) return null
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values) {
  if (values.length < 2) return null
  const avg = mean(values)
  const squareDiffs = values.map(val => Math.pow(val - avg, 2))
  const avgSquareDiff = mean(squareDiffs)
  return Math.sqrt(avgSquareDiff)
}

/**
 * Calculate 95% confidence interval using Student's t-distribution
 * 
 * For n < 30, uses t-distribution
 * For n >= 30, approximates with normal distribution (t ≈ 1.96)
 */
function confidenceInterval95(values) {
  if (values.length < 2) return { lower: null, upper: null, margin: null }
  
  const n = values.length
  const avg = mean(values)
  const sd = standardDeviation(values)
  const standardError = sd / Math.sqrt(n)
  
  // t-value for 95% CI (two-tailed)
  // For n < 30, use t-distribution; for n >= 30, use z ≈ 1.96
  let tValue
  if (n < 30) {
    // Simplified t-values for common sample sizes
    const tTable = {
      2: 12.706, 3: 4.303, 4: 3.182, 5: 2.776,
      6: 2.571, 7: 2.447, 8: 2.365, 9: 2.306,
      10: 2.262, 15: 2.145, 20: 2.086, 25: 2.060, 30: 2.042
    }
    tValue = tTable[n] || 2.0 // Approximate for n > 30
  } else {
    tValue = 1.96 // Normal distribution approximation
  }
  
  const margin = tValue * standardError
  
  return {
    lower: avg - margin,
    upper: avg + margin,
    margin: margin,
  }
}

/**
 * Calculate percentage improvement
 */
function percentImprovement(current, reference) {
  if (reference === 0) return null
  return ((reference - current) / reference) * 100
}

/**
 * Load metrics from JSON files
 */
function loadMetricsFromFiles(directory) {
  const files = fs.readdirSync(directory)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(directory, file))
  
  const allMetrics = {
    ttfb: [],
    lcp: [],
    fid: [],
    cls: [],
  }
  
  files.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      
      // Extract Core Web Vitals from Lighthouse or WebPageTest format
      if (data.audits) {
        // Lighthouse format
        if (data.audits['server-response-time']) {
          allMetrics.ttfb.push(data.audits['server-response-time'].numericValue)
        }
        if (data.audits['largest-contentful-paint']) {
          allMetrics.lcp.push(data.audits['largest-contentful-paint'].numericValue / 1000) // Convert ms to s
        }
        if (data.audits['cumulative-layout-shift']) {
          allMetrics.cls.push(data.audits['cumulative-layout-shift'].numericValue)
        }
        if (data.audits['max-potential-fid']) {
          allMetrics.fid.push(data.audits['max-potential-fid'].numericValue)
        }
      } else if (data.metrics) {
        // WebPageTest or custom format
        if (data.metrics.ttfb) allMetrics.ttfb.push(data.metrics.ttfb)
        if (data.metrics.lcp) allMetrics.lcp.push(data.metrics.lcp)
        if (data.metrics.fid) allMetrics.fid.push(data.metrics.fid)
        if (data.metrics.cls) allMetrics.cls.push(data.metrics.cls)
      }
    } catch (error) {
      console.warn(`Error loading ${file}:`, error.message)
    }
  })
  
  return allMetrics
}

/**
 * Analyze a single metric
 */
function analyzeMetric(values, baseline, optimized, metricName) {
  if (values.length === 0) {
    return {
      metric: metricName,
      n: 0,
      mean: null,
      sd: null,
      ci95_lower: null,
      ci95_upper: null,
      baseline: baseline,
      optimized: optimized,
      improvement_vs_baseline: null,
      improvement_vs_optimized: null,
    }
  }
  
  const avg = mean(values)
  const sd = standardDeviation(values)
  const ci = confidenceInterval95(values)
  
  return {
    metric: metricName,
    n: values.length,
    mean: avg,
    sd: sd,
    ci95_lower: ci.lower,
    ci95_upper: ci.upper,
    baseline: baseline,
    optimized: optimized,
    improvement_vs_baseline: percentImprovement(avg, baseline),
    improvement_vs_optimized: percentImprovement(avg, optimized),
  }
}

/**
 * Generate CSV output (Table III style)
 */
function generateCSV(results, outputPath) {
  const headers = [
    'Metric',
    'N',
    'Mean',
    'SD',
    'CI_95_Lower',
    'CI_95_Upper',
    'Baseline',
    'Optimized',
    'Improvement_vs_Baseline_%',
    'Improvement_vs_Optimized_%',
  ]
  
  const rows = results.map(r => [
    r.metric,
    r.n,
    r.mean !== null ? r.mean.toFixed(2) : 'N/A',
    r.sd !== null ? r.sd.toFixed(2) : 'N/A',
    r.ci95_lower !== null ? r.ci95_lower.toFixed(2) : 'N/A',
    r.ci95_upper !== null ? r.ci95_upper.toFixed(2) : 'N/A',
    r.baseline,
    r.optimized,
    r.improvement_vs_baseline !== null ? r.improvement_vs_baseline.toFixed(1) : 'N/A',
    r.improvement_vs_optimized !== null ? r.improvement_vs_optimized.toFixed(1) : 'N/A',
  ])
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
  
  fs.writeFileSync(outputPath, csv)
  console.log(`CSV saved to ${outputPath}`)
}

/**
 * Generate JSON output
 */
function generateJSON(results, outputPath) {
  const output = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: {
      total_metrics: results.length,
      total_samples: results.reduce((sum, r) => sum + r.n, 0),
    }
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`JSON saved to ${outputPath}`)
}

/**
 * Main analysis function
 */
function analyzeMetrics(inputDir, outputDir) {
  console.log('Loading metrics from:', inputDir)
  const metrics = loadMetricsFromFiles(inputDir)
  
  console.log(`Loaded metrics:
  TTFB: ${metrics.ttfb.length} samples
  LCP: ${metrics.lcp.length} samples
  FID: ${metrics.fid.length} samples
  CLS: ${metrics.cls.length} samples
  `)
  
  // Analyze each metric
  const results = [
    analyzeMetric(metrics.ttfb, BASELINE.ttfb, OPTIMIZED.ttfb, 'TTFB'),
    analyzeMetric(metrics.lcp, BASELINE.lcp, OPTIMIZED.lcp, 'LCP'),
    analyzeMetric(metrics.fid, BASELINE.fid, OPTIMIZED.fid, 'FID'),
    analyzeMetric(metrics.cls, BASELINE.cls, OPTIMIZED.cls, 'CLS'),
  ]
  
  // Print results to console
  console.log('\n=== Statistical Analysis Results ===\n')
  results.forEach(r => {
    console.log(`${r.metric}:`)
    console.log(`  N: ${r.n}`)
    console.log(`  Mean: ${r.mean !== null ? r.mean.toFixed(2) : 'N/A'}`)
    console.log(`  SD: ${r.sd !== null ? r.sd.toFixed(2) : 'N/A'}`)
    console.log(`  95% CI: [${r.ci95_lower !== null ? r.ci95_lower.toFixed(2) : 'N/A'}, ${r.ci95_upper !== null ? r.ci95_upper.toFixed(2) : 'N/A'}]`)
    console.log(`  Improvement vs Baseline: ${r.improvement_vs_baseline !== null ? r.improvement_vs_baseline.toFixed(1) + '%' : 'N/A'}`)
    console.log(`  Improvement vs Optimized: ${r.improvement_vs_optimized !== null ? r.improvement_vs_optimized.toFixed(1) + '%' : 'N/A'}`)
    console.log('')
  })
  
  // Save outputs
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  generateCSV(results, path.join(outputDir, 'table3-results.csv'))
  generateJSON(results, path.join(outputDir, 'statistical-analysis.json'))
  
  return results
}

// Command-line interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const inputDir = args[0] || './lighthouse/results'
  const outputDir = args[1] || './analysis/results'
  
  console.log('Statistical Analysis Tool')
  console.log('========================\n')
  console.log(`Input directory: ${inputDir}`)
  console.log(`Output directory: ${outputDir}\n`)
  
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory does not exist: ${inputDir}`)
    console.log('\nUsage: node analyze-metrics.js [input_dir] [output_dir]')
    process.exit(1)
  }
  
  analyzeMetrics(inputDir, outputDir)
}

module.exports = { analyzeMetrics, mean, standardDeviation, confidenceInterval95 }

