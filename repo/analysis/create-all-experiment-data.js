/**
 * Create Sample Data for All Experiments
 * 
 * Generates sample data for:
 * - Baseline, Optimized, AI-Enhanced performance metrics
 * - k6 Ramp, k6 Spike, Artillery load tests
 */

const fs = require('fs')
const path = require('path')

// Baseline metrics (worse performance)
const baselineMetrics = Array.from({ length: 30 }, () => ({
  ttfb: 300 + Math.random() * 50,  // 300-350ms
  lcp: 3.2 + Math.random() * 0.5,   // 3.2-3.7s
  fid: 180 + Math.random() * 30,   // 180-210ms
  cls: 0.20 + Math.random() * 0.10, // 0.20-0.30
}))

// Optimized metrics (better performance)
const optimizedMetrics = Array.from({ length: 30 }, () => ({
  ttfb: 190 + Math.random() * 30,  // 190-220ms
  lcp: 2.4 + Math.random() * 0.3,   // 2.4-2.7s
  fid: 65 + Math.random() * 15,     // 65-80ms
  cls: 0.05 + Math.random() * 0.03, // 0.05-0.08
}))

// AI-Enhanced metrics (best performance)
const aiEnhancedMetrics = Array.from({ length: 30 }, () => ({
  ttfb: 180 + Math.random() * 25,   // 180-205ms
  lcp: 2.2 + Math.random() * 0.3,   // 2.2-2.5s
  fid: 55 + Math.random() * 12,     // 55-67ms
  cls: 0.04 + Math.random() * 0.02, // 0.04-0.06
}))

// Load test metrics
const k6RampMetrics = Array.from({ length: 10 }, () => ({
  responseTime: 200 + Math.random() * 50,
  ttfb: 150 + Math.random() * 30,
  errorRate: Math.random() * 0.5,
  throughput: 80 + Math.random() * 20,
}))

const k6SpikeMetrics = Array.from({ length: 10 }, () => ({
  responseTime: 400 + Math.random() * 100,
  ttfb: 250 + Math.random() * 50,
  errorRate: 1 + Math.random() * 2,
  throughput: 450 + Math.random() * 50,
}))

const artilleryMetrics = Array.from({ length: 10 }, () => ({
  latency: 220 + Math.random() * 40,
  errorRate: Math.random() * 1,
  rps: 100 + Math.random() * 30,
}))

function createLighthouseJSON(metrics, index) {
  return {
    audits: {
      'server-response-time': {
        numericValue: metrics.ttfb,
        displayValue: `${metrics.ttfb.toFixed(0)} ms`,
      },
      'largest-contentful-paint': {
        numericValue: metrics.lcp * 1000,
        displayValue: `${metrics.lcp.toFixed(2)} s`,
      },
      'max-potential-fid': {
        numericValue: metrics.fid,
        displayValue: `${metrics.fid.toFixed(0)} ms`,
      },
      'cumulative-layout-shift': {
        numericValue: metrics.cls,
        displayValue: metrics.cls.toFixed(3),
      },
    },
    fetchTime: new Date().toISOString(),
    runIndex: index,
  }
}

function createK6JSON(metrics, index) {
  return {
    metrics: {
      http_req_duration: {
        values: {
          avg: metrics.responseTime,
          min: metrics.responseTime * 0.7,
          max: metrics.responseTime * 1.3,
        },
      },
      ttfb: {
        values: {
          avg: metrics.ttfb,
          min: metrics.ttfb * 0.8,
          max: metrics.ttfb * 1.2,
        },
      },
      http_req_failed: {
        values: {
          rate: metrics.errorRate / 100,
        },
      },
      http_reqs: {
        values: {
          rate: metrics.throughput,
        },
      },
    },
    timestamp: new Date().toISOString(),
    runIndex: index,
  }
}

function createArtilleryJSON(metrics, index) {
  return {
    aggregate: {
      latency: {
        mean: metrics.latency,
        min: metrics.latency * 0.7,
        max: metrics.latency * 1.3,
      },
      errors: Math.round(metrics.errorRate * 10),
      codes: {
        '200': Math.round(1000 - metrics.errorRate * 10),
      },
      rate: metrics.rps,
    },
    timestamp: new Date().toISOString(),
    runIndex: index,
  }
}

function createSampleData() {
  const baseDir = './tests'
  
  // Create performance metrics data
  const metricsDirs = [
    { name: 'baseline', data: baselineMetrics },
    { name: 'optimized', data: optimizedMetrics },
    { name: 'ai-enhanced', data: aiEnhancedMetrics },
  ]
  
  metricsDirs.forEach(({ name, data }) => {
    const dir = path.join(baseDir, 'metrics', 'results', name)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    data.forEach((metrics, index) => {
      const json = createLighthouseJSON(metrics, index)
      const filename = `lighthouse-run-${String(index + 1).padStart(3, '0')}.json`
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(json, null, 2))
    })
    
    console.log(`✓ Created ${data.length} files in ${dir}`)
  })
  
  // Create load test data
  const loadDirs = [
    { name: 'k6-ramp', data: k6RampMetrics, type: 'k6' },
    { name: 'k6-spike', data: k6SpikeMetrics, type: 'k6' },
    { name: 'artillery-spike', data: artilleryMetrics, type: 'artillery' },
  ]
  
  loadDirs.forEach(({ name, data, type }) => {
    const dir = path.join(baseDir, 'load', 'results', name)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    data.forEach((metrics, index) => {
      const json = type === 'k6' 
        ? createK6JSON(metrics, index)
        : createArtilleryJSON(metrics, index)
      const filename = type === 'k6'
        ? `k6-run-${String(index + 1).padStart(3, '0')}.json`
        : `artillery-run-${String(index + 1).padStart(3, '0')}.json`
      fs.writeFileSync(path.join(dir, filename), JSON.stringify(json, null, 2))
    })
    
    console.log(`✓ Created ${data.length} files in ${dir}`)
  })
  
  console.log('\n✅ All sample data created!')
  console.log('\nNow run: node analyze-all-experiments.js')
}

if (require.main === module) {
  createSampleData()
}

module.exports = { createSampleData }

