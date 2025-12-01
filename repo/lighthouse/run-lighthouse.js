#!/usr/bin/env node

/**
 * Lighthouse Test Runner
 * 
 * Runs Lighthouse audits with custom configuration matching research setup.
 * 
 * Usage:
 *   node lighthouse/run-lighthouse.js
 *   node lighthouse/run-lighthouse.js --output lighthouse/results/run-001.json
 *   node lighthouse/run-lighthouse.js --url http://localhost:3000
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Parse command line arguments
const args = process.argv.slice(2)
const url = args.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:3000'
const outputArg = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || args.find(arg => arg === '--output') && args[args.indexOf('--output') + 1]

// Get paths
const scriptDir = __dirname
const configPath = path.join(scriptDir, 'lighthouse-config.json')
const resultsDir = path.join(scriptDir, 'results')

// Ensure results directory exists
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true })
}

// Default output path
const defaultOutputPath = path.join(resultsDir, 'lighthouse-report.json')
const outputPath = outputArg 
  ? (path.isAbsolute(outputArg) ? outputArg : path.join(process.cwd(), outputArg))
  : defaultOutputPath

// Ensure output directory exists
const outputDir = path.dirname(outputPath)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Check if config file exists
if (!fs.existsSync(configPath)) {
  console.error(`Error: Lighthouse config not found at ${configPath}`)
  console.error('Please create lighthouse-config.json in the lighthouse directory.')
  process.exit(1)
}

// Check if lighthouse is installed
try {
  execSync('lighthouse --version', { stdio: 'ignore' })
} catch (error) {
  console.error('Error: Lighthouse CLI not found.')
  console.error('Please install it with: npm install -g lighthouse')
  process.exit(1)
}

console.log(`Running Lighthouse audit on ${url}...`)
console.log(`Config: ${configPath}`)
console.log(`Output: ${outputPath}`)

try {
  // Build lighthouse command arguments
  const lighthouseArgs = [
    url,
    `--config-path=${configPath}`,
    '--output=json',
    `--output-path=${outputPath}`,
    '--chrome-flags=--headless --no-sandbox',
    '--quiet'
  ]

  // Run lighthouse
  execSync(`lighthouse ${lighthouseArgs.map(arg => `"${arg}"`).join(' ')}`, { 
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true
  })

  console.log(`\n✅ Lighthouse audit completed successfully!`)
  console.log(`Results saved to: ${outputPath}`)

  // Try to extract and display key metrics
  try {
    const results = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    const metrics = results.audits
    
    if (metrics['first-contentful-paint'] && metrics['largest-contentful-paint']) {
      console.log('\n📊 Key Metrics:')
      console.log(`  First Contentful Paint: ${(metrics['first-contentful-paint'].numericValue / 1000).toFixed(2)}s`)
      console.log(`  Largest Contentful Paint: ${(metrics['largest-contentful-paint'].numericValue / 1000).toFixed(2)}s`)
      console.log(`  Total Blocking Time: ${(metrics['total-blocking-time']?.numericValue || 0).toFixed(0)}ms`)
      console.log(`  Cumulative Layout Shift: ${(metrics['cumulative-layout-shift']?.numericValue || 0).toFixed(3)}`)
      console.log(`  Performance Score: ${(results.categories?.performance?.score * 100 || 0).toFixed(0)}`)
    }
  } catch (e) {
    // Ignore errors parsing results
  }

} catch (error) {
  console.error('\n❌ Lighthouse audit failed!')
  console.error(error.message)
  process.exit(1)
}

