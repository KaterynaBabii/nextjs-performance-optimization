/**
 * Comprehensive Analysis Tool for All Experiments
 * 
 * Analyzes metrics from all test experiments:
 * - Load tests (k6, Artillery)
 * - Performance metrics (Lighthouse, WebPageTest)
 * - AI model evaluation
 * - Multiple scenarios (baseline, optimized, AI-enhanced)
 * 
 * Generates per-experiment analysis and comparison tables
 */

const fs = require('fs')
const path = require('path')
const { analyzeMetrics, mean, standardDeviation, confidenceInterval95 } = require('./analyze-metrics')

// Experiment configurations
// Paths are relative to the analysis directory, so we need to go up one level to reach repo/tests
const EXPERIMENTS = {
  baseline: {
    name: 'Baseline (Unoptimized)',
    dir: '../tests/metrics/results/baseline',
    color: '#ff6b6b',
  },
  optimized: {
    name: 'Optimized (ISR + Edge)',
    dir: '../tests/metrics/results/optimized',
    color: '#4ecdc4',
  },
  aiEnhanced: {
    name: 'AI-Enhanced (with Prefetching)',
    dir: '../tests/metrics/results/ai-enhanced',
    color: '#95e1d3',
  },
}

// Load test experiment configurations
const LOAD_TEST_EXPERIMENTS = {
  k6Ramp: {
    name: 'k6 Ramp Test',
    dir: '../tests/load/results/k6-ramp',
    type: 'k6',
  },
  k6Spike: {
    name: 'k6 Spike Test',
    dir: '../tests/load/results/k6-spike',
    type: 'k6',
  },
  artillerySpike: {
    name: 'Artillery Spike Test',
    dir: '../tests/load/results/artillery-spike',
    type: 'artillery',
  },
}

/**
 * Load k6 JSON results
 */
function loadK6Results(directory) {
  const files = fs.readdirSync(directory)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(directory, file))
  
  const metrics = {
    responseTime: [],
    ttfb: [],
    errorRate: [],
    throughput: [],
  }
  
  files.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      
      if (data.metrics) {
        // k6 JSON format
        if (data.metrics.http_req_duration) {
          metrics.responseTime.push(data.metrics.http_req_duration.values.avg)
        }
        if (data.metrics.ttfb) {
          metrics.ttfb.push(data.metrics.ttfb.values.avg)
        }
        if (data.metrics.http_req_failed) {
          metrics.errorRate.push(data.metrics.http_req_failed.values.rate * 100)
        }
        if (data.metrics.http_reqs) {
          const rate = data.metrics.http_reqs.values.rate
          metrics.throughput.push(rate)
        }
      }
    } catch (error) {
      console.warn(`Error loading ${file}:`, error.message)
    }
  })
  
  return metrics
}

/**
 * Load Artillery JSON results
 */
function loadArtilleryResults(directory) {
  const files = fs.readdirSync(directory)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(directory, file))
  
  const metrics = {
    responseTime: [],
    latency: [],
    errorRate: [],
    rps: [],
  }
  
  files.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      
      if (data.aggregate) {
        // Artillery JSON format
        if (data.aggregate.latency) {
          metrics.latency.push(data.aggregate.latency.mean)
          metrics.responseTime.push(data.aggregate.latency.mean)
        }
        if (data.aggregate.errors) {
          const total = data.aggregate.codes['200'] || 0
          const errors = data.aggregate.errors || 0
          metrics.errorRate.push((errors / (total + errors)) * 100)
        }
        if (data.aggregate.rate) {
          metrics.rps.push(data.aggregate.rate)
        }
      }
    } catch (error) {
      console.warn(`Error loading ${file}:`, error.message)
    }
  })
  
  return metrics
}

/**
 * Analyze a single experiment
 */
function analyzeExperiment(experiment, experimentType = 'metrics') {
  const { name, dir } = experiment
  
  if (!fs.existsSync(dir)) {
    console.warn(`Warning: Directory not found: ${dir}`)
    return null
  }
  
  console.log(`\nAnalyzing: ${name}`)
  console.log(`Directory: ${dir}`)
  
  if (experimentType === 'metrics') {
    // Use existing analyzeMetrics function
    const results = analyzeMetrics(dir, path.join(dir, '../analysis'))
    return { name, type: 'metrics', results }
  } else if (experimentType === 'load') {
    // Load test analysis
    let metrics
    if (experiment.type === 'k6') {
      metrics = loadK6Results(dir)
    } else if (experiment.type === 'artillery') {
      metrics = loadArtilleryResults(dir)
    }
    
    if (!metrics) return null
    
    const results = []
    
    // Analyze response time
    if (metrics.responseTime && metrics.responseTime.length > 0) {
      const avg = mean(metrics.responseTime)
      const sd = standardDeviation(metrics.responseTime)
      const ci = confidenceInterval95(metrics.responseTime)
      
      results.push({
        metric: 'Response Time',
        n: metrics.responseTime.length,
        mean: avg,
        sd: sd,
        ci95_lower: ci.lower,
        ci95_upper: ci.upper,
        unit: 'ms',
      })
    }
    
    // Analyze TTFB
    if (metrics.ttfb && metrics.ttfb.length > 0) {
      const avg = mean(metrics.ttfb)
      const sd = standardDeviation(metrics.ttfb)
      const ci = confidenceInterval95(metrics.ttfb)
      
      results.push({
        metric: 'TTFB',
        n: metrics.ttfb.length,
        mean: avg,
        sd: sd,
        ci95_lower: ci.lower,
        ci95_upper: ci.upper,
        unit: 'ms',
      })
    }
    
    // Analyze error rate
    if (metrics.errorRate && metrics.errorRate.length > 0) {
      const avg = mean(metrics.errorRate)
      const sd = standardDeviation(metrics.errorRate)
      const ci = confidenceInterval95(metrics.errorRate)
      
      results.push({
        metric: 'Error Rate',
        n: metrics.errorRate.length,
        mean: avg,
        sd: sd,
        ci95_lower: ci.lower,
        ci95_upper: ci.upper,
        unit: '%',
      })
    }
    
    // Analyze throughput
    if (metrics.throughput && metrics.throughput.length > 0) {
      const avg = mean(metrics.throughput)
      const sd = standardDeviation(metrics.throughput)
      const ci = confidenceInterval95(metrics.throughput)
      
      results.push({
        metric: 'Throughput',
        n: metrics.throughput.length,
        mean: avg,
        sd: sd,
        ci95_lower: ci.lower,
        ci95_upper: ci.upper,
        unit: 'req/s',
      })
    }
    
    return { name, type: 'load', results }
  }
  
  return null
}

/**
 * Generate comparison table across all experiments
 */
function generateComparisonTable(allResults, outputPath) {
  // Group by metric type
  const metricGroups = {}
  
  allResults.forEach(exp => {
    if (!exp || !exp.results) return
    
    exp.results.forEach(result => {
      const metricName = result.metric
      if (!metricGroups[metricName]) {
        metricGroups[metricName] = []
      }
      metricGroups[metricName].push({
        experiment: exp.name,
        mean: result.mean,
        sd: result.sd,
        ci95_lower: result.ci95_lower,
        ci95_upper: result.ci95_upper,
        n: result.n,
      })
    })
  })
  
  // Generate CSV
  const csvRows = []
  
  Object.keys(metricGroups).forEach(metricName => {
    const experiments = metricGroups[metricName]
    
    // Header row
    csvRows.push(`\n=== ${metricName} ===`)
    csvRows.push('Experiment,N,Mean,SD,CI_95_Lower,CI_95_Upper')
    
    // Data rows
    experiments.forEach(exp => {
      csvRows.push([
        exp.experiment,
        exp.n,
        exp.mean !== null ? exp.mean.toFixed(2) : 'N/A',
        exp.sd !== null ? exp.sd.toFixed(2) : 'N/A',
        exp.ci95_lower !== null ? exp.ci95_lower.toFixed(2) : 'N/A',
        exp.ci95_upper !== null ? exp.ci95_upper.toFixed(2) : 'N/A',
      ].join(','))
    })
  })
  
  const csv = csvRows.join('\n')
  fs.writeFileSync(outputPath, csv)
  console.log(`\nComparison table saved to ${outputPath}`)
}

/**
 * Generate HTML report
 */
function generateHTMLReport(allResults, outputPath) {
  const hasData = allResults && allResults.length > 0 && allResults.some(exp => exp && exp.results && exp.results.length > 0)
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Performance Analysis Report - All Experiments</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin-top: 1rem; }
    th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .metric-section { margin-bottom: 3rem; }
    .experiment-name { font-weight: bold; color: #0070f3; }
    .no-data { 
      padding: 2rem; 
      background-color: #fff3cd; 
      border: 1px solid #ffc107; 
      border-radius: 4px; 
      margin-top: 2rem;
    }
    .no-data h3 { color: #856404; margin-top: 0; }
    .no-data ul { margin: 1rem 0; padding-left: 2rem; }
    .no-data li { margin: 0.5rem 0; }
  </style>
</head>
<body>
  <h1>Performance Analysis Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  ${hasData ? allResults.map(exp => {
    if (!exp || !exp.results || exp.results.length === 0) return ''
    
    return `
    <div class="metric-section">
      <h2>${exp.name}</h2>
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th>N</th>
            <th>Mean</th>
            <th>SD</th>
            <th>CI 95% Lower</th>
            <th>CI 95% Upper</th>
          </tr>
        </thead>
        <tbody>
          ${exp.results.map(r => `
            <tr>
              <td>${r.metric}</td>
              <td>${r.n}</td>
              <td>${r.mean !== null ? r.mean.toFixed(2) : 'N/A'}</td>
              <td>${r.sd !== null ? r.sd.toFixed(2) : 'N/A'}</td>
              <td>${r.ci95_lower !== null ? r.ci95_lower.toFixed(2) : 'N/A'}</td>
              <td>${r.ci95_upper !== null ? r.ci95_upper.toFixed(2) : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `
  }).join('') : `
    <div class="no-data">
      <h3>⚠️ No Experiment Data Available</h3>
      <p>The analysis report is empty because no experiment data was found. To generate a report with data, you need to:</p>
      <ul>
        <li><strong>Run Performance Metrics Tests:</strong>
          <ul>
            <li>Baseline: <code>tests/metrics/results/baseline/</code></li>
            <li>Optimized: <code>tests/metrics/results/optimized/</code></li>
            <li>AI-Enhanced: <code>tests/metrics/results/ai-enhanced/</code></li>
          </ul>
        </li>
        <li><strong>Run Load Tests:</strong>
          <ul>
            <li>k6 Ramp: <code>tests/load/results/k6-ramp/</code></li>
            <li>k6 Spike: <code>tests/load/results/k6-spike/</code></li>
            <li>Artillery: <code>tests/load/results/artillery-spike/</code></li>
          </ul>
        </li>
      </ul>
      <p><strong>Next Steps:</strong></p>
      <ol>
        <li>Run your experiments following the EXPERIMENTS-GUIDE.md</li>
        <li>Collect metrics data in the expected directories</li>
        <li>Re-run this analysis script: <code>node analyze-all-experiments.js</code></li>
      </ol>
    </div>
  `}
</body>
</html>`
  
  fs.writeFileSync(outputPath, html)
  console.log(`HTML report saved to ${outputPath}`)
}

/**
 * Main function to analyze all experiments
 */
function analyzeAllExperiments(outputDir) {
  console.log('='.repeat(60))
  console.log('Comprehensive Analysis - All Experiments')
  console.log('='.repeat(60))
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  const allResults = []
  
  // Analyze performance metrics experiments
  console.log('\n📊 PERFORMANCE METRICS EXPERIMENTS')
  console.log('-'.repeat(60))
  
  Object.values(EXPERIMENTS).forEach(exp => {
    const result = analyzeExperiment(exp, 'metrics')
    if (result) {
      allResults.push(result)
    }
  })
  
  // Analyze load test experiments
  console.log('\n⚡ LOAD TEST EXPERIMENTS')
  console.log('-'.repeat(60))
  
  Object.values(LOAD_TEST_EXPERIMENTS).forEach(exp => {
    const result = analyzeExperiment(exp, 'load')
    if (result) {
      allResults.push(result)
    }
  })
  
  // Generate outputs
  console.log('\n📈 GENERATING REPORTS')
  console.log('-'.repeat(60))
  
  // Individual experiment CSVs
  allResults.forEach(exp => {
    if (!exp || !exp.results) return
    
    const csvPath = path.join(outputDir, `${exp.name.replace(/\s+/g, '-').toLowerCase()}-results.csv`)
    const headers = ['Metric', 'N', 'Mean', 'SD', 'CI_95_Lower', 'CI_95_Upper']
    const rows = exp.results.map(r => [
      r.metric,
      r.n,
      r.mean !== null ? r.mean.toFixed(2) : 'N/A',
      r.sd !== null ? r.sd.toFixed(2) : 'N/A',
      r.ci95_lower !== null ? r.ci95_lower.toFixed(2) : 'N/A',
      r.ci95_upper !== null ? r.ci95_upper.toFixed(2) : 'N/A',
    ])
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    fs.writeFileSync(csvPath, csv)
    console.log(`✓ ${exp.name}: ${csvPath}`)
  })
  
  // Comparison table
  const comparisonPath = path.join(outputDir, 'all-experiments-comparison.csv')
  generateComparisonTable(allResults, comparisonPath)
  
  // HTML report
  const htmlPath = path.join(outputDir, 'all-experiments-report.html')
  generateHTMLReport(allResults, htmlPath)
  
  // Summary JSON
  const summaryPath = path.join(outputDir, 'all-experiments-summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    experiments: allResults,
    total_experiments: allResults.length,
  }, null, 2))
  console.log(`✓ Summary JSON: ${summaryPath}`)
  
  console.log('\n✅ Analysis complete!')
  console.log(`\nAll results saved to: ${outputDir}`)
  console.log(`\nView HTML report: open ${htmlPath}`)
}

// Command-line interface
if (require.main === module) {
  // Default to results/all-experiments (relative to analysis directory)
  // This avoids creating nested analysis/analysis/ structure
  const outputDir = process.argv[2] || './results/all-experiments'
  analyzeAllExperiments(outputDir)
}

module.exports = { analyzeAllExperiments, analyzeExperiment }

