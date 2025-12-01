/**
 * Lighthouse Runner - Hybrid Approach
 * 
 * Tries Puppeteer first, falls back to HTTP if socket hang up occurs
 */

const puppeteer = require('puppeteer');
const http = require('http');
const { performance } = require('perf_hooks');
const path = require('path');

async function runWithPuppeteer() {
  console.log('🤖 Attempting with Puppeteer...');
  
  let browser;
  try {
    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: 'new',
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
        '--single-process',
      ],
    });
    
    const page = await browser.newPage();
    
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
    
    // Inject web-vitals library first
    await page.addScriptTag({ 
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js',
      waitUntil: 'load'
    });
    
    // Load and inject the collect-core-web-vitals script
    const scriptPath = path.resolve(__dirname, '../../tests/metrics/collect-core-web-vitals.js');
    const scriptContent = require('fs').readFileSync(scriptPath, 'utf8');
    
    // Navigate to the app
    console.log('🌐 Navigating to page...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Inject the script content
    console.log('📝 Injecting Core Web Vitals collection script...');
    await page.evaluate(scriptContent);
    
    // Initialize collection
    console.log('⚡ Starting metrics collection...');
    await page.evaluate(() => {
      if (typeof window.initWebVitalsCollection === 'function') {
        window.initWebVitalsCollection();
      } else if (typeof window.collectWebVitals === 'function') {
        window.collectWebVitals();
      }
    });
    
    // Wait for metrics to be collected
    console.log('⏱️ Waiting 15 seconds for metrics collection...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Try to get any collected metrics
    const metrics = await page.evaluate(() => {
      return window.webVitalsMetrics || null;
    });
    
    if (metrics) {
      console.log('\n✅ Collected Web Vitals with Puppeteer:', JSON.stringify(metrics, null, 2));
      saveMetrics(metrics, 'puppeteer');
      return true;
    } else {
      console.log('\n⚠️ No metrics captured with Puppeteer.');
      return false;
    }
    
  } catch (error) {
    if (error.message.includes('socket hang up') || 
        error.message.includes('ECONNRESET') ||
        error.message.includes('read ECONNRESET')) {
      console.log('⚠️ Puppeteer failed with socket error');
      return false;
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
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
    console.error('HTTP method error:', error.message);
    throw error;
  }
}

function saveMetrics(metrics, method) {
  const fs = require('fs');
  const resultsDir = path.join(__dirname, 'results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const resultsFile = path.join(resultsDir, `core-web-vitals-${method}-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    method: method,
    metrics: metrics
  }, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);
}

async function runLighthouse() {
  console.log('🚀 Starting Core Web Vitals collection for: http://localhost:3001');
  
  try {
    // Try Puppeteer first
    const success = await runWithPuppeteer();
    
    if (!success) {
      // Fall back to HTTP
      await runWithHTTP();
    }
    
    console.log('\n✅ Metrics collection completed!');
    
  } catch (error) {
    console.error('❌ Error during collection:', error.message);
    // Try HTTP as last resort
    try {
      console.log('\n🌐 Attempting HTTP fallback...');
      await runWithHTTP();
      console.log('\n✅ Metrics collection completed with fallback!');
    } catch (fallbackError) {
      console.error('❌ All methods failed:', fallbackError.message);
      process.exit(1);
    }
  }
}

runLighthouse();
