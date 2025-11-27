/**
 * Create Sample Metric Data
 * 
 * Generates sample Lighthouse JSON files for testing the analysis tool
 */

const fs = require('fs')
const path = require('path')

// Sample data matching the example results
const sampleMetrics = [
  { ttfb: 200, lcp: 2.5, fid: 80, cls: 0.07 },
  { ttfb: 210, lcp: 2.6, fid: 85, cls: 0.08 },
  { ttfb: 220, lcp: 2.7, fid: 90, cls: 0.09 },
  { ttfb: 215, lcp: 2.65, fid: 88, cls: 0.08 },
  { ttfb: 205, lcp: 2.55, fid: 82, cls: 0.07 },
  { ttfb: 225, lcp: 2.75, fid: 92, cls: 0.09 },
  { ttfb: 218, lcp: 2.68, fid: 87, cls: 0.08 },
  { ttfb: 212, lcp: 2.62, fid: 84, cls: 0.08 },
  { ttfb: 208, lcp: 2.58, fid: 83, cls: 0.07 },
  { ttfb: 222, lcp: 2.72, fid: 89, cls: 0.09 },
  { ttfb: 217, lcp: 2.67, fid: 86, cls: 0.08 },
  { ttfb: 213, lcp: 2.63, fid: 85, cls: 0.08 },
  { ttfb: 219, lcp: 2.69, fid: 88, cls: 0.08 },
  { ttfb: 211, lcp: 2.61, fid: 84, cls: 0.08 },
  { ttfb: 224, lcp: 2.74, fid: 91, cls: 0.09 },
  { ttfb: 206, lcp: 2.56, fid: 81, cls: 0.07 },
  { ttfb: 216, lcp: 2.66, fid: 87, cls: 0.08 },
  { ttfb: 214, lcp: 2.64, fid: 85, cls: 0.08 },
  { ttfb: 221, lcp: 2.71, fid: 90, cls: 0.09 },
  { ttfb: 209, lcp: 2.59, fid: 83, cls: 0.07 },
  { ttfb: 223, lcp: 2.73, fid: 91, cls: 0.09 },
  { ttfb: 207, lcp: 2.57, fid: 82, cls: 0.07 },
  { ttfb: 226, lcp: 2.76, fid: 93, cls: 0.09 },
  { ttfb: 210, lcp: 2.60, fid: 84, cls: 0.08 },
  { ttfb: 215, lcp: 2.65, fid: 86, cls: 0.08 },
  { ttfb: 218, lcp: 2.68, fid: 87, cls: 0.08 },
  { ttfb: 212, lcp: 2.62, fid: 85, cls: 0.08 },
  { ttfb: 220, lcp: 2.70, fid: 89, cls: 0.09 },
  { ttfb: 214, lcp: 2.64, fid: 86, cls: 0.08 },
  { ttfb: 217, lcp: 2.67, fid: 88, cls: 0.08 },
]

function createLighthouseJSON(metrics, index) {
  return {
    audits: {
      'server-response-time': {
        numericValue: metrics.ttfb,
        displayValue: `${metrics.ttfb} ms`,
      },
      'largest-contentful-paint': {
        numericValue: metrics.lcp * 1000, // Convert s to ms
        displayValue: `${metrics.lcp} s`,
      },
      'max-potential-fid': {
        numericValue: metrics.fid,
        displayValue: `${metrics.fid} ms`,
      },
      'cumulative-layout-shift': {
        numericValue: metrics.cls,
        displayValue: metrics.cls.toString(),
      },
    },
    fetchTime: new Date().toISOString(),
    runIndex: index,
  }
}

function createSampleData(outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  console.log(`Creating ${sampleMetrics.length} sample metric files...`)

  sampleMetrics.forEach((metrics, index) => {
    const data = createLighthouseJSON(metrics, index)
    const filename = `lighthouse-run-${String(index + 1).padStart(3, '0')}.json`
    const filepath = path.join(outputDir, filename)
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  })

  console.log(`Sample data created in ${outputDir}`)
  console.log(`\nYou can now run the analysis tool:`)
  console.log(`  node analyze-metrics.js ${outputDir} ./results`)
}

if (require.main === module) {
  const outputDir = process.argv[2] || './lighthouse/results'
  createSampleData(outputDir)
}

module.exports = { createSampleData }

