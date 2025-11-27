# Web Performance Metrics Testing

This directory contains scripts and configurations for collecting and analyzing web performance metrics, including Core Web Vitals and Lighthouse audits.

## Overview

The metrics testing suite includes:
- **Core Web Vitals Collection**: TTFB, LCP, FID, CLS
- **Lighthouse Audits**: Performance metrics with custom throttling
- Custom network conditions matching research setup

## Prerequisites

### Install Lighthouse CLI

```bash
npm install -g lighthouse
```

### Install Chrome/Chromium

Lighthouse requires Chrome or Chromium to be installed.

**macOS:**
```bash
brew install --cask google-chrome
```

**Linux:**
```bash
# Chrome is typically pre-installed or available via package manager
```

## Core Web Vitals Collection

### Script: `collect-core-web-vitals.js`

This script collects Core Web Vitals metrics in a browser environment and sends them to the API endpoint.

#### Usage in Browser Console

1. Open your application: `http://localhost:3000`
2. Open browser DevTools (F12)
3. Go to Console tab
4. Paste and run:

```javascript
// Load web-vitals library
const script = document.createElement('script');
script.src = 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js';
script.onload = () => {
  // Collect metrics
  onTTFB(metric => {
    fetch('/api/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
        timestamp: Date.now()
      })
    }).then(() => console.log(`✓ ${metric.name}: ${metric.value}`));
  });
  
  onLCP(metric => {
    fetch('/api/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
        timestamp: Date.now()
      })
    }).then(() => console.log(`✓ ${metric.name}: ${metric.value}`));
  });
  
  onFID(metric => {
    fetch('/api/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
        timestamp: Date.now()
      })
    }).then(() => console.log(`✓ ${metric.name}: ${metric.value}`));
  });
  
  onCLS(metric => {
    fetch('/api/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        navigationType: metric.navigationType,
        timestamp: Date.now()
      })
    }).then(() => console.log(`✓ ${metric.name}: ${metric.value}`));
  });
  
  console.log('Core Web Vitals collection started. Interact with the page to generate FID.');
};
document.head.appendChild(script);
```

#### Usage with Puppeteer

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Load web-vitals script
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js'
  });
  
  // Load collection script
  const collectScript = fs.readFileSync('./collect-core-web-vitals.js', 'utf8');
  await page.evaluate(collectScript);
  
  // Navigate to page
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Wait for metrics collection
  await page.waitForTimeout(5000);
  
  // Interact to generate FID
  await page.click('button');
  
  await page.waitForTimeout(2000);
  
  await browser.close();
})();
```

## Lighthouse Audits

### Configuration: `lighthouse-config.json`

Custom Lighthouse configuration matching research setup:
- **Mobile emulation**: Pixel 3 device
- **Network throttling**: RTT 80±10ms, 10 Mbps throughput
- **CPU throttling**: 4x slowdown
- **Focus**: Performance metrics only

### Running Lighthouse

#### Basic Audit

```bash
lighthouse http://localhost:3000 --config-path=./lighthouse-config.json --output=html --output-path=./results/lighthouse-report.html
```

#### JSON Output

```bash
lighthouse http://localhost:3000 --config-path=./lighthouse-config.json --output=json --output-path=./results/lighthouse-report.json
```

#### Multiple Runs (for statistical significance)

```bash
# Run 10 times and collect results
mkdir -p results/lighthouse-runs

for i in {1..10}; do
  lighthouse http://localhost:3000 \
    --config-path=./lighthouse-config.json \
    --output=json \
    --output-path=./results/lighthouse-runs/run-$i.json \
    --quiet
  echo "Run $i completed"
done
```

#### Extract Metrics from JSON

```bash
# Extract Core Web Vitals from Lighthouse JSON
node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./results/lighthouse-report.json'));
const audits = data.audits;
console.log('TTFB:', audits['server-response-time']?.numericValue, 'ms');
console.log('LCP:', audits['largest-contentful-paint']?.numericValue, 'ms');
console.log('TBT:', audits['total-blocking-time']?.numericValue, 'ms');
console.log('CLS:', audits['cumulative-layout-shift']?.numericValue);
"
```

### Network Conditions

The configuration uses:
- **RTT**: 80ms (with ±10ms variation in practice)
- **Throughput**: 10 Mbps (10240 Kbps)
- **Packet Loss**: 0.3% (configured via Chrome DevTools)
- **CPU**: 4x slowdown (mobile device simulation)

### Custom Throttling Script

For more precise control, use Chrome DevTools Protocol:

```javascript
// throttle-network.js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set network conditions
  const client = await page.target().createCDPSession();
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 10 * 1024 * 1024 / 8, // 10 Mbps in bytes/sec
    uploadThroughput: 10 * 1024 * 1024 / 8,
    latency: 80, // RTT in ms
  });
  
  // Set CPU throttling
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  
  await page.goto('http://localhost:3000');
  
  // Run Lighthouse or collect metrics
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
```

## Metrics Interpretation

### Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **TTFB** | ≤ 200 ms | 200-500 ms | > 500 ms |
| **LCP** | ≤ 2.5 s | 2.5-4.0 s | > 4.0 s |
| **FID** | ≤ 100 ms | 100-300 ms | > 300 ms |
| **CLS** | ≤ 0.1 | 0.1-0.25 | > 0.25 |

### Lighthouse Performance Score

- **90-100**: Good
- **50-89**: Needs Improvement
- **0-49**: Poor

## Automated Testing Script

Create `run-metrics-tests.sh`:

```bash
#!/bin/bash

URL=${1:-http://localhost:3000}
RESULTS_DIR="results/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RESULTS_DIR"

echo "Running Lighthouse audit on $URL"
lighthouse "$URL" \
  --config-path=./lighthouse-config.json \
  --output=json \
  --output=html \
  --output-path="$RESULTS_DIR/lighthouse" \
  --chrome-flags="--headless"

echo "Results saved to $RESULTS_DIR"
```

Make executable:
```bash
chmod +x run-metrics-tests.sh
./run-metrics-tests.sh http://localhost:3000
```

## Best Practices

1. **Run multiple times**: Performance metrics have variance
2. **Use consistent environment**: Same network, same device
3. **Clear cache**: Use `--disable-storage-reset=false` or clear manually
4. **Warm up server**: Make a few requests before testing
5. **Monitor server resources**: CPU, memory during tests

## Troubleshooting

### Lighthouse: "Chrome not found"
- Install Chrome/Chromium
- Use `--chrome-flags="--chrome-path=/path/to/chrome"`

### High variance in results
- Run more iterations (10+)
- Ensure consistent network conditions
- Check for background processes affecting CPU

### Metrics not appearing
- Check API endpoint is accessible
- Verify web-vitals library is loaded
- Check browser console for errors

## References

- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals Library](https://github.com/GoogleChrome/web-vitals)
- [Core Web Vitals](https://web.dev/vitals/)

