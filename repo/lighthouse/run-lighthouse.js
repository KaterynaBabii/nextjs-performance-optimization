/**
 * Lighthouse Runner - Hybrid Approach
 * 
 * Tries Puppeteer first, falls back to HTTP if socket hang up occurs
 */

const puppeteer = require('puppeteer');
const http = require('http');
const { performance } = require('perf_hooks');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const outputArg = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
                  args.find(arg => arg === '--output') && args[args.indexOf('--output') + 1];

async function runWithPuppeteer() {
  console.log('🤖 Attempting with Puppeteer...');
  
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
        // Launch browser with optimized settings
        browser = await puppeteer.launch({
          headless: 'new',
          executablePath: chromePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--js-flags=--max-old-space-size=4096',
            '--remote-debugging-port=0' // Use random port
          ],
          ignoreHTTPSErrors: true,
          timeout: 60000
        });
        break; // Success, exit loops
      } catch (launchError) {
        if (chromePath === chromePaths[chromePaths.length - 1] && attempt === maxRetries) {
          throw launchError; // Last attempt failed
        }
        continue; // Try next path
      }
    }
    if (browser) break; // Success, exit retry loop
    
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (!browser) {
    throw new Error('Failed to launch browser after all attempts');
  }
  
  try {
    const page = await browser.newPage();
    
    // Handle page errors gracefully
    page.on('error', (error) => {
      console.warn('Page error (non-fatal):', error.message);
    });
    
    page.on('pageerror', (error) => {
      console.warn('Page JavaScript error (non-fatal):', error.message);
    });
    
    // Set longer timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('TTFB:') || text.includes('LCP:') || 
          text.includes('FID:') || text.includes('CLS:') || 
          text.includes('Web Vitals')) {
        console.log('📊', text);
      }
    });
    
    // Navigate to the app first
    console.log('🌐 Navigating to page...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Inject web-vitals library after navigation
    console.log('📝 Loading web-vitals library...');
    try {
      await page.addScriptTag({ 
        url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js'
      });
      await page.waitForFunction(() => typeof onTTFB !== 'undefined', { timeout: 10000 });
    } catch (scriptError) {
      console.warn('⚠️ Could not load web-vitals from CDN, using Performance API...');
    }
    
    // Collect metrics using Performance API
    console.log('⚡ Collecting Core Web Vitals...');
    await page.waitForTimeout(2000);
    
    // Trigger interaction for FID
    try {
      await page.mouse.move(100, 100);
      await page.mouse.click(100, 100);
      await page.waitForTimeout(500);
    } catch (e) {
      // Ignore
    }
    
    // Collect metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const collected = {
          ttfb: null,
          lcp: null,
          fid: null,
          cls: null
        };

        // TTFB from Performance API
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          collected.ttfb = navigation.responseStart - navigation.requestStart;
        }

        // Use web-vitals if available, otherwise use Performance API
        if (typeof onTTFB !== 'undefined') {
          const captureMetric = (metric) => {
            collected[metric.name.toLowerCase()] = metric.value;
          };
          onTTFB(captureMetric);
          onLCP(captureMetric);
          onFID(captureMetric);
          onCLS(captureMetric);
        } else {
          // Fallback to Performance API
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              const lastEntry = entries[entries.length - 1];
              collected.lcp = lastEntry.renderTime || lastEntry.loadTime;
            }
          });
          try {
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (e) {}

          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              collected.fid = entries[0].processingStart - entries[0].startTime;
            }
          });
          try {
            fidObserver.observe({ entryTypes: ['first-input'] });
          } catch (e) {}

          const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            collected.cls = clsValue;
          });
          try {
            clsObserver.observe({ entryTypes: ['layout-shift'] });
          } catch (e) {}
        }

        // Wait for metrics
        let checkCount = 0;
        const maxChecks = 200;
        const checkComplete = setInterval(() => {
          checkCount++;
          if ((collected.ttfb !== null && collected.lcp !== null && 
               collected.fid !== null && collected.cls !== null) || 
              checkCount >= maxChecks) {
            clearInterval(checkComplete);
            resolve(collected);
          }
        }, 100);
      });
    });
    
    if (metrics && (metrics.ttfb !== null || metrics.lcp !== null || 
                    metrics.fid !== null || metrics.cls !== null)) {
      console.log('\n✅ Collected Web Vitals with Puppeteer:');
      if (metrics.ttfb !== null) console.log(`   TTFB: ${metrics.ttfb.toFixed(2)}ms`);
      if (metrics.lcp !== null) console.log(`   LCP: ${metrics.lcp.toFixed(2)}ms`);
      if (metrics.fid !== null) console.log(`   FID: ${metrics.fid.toFixed(2)}ms`);
      if (metrics.cls !== null) console.log(`   CLS: ${metrics.cls.toFixed(3)}`);
      saveMetrics(metrics, 'puppeteer');
      return true;
    } else {
      console.log('\n⚠️ No metrics captured with Puppeteer.');
      return false;
    }
    
  } catch (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('socket hang up') || 
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('read ECONNRESET') ||
        errorMsg.includes('Failed to launch browser') ||
        errorMsg.includes('ERR_CONNECTION_REFUSED') ||
        errorMsg.includes('Navigation timeout')) {
      console.log('⚠️ Puppeteer failed:', errorMsg);
      if (errorMsg.includes('ERR_CONNECTION_REFUSED')) {
        console.log('💡 Make sure your Next.js server is running: cd repo && npm run dev');
      }
      return false;
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

async function runWithHTTP() {
  console.log('\n🌐 Falling back to HTTP-based metrics collection...');
  
  const startTime = performance.now();
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3001', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            ttfb: performance.now() - startTime
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
    
    console.log('\n📊 Basic Metrics:');
    console.log(`   TTFB: ${response.ttfb.toFixed(2)}ms`);
    console.log(`   Page Size: ${(response.body.length / 1024).toFixed(2)}KB`);
    console.log(`   Status: ${response.statusCode}`);
    
    console.log('\n📋 Middleware Headers:');
    console.log(`   X-Device-Type: ${response.headers['x-device-type'] || 'Not set'}`);
    console.log(`   X-Prefetch-Routes: ${response.headers['x-prefetch-routes'] || 'None'}`);
    
    // Save basic metrics
    const metrics = {
      type: 'http-basic',
      ttfb: response.ttfb,
      pageSize: response.body.length,
      statusCode: response.statusCode,
      headers: {
        deviceType: response.headers['x-device-type'],
        prefetchRoutes: response.headers['x-prefetch-routes']
      },
      note: 'For full Core Web Vitals, run collect-core-web-vitals.js manually in browser'
    };
    
    saveMetrics(metrics, 'http');
    
    console.log('\n📝 For complete Core Web Vitals (LCP, FID, CLS):');
    console.log('   1. Open http://localhost:3001 in browser');
    console.log('   2. Open DevTools console');
    console.log('   3. Run the collect-core-web-vitals.js script');
    
    return true;
  } catch (error) {
    // Handle AggregateError (can contain multiple errors)
    let errorMsg = error.message || String(error);
    if (error.name === 'AggregateError' && error.errors && error.errors.length > 0) {
      errorMsg = error.errors.map(e => e.message || String(e)).join('; ');
    }
    
    console.error('HTTP method error:', errorMsg);
    if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect') || 
        errorMsg.includes('ECONNRESET') || errorMsg.includes('socket')) {
      console.error('💡 Make sure your Next.js server is running: cd repo && npm run dev');
    }
    throw error;
  }
}

function saveMetrics(metrics, method) {
  const fs = require('fs');
  const resultsDir = path.join(__dirname, 'results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Use provided output path, or default to lighthouse-run-XXX.json naming
  let resultsFile;
  if (outputArg) {
    // Custom output path provided
    resultsFile = path.isAbsolute(outputArg) 
      ? outputArg 
      : path.join(resultsDir, path.basename(outputArg));
  } else {
    // Default naming: lighthouse-run-001.json, lighthouse-run-002.json, etc.
    const existingFiles = fs.readdirSync(resultsDir)
      .filter(f => f.startsWith('lighthouse-run-') && f.endsWith('.json'))
      .map(f => {
        const match = f.match(/lighthouse-run-(\d+)\.json/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a);
    
    const nextNumber = existingFiles.length > 0 ? existingFiles[0] + 1 : 1;
    resultsFile = path.join(resultsDir, `lighthouse-run-${String(nextNumber).padStart(3, '0')}.json`);
  }
  
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    method: method,
    metrics: metrics
  }, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);
}

async function runLighthouse() {
  console.log('🚀 Starting Core Web Vitals collection for: http://localhost:3001');
  
  let puppeteerSuccess = false;
  let httpSuccess = false;
  
  // Try Puppeteer first
  try {
    puppeteerSuccess = await runWithPuppeteer();
  } catch (error) {
    // Handle AggregateError
    let errorMsg = error.message || String(error);
    if (error.name === 'AggregateError' && error.errors && error.errors.length > 0) {
      errorMsg = error.errors.map(e => e.message || String(e)).join('; ');
    }
    console.log('⚠️ Puppeteer failed:', errorMsg);
  }
  
  // If Puppeteer failed, try HTTP fallback
  if (!puppeteerSuccess) {
    try {
      httpSuccess = await runWithHTTP();
    } catch (error) {
      // Handle AggregateError
      let errorMsg = error.message || String(error);
      if (error.name === 'AggregateError' && error.errors && error.errors.length > 0) {
        errorMsg = error.errors.map(e => e.message || String(e)).join('; ');
      }
      console.error('❌ HTTP fallback failed:', errorMsg);
      if (errorMsg.includes('ECONNREFUSED') || errorMsg.includes('connect')) {
        console.error('\n💡 Your Next.js server is not running.');
        console.error('   Start it with: cd repo && npm run dev');
      }
      process.exit(1);
    }
  }
  
  if (puppeteerSuccess || httpSuccess) {
    console.log('\n✅ Metrics collection completed!');
  } else {
    console.error('\n❌ All methods failed. Please start your server and try again.');
    process.exit(1);
  }
}

runLighthouse();
