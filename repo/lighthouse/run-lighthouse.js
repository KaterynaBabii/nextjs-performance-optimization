/**
 * Lighthouse Runner - Hybrid Approach
 * 
 * Tries Puppeteer first, falls back to HTTP if socket hang up occurs
 */

const puppeteer = require('puppeteer');
const http = require('http');
const { performance } = require('perf_hooks');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const net = require('net');

// Parse command line arguments
const args = process.argv.slice(2);
const outputArg = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
                  args.find(arg => arg === '--output') && args[args.indexOf('--output') + 1];
const prodFlag = args.includes('--prod'); // build + start prod server
const noFallback = args.includes('--no-fallback'); // do not fall back to HTTP
const webVitalsLocal = args.includes('--web-vitals-local'); // use local web-vitals file if present
const headful = args.includes('--headful'); // launch Puppeteer headful (headless: false)
const puppeteerFirst = args.includes('--puppeteer-first'); // opt-in: try Puppeteer first

async function runWithPuppeteer() {
  console.log('🤖 Attempting with Puppeteer...');
  
  let browser;
  const maxRetries = 2;
  
  // Choose executable paths. Prefer explicit env var, then system Chrome for headful,
  // otherwise prefer Puppeteer's bundled testing Chrome.
  const fs = require('fs');
  const envChrome = process.env.PUPPETEER_EXECUTABLE_PATH;
  const systemChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const bundledChrome = puppeteer.executablePath();

  let chromePaths = [];
  if (envChrome) chromePaths.push(envChrome);
  if (headful) {
    // headful runs: prefer system Chrome then bundled
    chromePaths.push(systemChrome);
    chromePaths.push(bundledChrome);
  } else {
    // headless/new headless: prefer bundled, but keep system as fallback
    chromePaths.push(bundledChrome);
    chromePaths.push(systemChrome);
  }

  // Filter out non-existent paths but keep at least the bundled path
  chromePaths = chromePaths.filter(p => {
    try { return !!(p && fs.existsSync(p)); } catch (e) { return false; }
  });
  if (chromePaths.length === 0) chromePaths = [bundledChrome];
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    for (const chromePath of chromePaths) {
      try {
        // Launch browser with optimized settings
        browser = await puppeteer.launch({
          headless: headful ? false : 'new',
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

    // Try an early addScriptTag of the local web-vitals UMD (best-effort).
    if (webVitalsLocal) {
      try {
        const fs = require('fs');
        const localPath = path.join(__dirname, 'web-vitals.umd.js');
        if (fs.existsSync(localPath)) {
          try {
            await page.addScriptTag({ path: localPath });
            console.log('📝 Early addScriptTag of local web-vitals (pre-navigation) attempted');
          } catch (e) {
            // non-fatal
          }
        }
      } catch (e) {}
    }
    
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
    
    // Inject web-vitals library + bootstrap before navigation if local bundle requested
    if (webVitalsLocal) {
      try {
        const fs = require('fs');
        const localPath = path.join(__dirname, 'web-vitals.umd.js');
        if (fs.existsSync(localPath)) {
          const bundle = fs.readFileSync(localPath, 'utf8');
          // Bootstrap code to register callbacks early and store results on window.__webVitalsResults
          const bootstrap = `
            (function(){
              try{
                if(window.__webVitalsBootstrapDone) return; window.__webVitalsBootstrapDone = true;
                window.__webVitalsResults = { ttfb: null, lcp: null, fid: null, cls: 0 };
                function safeSet(name, val){ try{ window.__webVitalsResults[name] = val }catch(e){} }
                // web-vitals UMD may expose global functions or a 'webVitals' object
                try {
                  if (typeof onTTFB === 'function') {
                    onTTFB(function(m){ safeSet('ttfb', m.value); });
                    onLCP(function(m){ safeSet('lcp', m.value); });
                    onFID(function(m){ safeSet('fid', m.value); });
                    onCLS(function(m){ safeSet('cls', m.value); });
                  } else if (window.webVitals) {
                    try { window.webVitals.getTTFB && window.webVitals.getTTFB(function(m){ safeSet('ttfb', m.value); }); } catch(e){}
                    try { window.webVitals.getLCP && window.webVitals.getLCP(function(m){ safeSet('lcp', m.value); }); } catch(e){}
                    try { window.webVitals.getFID && window.webVitals.getFID(function(m){ safeSet('fid', m.value); }); } catch(e){}
                    try { window.webVitals.getCLS && window.webVitals.getCLS(function(m){ safeSet('cls', m.value); }); } catch(e){}
                  }
                } catch(e){}
              } catch(e){}
            })();
          `;

          // Inject the UMD bundle followed by the bootstrap so listeners exist before any page scripts
          await page.evaluateOnNewDocument(bundle + "\n" + bootstrap);
          console.log('📝 Injected local web-vitals UMD + bootstrap via evaluateOnNewDocument');
        }
      } catch (e) {
        console.warn('⚠️ Failed to inject local web-vitals before navigation:', e.message);
      }
    }

    // Navigate to the app first and wait for full load so LCP can fire
    console.log('🌐 Navigating to page (waiting for load)...');
    await page.goto('http://localhost:3001', { 
      waitUntil: 'load',
      timeout: 60000 
    });

    // If local bundle not injected earlier, try to add script tag (CDN or local)
    console.log('📝 Ensuring web-vitals library is available...');
    try {
      // Check if callbacks are present
      const hasOnTTFB = await page.evaluate(() => typeof onTTFB !== 'undefined');
      if (!hasOnTTFB) {
        // First try: local addScriptTag (attempt earlier and again) — prefer local bundle when available
        let loaded = false;
        if (webVitalsLocal) {
          try {
            const localPath = path.join(__dirname, 'web-vitals.umd.js');
            await page.addScriptTag({ path: localPath });
            await page.waitForFunction(() => typeof onTTFB !== 'undefined', { timeout: 3000 }).catch(() => {});
            loaded = await page.evaluate(() => typeof onTTFB !== 'undefined');
            if (loaded) console.log('✅ Loaded local web-vitals via addScriptTag');
          } catch (e) {
            // ignore — we'll try CDN next
          }
        }

        // Second try: CDN
        if (!loaded) {
          try {
            await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/web-vitals@3/dist/web-vitals.umd.js' });
            await page.waitForFunction(() => typeof onTTFB !== 'undefined', { timeout: 3000 });
            loaded = true;
            console.log('✅ Loaded web-vitals from CDN');
          } catch (e) {
            // fallback to using injected bootstrap / Performance API
            console.warn('⚠️ Could not load web-vitals via addScriptTag (local/CDN), will rely on bootstrap/fallbacks');
          }
        }

        if (!loaded) {
          // final attempt: if web-vitals wasn't added, the evaluateOnNewDocument bootstrap should still provide window.__webVitalsResults
          const hasResults = await page.evaluate(() => !!window.__webVitalsResults).catch(() => false);
          if (hasResults) console.log('ℹ️ Using injected web-vitals bootstrap results');
        }
      } else {
        console.log('✅ web-vitals already available on window');
      }
    } catch (e) {
      console.warn('⚠️ Error while ensuring web-vitals:', e.message);
    }
    
    // Collect metrics using web-vitals if available, otherwise fall back to Performance API
    console.log('⚡ Collecting Core Web Vitals...');
    // Stimulate a realistic user input (click + keyboard) to improve FID capture
    try {
      await page.waitForTimeout(300);
      await page.click('body', { delay: 50 }).catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
      await page.evaluate(() => {
        try {
          const evDown = new PointerEvent('pointerdown', { bubbles: true });
          const evUp = new PointerEvent('pointerup', { bubbles: true });
          document.body.dispatchEvent(evDown);
          document.body.dispatchEvent(evUp);
          const kb = new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' });
          document.body.dispatchEvent(kb);
        } catch (e) {}
      }).catch(() => {});
    } catch (e) {}

    // We'll wait up to 15s for metrics to be available. Prefer the injected web-vitals bootstrap
    const metrics = await page.evaluate(async (timeoutMs) => {
      return await new Promise((resolve) => {
        const collected = { ttfb: null, lcp: null, fid: null, cls: 0 };
        let finished = false;
        const finish = () => { if (!finished) { finished = true; resolve(collected); } };

        // TTFB from Performance API (best-effort)
        try {
          const nav = performance.getEntriesByType('navigation')[0];
          if (nav) collected.ttfb = Math.max(0, nav.responseStart - nav.requestStart);
        } catch (e) {}

        // If our bootstrap populated window.__webVitalsResults, use that
        try {
          if (window.__webVitalsResults) {
            const r = window.__webVitalsResults;
            if (typeof r.ttfb === 'number') collected.ttfb = r.ttfb;
            if (typeof r.lcp === 'number') collected.lcp = r.lcp;
            if (typeof r.fid === 'number') collected.fid = r.fid;
            if (typeof r.cls === 'number') collected.cls = r.cls;
          }
        } catch (e) {}

        // Attach PerformanceObserver fallbacks for metrics that are still missing
        try {
          if (collected.lcp === null) {
            const lcpObserver = new PerformanceObserver((list) => {
              const ents = list.getEntries();
              if (ents.length > 0) collected.lcp = ents[ents.length - 1].renderTime || ents[ents.length - 1].loadTime || ents[ents.length - 1].startTime;
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          }
        } catch (e) {}

        try {
          if (collected.fid === null) {
            const fidObserver = new PerformanceObserver((list) => {
              const ents = list.getEntries();
              if (ents.length > 0) collected.fid = ents[0].processingStart - ents[0].startTime;
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
          }
        } catch (e) {}

        try {
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) collected.cls = (collected.cls || 0) + (entry.value || 0);
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {}

        // If still missing LCP, check existing entries or fall back to navigation timing
        try {
          const existing = performance.getEntriesByType('largest-contentful-paint');
          if (existing && existing.length > 0 && collected.lcp === null) {
            const last = existing[existing.length - 1];
            collected.lcp = last.renderTime || last.loadTime || last.startTime || null;
          }
        } catch (e) {}

        try {
          if ((collected.lcp === null || typeof collected.lcp === 'undefined') && performance.timing) {
            const t = performance.timing;
            if (t.loadEventEnd && t.responseStart) {
              collected.lcp = Math.max(0, t.loadEventEnd - t.responseStart);
            }
          }
        } catch (e) {}

        // Provide a small simulated click to create a natural first-input without busy-loop
        try {
          setTimeout(() => {
            try {
              const rect = document.body.getBoundingClientRect();
              const x = Math.floor((rect.left + rect.right) / 2);
              const y = Math.floor((rect.top + rect.bottom) / 2);
              const evDown = new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y });
              const evUp = new PointerEvent('pointerup', { bubbles: true, clientX: x, clientY: y });
              document.body.dispatchEvent(evDown);
              document.body.dispatchEvent(evUp);
            } catch (e) {}
          }, 200);
        } catch (e) {}

        // Failsafe timeout
        setTimeout(() => finish(), timeoutMs || 15000);
      });
    }, 15000);

    // Use CDP to dispatch input events (stronger simulation that tends to create real First Input entries)
    try {
      const client = await page.target().createCDPSession();
      // Dispatch mouse press/release at page center
      const { width, height } = page.viewport() || { width: 800, height: 600 };
      const x = Math.floor((width || 800) / 2);
      const y = Math.floor((height || 600) / 2);
      await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
      // Dispatch key events
      await client.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 13, code: 'Enter' });
      await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 13, code: 'Enter' });
      // Allow observers to pick up the input
      await page.waitForTimeout(1200);
    } catch (e) {
      // ignore if CDP not available
    }
    
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

function waitForPort(host, port, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      const sock = net.createConnection(port, host);
      let settled = false;
      sock.on('connect', () => {
        settled = true;
        sock.destroy();
        resolve(true);
      });
      sock.on('error', () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) {
          if (!settled) reject(new Error(`Timeout waiting for ${host}:${port}`));
        } else {
          setTimeout(check, 500);
        }
      });
    })();
  });
}

async function ensureProdServer() {
  // Kill any process listening on port 3001 to avoid dev/prod conflicts
  try {
    console.log('🧹 Checking for processes on port 3001...');
    const lsof = spawnSync('lsof', ['-ti', ':3001']);
    if (lsof.status === 0 && lsof.stdout) {
      const pids = lsof.stdout.toString().trim().split(/\s+/).filter(Boolean);
      for (const pid of pids) {
        try {
          process.kill(parseInt(pid, 10), 'SIGTERM');
          console.log(`   Killed existing process ${pid} on port 3001`);
        } catch (e) {
          console.warn(`   Could not kill PID ${pid}: ${e.message}`);
        }
      }
      // Give processes time to exit
      await new Promise(r => setTimeout(r, 800));
    }
  } catch (e) {
    console.warn('Could not check/kill existing processes on port 3001:', e.message);
  }

  // Remove existing .next build directory to ensure a clean production build
  try {
    console.log('🧹 Removing existing .next directory (if any) to ensure clean build)...');
    const rm = spawnSync('rm', ['-rf', path.join(__dirname, '..', '.next')]);
    if (rm.status !== 0 && rm.stderr) {
      console.warn('Warning: could not remove .next directory:', rm.stderr.toString().trim());
    }
  } catch (e) {
    console.warn('Could not remove .next directory:', e.message);
  }

  // Build first (blocking)
  console.log('🏗️  Building production app (npm run build)...');
  const build = spawnSync('npm', ['run', 'build'], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  if (build.status !== 0) throw new Error('npm run build failed');

  // Start production server in background
  console.log('🚀 Starting production server (npm run start)...');
  const start = spawn('npm', ['run', 'start'], { cwd: path.join(__dirname, '..'), env: { ...process.env }, stdio: 'ignore', detached: true });
  // Detach so we can kill later by PID
  start.unref();
  const pid = start.pid;
  console.log(`   Prod server PID: ${pid}`);

  // Wait for port 3001
  await waitForPort('127.0.0.1', 3001, 30000);

  // Warm the server with a few HTTP requests
  console.log('♨️  Warming server with a few requests...');
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      const req = http.get('http://localhost:3001', () => {
        resolve();
      });
      req.on('error', () => resolve());
    });
    await new Promise(r => setTimeout(r, 500));
  }

  return pid;
}

function saveMetrics(metrics, method) {
  const fs = require('fs');
  const resultsDir = path.join(__dirname, 'results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Use provided output path, or default to lighthouse-run-XXX.json naming
  let resultsFile;
  let runIndex = 0;
  
  if (outputArg) {
    // Custom output path provided
    resultsFile = path.isAbsolute(outputArg) 
      ? outputArg 
      : path.join(resultsDir, path.basename(outputArg));
    // Extract runIndex from filename if possible
    const match = path.basename(outputArg).match(/lighthouse-run-(\d+)\.json/);
    if (match) {
      runIndex = parseInt(match[1], 10) - 1; // Convert 001 -> 0, 002 -> 1, etc.
    }
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
    runIndex = nextNumber - 1; // Convert 001 -> 0, 002 -> 1, etc.
    resultsFile = path.join(resultsDir, `lighthouse-run-${String(nextNumber).padStart(3, '0')}.json`);
  }
  
  // Create a Lighthouse-style `audits` object and legacy fields only
  const audits = {};
  // server-response-time (TTFB)
  if (typeof metrics.ttfb !== 'undefined' && metrics.ttfb !== null) {
    const ttfbVal = Math.round(metrics.ttfb);
    audits['server-response-time'] = { numericValue: ttfbVal, displayValue: `${ttfbVal} ms` };
  } else {
    audits['server-response-time'] = { numericValue: null, displayValue: 'N/A' };
  }
  // largest-contentful-paint (ms)
  if (typeof metrics.lcp !== 'undefined' && metrics.lcp !== null) {
    const lcpVal = Math.round(metrics.lcp);
    audits['largest-contentful-paint'] = { numericValue: lcpVal, displayValue: `${(lcpVal / 1000).toFixed(2)} s` };
  } else {
    audits['largest-contentful-paint'] = { numericValue: null, displayValue: 'N/A' };
  }
  // max-potential-fid (ms)
  if (typeof metrics.fid !== 'undefined' && metrics.fid !== null) {
    const fidVal = Math.round(metrics.fid);
    audits['max-potential-fid'] = { numericValue: fidVal, displayValue: `${fidVal} ms` };
  } else {
    audits['max-potential-fid'] = { numericValue: null, displayValue: 'N/A' };
  }
  // cumulative-layout-shift (unitless) — default to 0 when not observed
  // Normalize CLS: prefer a finite number, default to 0. Keep three decimals.
  let clsVal = 0;
  if (typeof metrics.cls !== 'undefined' && metrics.cls !== null) {
    const parsed = Number(metrics.cls);
    if (Number.isFinite(parsed)) clsVal = parsed;
  }
  // Round to 3 decimals for presentation
  clsVal = Math.round(clsVal * 1000) / 1000;
  audits['cumulative-layout-shift'] = { numericValue: clsVal, displayValue: `${clsVal}` };

  const outputObj = {
    audits: audits,
    fetchTime: new Date().toISOString(),
    runIndex: (() => {
      const m = resultsFile.match(/lighthouse-run-(\d+)\.json$/);
      return m ? (parseInt(m[1], 10) - 1) : undefined;
    })()
  };

  fs.writeFileSync(resultsFile, JSON.stringify(outputObj, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);
}

async function runLighthouse() {
  console.log('🚀 Starting Core Web Vitals collection for: http://localhost:3001');
  
  let puppeteerSuccess = false;
  let httpSuccess = false;
  // By default, run the canonical Lighthouse CLI first to ensure devtools throttling
  // and emulation match the reproducibility notes (this reproduces earlier
  // `lighthouse-run-0XX.json` outputs). Use `--puppeteer-first` to reverse.
  if (!puppeteerFirst) {
    try {
      const cliOk = await runLighthouseCLI();
      if (cliOk) {
        console.log('✅ Lighthouse CLI produced canonical results — exiting early.');
        return;
      }
    } catch (err) {
      console.warn('⚠️ Lighthouse CLI attempt failed, falling back to Puppeteer:', err.message || String(err));
    }
  }


  // Try Puppeteer (either because CLI failed or user requested Puppeteer-first)
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
  
  if (!puppeteerSuccess) {
    // As an intermediate fallback, run the canonical Lighthouse CLI with the
    // repository's reproducible throttling config. This often reproduces the
    // earlier `lighthouse-run-0XX.json` outputs (devtools throttling, mobile emulation).
    try {
      const cliOk = await runLighthouseCLI();
      if (cliOk) {
        console.log('✅ Lighthouse CLI produced a canonical JSON and we saved legacy output.');
      } else {
        // Fall back to simple HTTP metrics collection
        try {
          httpSuccess = await runWithHTTP();
        } catch (error) {
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
    } catch (err) {
      console.warn('⚠️ Lighthouse CLI fallback failed:', err.message || String(err));
      try {
        httpSuccess = await runWithHTTP();
      } catch (error) {
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
  }
  
  if (puppeteerSuccess || httpSuccess) {
    console.log('\n✅ Metrics collection completed!');
  } else {
    console.error('\n❌ All methods failed. Please start your server and try again.');
    process.exit(1);
  }
}

runLighthouse();

// Run Lighthouse CLI (npx lighthouse ...) using the repo's lighthouse config
// Saves the canonical lighthouse JSON into tests/metrics/results and converts
// it to the legacy-format file in `lighthouse/results`.
async function runLighthouseCLI() {
  const fs = require('fs');
  const spawnSync = require('child_process').spawnSync;
  const resultsDir = path.join(__dirname, '..', 'tests', 'metrics', 'results');
  try {
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
  } catch (e) {}

  // Determine next sequential filename (lh-run-001.json, lh-run-002.json, ...)
  const existing = fs.readdirSync(resultsDir)
    .filter(f => f.startsWith('lh-run-') && f.endsWith('.json'))
    .map(f => {
      const m = f.match(/lh-run-(\d+)\.json$/);
      return m ? parseInt(m[1], 10) : null;
    })
    .filter(n => Number.isInteger(n))
    .sort((a, b) => a - b);

  const nextNumber = existing.length > 0 ? (existing[existing.length - 1] + 1) : 1;
  const outName = `lh-run-${String(nextNumber).padStart(3, '0')}.json`;
  const outPath = path.join(resultsDir, outName);
  const configPath = path.join('tests', 'metrics', 'lighthouse-config.json');

  console.log('🛠️  Running Lighthouse CLI for canonical devtools-throttled run...');
  const args = [
    'lighthouse',
    'http://localhost:3001',
    `--config-path=${configPath}`,
    '--output=json',
    `--output-path=${outPath}`,
    '--quiet',
    '--throttling-method=devtools',
    '--chrome-flags=--no-sandbox'
  ];

  const npx = spawnSync('npx', args, { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  if (npx.status !== 0) {
    throw new Error('Lighthouse CLI (npx) failed');
  }

  // Read produced Lighthouse JSON
  if (!fs.existsSync(outPath)) {
    throw new Error('Lighthouse CLI did not produce expected JSON at ' + outPath);
  }

  const json = JSON.parse(fs.readFileSync(outPath, 'utf8'));

  // Map canonical audits to our legacy shape
  const audits = json.audits || {};
  const metrics = {};
  // server-response-time may exist as an audit
  // Helper: robust numeric extractor for audits
  function extractNumeric(audit) {
    if (!audit) return undefined;
    // numericValue preferred
    if (typeof audit.numericValue === 'number' && Number.isFinite(audit.numericValue)) return audit.numericValue;
    // try details.newEngineResult.cumulativeLayoutShift or similar
    try {
      if (audit.details && audit.details.newEngineResult && typeof audit.details.newEngineResult.cumulativeLayoutShift === 'number') {
        return audit.details.newEngineResult.cumulativeLayoutShift;
      }
    } catch (e) {}
    // try items array entries
    try {
      if (audit.details && Array.isArray(audit.details.items)) {
        for (const it of audit.details.items) {
          if (it && it.newEngineResult && typeof it.newEngineResult.cumulativeLayoutShift === 'number') return it.newEngineResult.cumulativeLayoutShift;
          if (it && typeof it.cumulativeLayoutShift === 'number') return it.cumulativeLayoutShift;
          if (it && typeof it.cumulativeLayoutShiftMainFrame === 'number') return it.cumulativeLayoutShiftMainFrame;
        }
      }
    } catch (e) {}
    // parse numeric from displayValue like "0.08" or "0.08 " or "0.08 (something)"
    try {
      if (audit.displayValue) {
        const m = String(audit.displayValue).match(/([0-9]+(?:\.[0-9]+)?)/);
        if (m) return Number(m[1]);
      }
    } catch (e) {}
    return undefined;
  }

  // server-response-time
  if (audits['server-response-time']) {
    metrics.ttfb = extractNumeric(audits['server-response-time']);
  }
  // largest-contentful-paint
  if (audits['largest-contentful-paint']) {
    metrics.lcp = extractNumeric(audits['largest-contentful-paint']);
  }
  // max-potential-fid
  if (audits['max-potential-fid']) {
    metrics.fid = extractNumeric(audits['max-potential-fid']);
  }
  // cumulative-layout-shift
  if (audits['cumulative-layout-shift']) {
    metrics.cls = extractNumeric(audits['cumulative-layout-shift']);
  }

  // Save using existing saveMetrics function (it will write into lighthouse/results)
  saveMetrics({ ttfb: metrics.ttfb, lcp: metrics.lcp, fid: metrics.fid, cls: metrics.cls }, 'lighthouse-cli');
  return true;
}
