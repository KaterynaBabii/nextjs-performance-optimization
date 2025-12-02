/**
 * Core Web Vitals Collection Script
 * 
 * Collects TTFB, LCP, FID, and CLS metrics in a browser environment
 * and sends them to the API endpoint for storage.
 * 
 * Usage:
 *   - Run in browser console, or
 *   - Include in a test page, or
 *   - Use with Puppeteer/Playwright
 */

// Import web-vitals library (assumes it's available globally or via CDN)
// For Node.js/Puppeteer: use dynamic import or inject script tag

const API_ENDPOINT = 'http://localhost:3000/api/web-vitals';

/**
 * Collect Core Web Vitals using web-vitals library
 * Sends metrics to API endpoint
 */
async function collectWebVitals() {
  // Check if web-vitals is available
  if (typeof window === 'undefined') {
    console.error('This script must run in a browser environment');
    return;
  }

  // Dynamically import web-vitals if not already loaded
  let webVitals;
  if (typeof onTTFB !== 'undefined') {
    // web-vitals already loaded
    webVitals = { onTTFB, onLCP, onFID, onCLS };
  } else {
    // Try to load from CDN or import
    try {
      // For browser: assume script tag loads web-vitals
      // <script src="https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js"></script>
      if (window.webVitals) {
        webVitals = window.webVitals;
      } else {
        console.error('web-vitals library not found. Load it via CDN or npm.');
        return;
      }
    } catch (error) {
      console.error('Error loading web-vitals:', error);
      return;
    }
  }

  const collectedMetrics = {
    ttfb: null,
    lcp: null,
    fid: null,
    cls: null,
  };

  /**
   * Send metric to API
   */
  async function sendMetric(metric) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: metric.name,
          value: metric.value,
          id: metric.id,
          delta: metric.delta,
          rating: metric.rating,
          navigationType: metric.navigationType,
          timestamp: Date.now(),
        }),
      });

      if (response.ok) {
        console.log(`✓ ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
        collectedMetrics[metric.name.toLowerCase()] = metric.value;
      } else {
        console.error(`✗ Failed to send ${metric.name}:`, response.statusText);
      }
    } catch (error) {
      console.error(`✗ Error sending ${metric.name}:`, error);
    }
  }

  // Subscribe to all Core Web Vitals
  webVitals.onTTFB(sendMetric);
  webVitals.onLCP(sendMetric);
  webVitals.onFID(sendMetric);
  webVitals.onCLS(sendMetric);

  console.log('Core Web Vitals collection started...');
  console.log('Interact with the page to generate FID events.');

  // Return promise that resolves when all metrics are collected
  return new Promise((resolve) => {
    const checkComplete = setInterval(() => {
      if (collectedMetrics.ttfb && collectedMetrics.lcp && collectedMetrics.fid && collectedMetrics.cls) {
        clearInterval(checkComplete);
        resolve(collectedMetrics);
      }
    }, 1000);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkComplete);
      console.log('Collection timeout. Collected:', collectedMetrics);
      resolve(collectedMetrics);
    }, 30000);
  });
}

/**
 * Standalone version for browser console
 * Includes web-vitals via CDN if not present
 */
async function initWebVitalsCollection() {
  // Load web-vitals from CDN if not available
  if (typeof onTTFB === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js';
    script.onload = () => {
      console.log('web-vitals loaded from CDN');
      window.webVitals = { onTTFB, onLCP, onFID, onCLS };
      collectWebVitals();
    };
    script.onerror = () => {
      console.error('Failed to load web-vitals from CDN');
    };
    document.head.appendChild(script);
  } else {
    collectWebVitals();
  }
}

// Export for use in Node.js/Puppeteer
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { collectWebVitals, initWebVitalsCollection };
}

// Auto-run if in browser and script is loaded directly
if (typeof window !== 'undefined' && document.readyState === 'complete') {
  initWebVitalsCollection();
} else if (typeof window !== 'undefined') {
  window.addEventListener('load', initWebVitalsCollection);
}

/**
 * Puppeteer/Playwright usage example:
 * 
 * const puppeteer = require('puppeteer');
 * const { collectWebVitals } = require('./collect-core-web-vitals.js');
 * 
 * (async () => {
 *   const browser = await puppeteer.launch();
 *   const page = await browser.newPage();
 *   
 *   // Inject web-vitals script
 *   await page.addScriptTag({ url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js' });
 *   
 *   // Navigate and collect
 *   await page.goto('http://localhost:3000');
 *   await page.evaluate(collectWebVitals);
 *   
 *   // Wait for metrics
 *   await page.waitForTimeout(5000);
 *   
 *   await browser.close();
 * })();
 */

