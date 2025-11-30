/**
 * Lighthouse/Puppeteer Runner
 * 
 * This script uses Puppeteer to launch a headless Chrome browser, 
 * navigate to the application, and collect Core Web Vitals.
 */

const puppeteer = require('puppeteer');
const { collectWebVitals } = require('../../tests/metrics/collect-core-web-vitals.js');

const APP_URL = process.env.APP_URL || 'http://localhost:3001';

(async () => {
  console.log(`🚀 Starting Core Web Vitals collection for: ${APP_URL}`);

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Inject the web-vitals library into the page
    await page.addScriptTag({ url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js' });

    // Navigate to the app and wait for it to load
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });

    console.log('Page loaded. Collecting metrics for 15 seconds...');

    // Run the collection script in the browser context
    await page.evaluate(collectWebVitals);

    // Wait for a few seconds to allow metrics (like FID) to be collected
    await new Promise(resolve => setTimeout(resolve, 15000));

    console.log('✅ Metrics collection finished.');

  } catch (error) {
    console.error('❌ An error occurred during metrics collection:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
