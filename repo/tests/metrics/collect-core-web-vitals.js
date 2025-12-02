#!/usr/bin/env node

/**
 * Core Web Vitals Collection Script (Node.js/Puppeteer)
 * 
 * Collects TTFB, LCP, FID, and CLS metrics using Puppeteer
 * and sends them to the API endpoint for storage.
 * 
 * Usage:
 *   node collect-core-web-vitals.js [--url http://localhost:3001] [--output results/metrics.json]
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
const url = args.find(arg => arg.startsWith('--url='))?.split('=')[1] || 
            args.find(arg => arg === '--url') && args[args.indexOf('--url') + 1] ||
            process.env.BASE_URL || 
            'http://localhost:3001';

const outputArg = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
                  args.find(arg => arg === '--output') && args[args.indexOf('--output') + 1];

const API_ENDPOINT = process.env.API_ENDPOINT || `${url}/api/web-vitals`;

// Results directory
const resultsDir = path.join(__dirname, 'results');
if (!fs.existsSync(resultsDir)) {
  fs.mkdirSync(resultsDir, { recursive: true });
}

const outputPath = outputArg 
  ? (path.isAbsolute(outputArg) ? outputArg : path.join(process.cwd(), outputArg))
  : path.join(resultsDir, `web-vitals-${Date.now()}.json`);

// Helper function to send metric to API
function sendMetricToAPI(name, value) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(API_ENDPOINT);
      const data = JSON.stringify({
        name: name,
        value: value,
        timestamp: Date.now()
      });

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = http.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve());
      });

      req.on('error', () => resolve()); // Silently fail
      req.write(data);
      req.end();
    } catch (e) {
      resolve(); // Silently fail
    }
  });
}

async function collectWebVitals() {
  console.log(`Starting Core Web Vitals collection for ${url}...`);
  console.log(`Make sure your Next.js server is running at ${url}\n`);
  
  let browser;
  const maxRetries = 2;
  
  // Try system Chrome first, then Puppeteer's bundled Chrome
  const chromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    puppeteer.executablePath()
  ];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const chromePath of chromePaths) {
      try {
        if (attempt > 1 || chromePath !== chromePaths[0]) {
          console.log(`Trying Chrome at: ${chromePath}...`);
        } else {
          console.log('Launching browser...');
        }
        
        browser = await puppeteer.launch({
          headless: 'new',
          executablePath: chromePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--remote-debugging-port=0' // Use random port
          ],
          ignoreHTTPSErrors: true,
          timeout: 60000
        });
        console.log('✅ Browser launched');
        break;
      } catch (launchError) {
        if (chromePath === chromePaths[chromePaths.length - 1] && attempt === maxRetries) {
          throw new Error(`Failed to launch browser: ${launchError.message}\n\n  Troubleshooting:\n  1. Try closing other Chrome instances\n  2. Restart your terminal\n  3. Reinstall puppeteer: cd repo && npm install puppeteer --force`);
        }
        // Try next path
        continue;
      }
    }
    if (browser) break;
    
    if (attempt < maxRetries) {
      console.log(`Retrying (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  try {
    console.log('Creating new page...');
    const page = await browser.newPage();
    console.log('✅ Page created');
    
    // Handle page errors gracefully
    page.on('error', (error) => {
      console.warn('Page error (non-fatal):', error.message);
    });
    
    page.on('pageerror', (error) => {
      console.warn('Page JavaScript error (non-fatal):', error.message);
    });
    
    // Set viewport for consistent metrics
    await page.setViewport({ width: 1280, height: 720 });

    // Collect metrics
    const metrics = {
      ttfb: null,
      lcp: null,
      fid: null,
      cls: null,
      timestamp: Date.now(),
      url: url
    };

    // Navigate to page first
    console.log(`Navigating to ${url}...`);
    let response;
    try {
      response = await Promise.race([
        page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Navigation timeout')), 30000)
        )
      ]);
      
      if (response && !response.ok()) {
        console.warn(`Warning: Page returned status ${response.status()}`);
      } else if (!response) {
        console.warn('Warning: No response object received');
      }
      
      console.log('✅ Page loaded successfully');
    } catch (navError) {
      const errorMsg = navError.message || String(navError);
      console.error(`\n❌ Navigation error: ${errorMsg}`);
      
      // Check if it's a connection error
      if (errorMsg.includes('net::ERR_CONNECTION_REFUSED') || 
          errorMsg.includes('socket hang up') ||
          errorMsg.includes('Navigation timeout') ||
          errorMsg.includes('net::ERR_') ||
          errorMsg.includes('Protocol error') ||
          errorMsg.includes('Target closed') ||
          errorMsg.includes('Session closed')) {
        throw new Error(`Cannot connect to ${url}.\n  Error: ${errorMsg}\n  Please make sure your Next.js server is running.\n  Start it with: cd repo && npm run dev`);
      }
      throw navError;
    }

    console.log('Page loaded, collecting metrics...');

    // Wait for page to be fully interactive
    await page.waitForTimeout(2000);

    // Collect metrics using Performance API and web-vitals polyfill
    console.log('Collecting Core Web Vitals...');
    const collectedMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics = {
          ttfb: null,
          lcp: null,
          fid: null,
          cls: null
        };

        // TTFB - Time to First Byte (from Performance API)
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          metrics.ttfb = navigation.responseStart - navigation.requestStart;
        }

        // LCP - Largest Contentful Paint
        let lcpValue = null;
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcpValue = lastEntry.renderTime || lastEntry.loadTime;
          metrics.lcp = lcpValue;
        });
        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }

        // FID - First Input Delay
        let fidValue = null;
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            fidValue = entries[0].processingStart - entries[0].startTime;
            metrics.fid = fidValue;
          }
        });
        try {
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
          // FID not supported
        }

        // CLS - Cumulative Layout Shift
        let clsValue = 0;
        let clsEntries = [];
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsEntries.push(entry);
              clsValue += entry.value;
            }
          }
          metrics.cls = clsValue;
        });
        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS not supported
        }

        // Wait for metrics to be collected
        let checkCount = 0;
        const maxChecks = 250; // 25 seconds max
        const checkComplete = setInterval(() => {
          checkCount++;
          
          // Check if we have all metrics or timeout
          const hasAllMetrics = metrics.ttfb !== null && 
                                 metrics.lcp !== null && 
                                 metrics.fid !== null && 
                                 metrics.cls !== null;
          
          if (hasAllMetrics || checkCount >= maxChecks) {
            clearInterval(checkComplete);
            
            // Disconnect observers
            try { lcpObserver.disconnect(); } catch (e) {}
            try { fidObserver.disconnect(); } catch (e) {}
            try { clsObserver.disconnect(); } catch (e) {}
            
            resolve(metrics);
          }
        }, 100);
      });
    });

    // Trigger user interaction for FID if not already captured
    if (!collectedMetrics.fid) {
      console.log('Triggering interaction to capture FID...');
      try {
        await page.mouse.move(100, 100);
        await page.mouse.click(100, 100);
        await page.waitForTimeout(500);
      } catch (e) {
        // Ignore
      }
      
      // Check again for FID
      const fidCheck = await page.evaluate(() => {
        const entries = performance.getEntriesByType('first-input');
        if (entries.length > 0) {
          return entries[0].processingStart - entries[0].startTime;
        }
        return null;
      });
      if (fidCheck !== null) {
        collectedMetrics.fid = fidCheck;
      }
    }

    // Extract values (already in correct format from Performance API)
    if (collectedMetrics.ttfb !== null) metrics.ttfb = collectedMetrics.ttfb;
    if (collectedMetrics.lcp !== null) metrics.lcp = collectedMetrics.lcp;
    if (collectedMetrics.fid !== null) metrics.fid = collectedMetrics.fid;
    if (collectedMetrics.cls !== null) metrics.cls = collectedMetrics.cls;

    // Send to API
    console.log('\n📊 Collected Metrics:');
    if (metrics.ttfb) {
      console.log(`  TTFB: ${metrics.ttfb.toFixed(2)}ms`);
      await sendMetricToAPI('TTFB', metrics.ttfb);
    }
    if (metrics.lcp) {
      console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms`);
      await sendMetricToAPI('LCP', metrics.lcp);
    }
    if (metrics.fid) {
      console.log(`  FID: ${metrics.fid.toFixed(2)}ms`);
      await sendMetricToAPI('FID', metrics.fid);
    }
    if (metrics.cls) {
      console.log(`  CLS: ${metrics.cls.toFixed(3)}`);
      await sendMetricToAPI('CLS', metrics.cls);
    }

    // Save to file
    fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
    console.log(`\n✅ Metrics saved to: ${outputPath}`);

    return metrics;

  } catch (error) {
    const errorMsg = error.message || String(error);
    console.error('\n❌ Error details:');
    console.error('  Message:', errorMsg);
    if (error.stack) {
      console.error('  Stack:', error.stack.split('\n').slice(0, 5).join('\n'));
    }
    
    if (errorMsg.includes('Cannot connect') || errorMsg.includes('socket hang up')) {
      console.error(`\n💡 Troubleshooting:`);
      console.error(`  1. Verify server is running: curl ${url}`);
      console.error(`  2. Check server logs for errors`);
      console.error(`  3. Try restarting the server: cd repo && npm run dev`);
    }
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}

// Run if executed directly
if (require.main === module) {
  collectWebVitals()
    .then(() => {
      console.log('\n✅ Collection complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Collection failed:', error.message);
      process.exit(1);
    });
}

module.exports = { collectWebVitals };
