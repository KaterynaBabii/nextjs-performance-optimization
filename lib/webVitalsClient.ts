/**
 * Web Vitals Client Collector
 * 
 * Subscribes to web-vitals library events and sends metrics to the API
 */

import { onCLS, onFID, onLCP, onTTFB, Metric } from 'web-vitals';
import type { MetricSample } from './metrics';

/**
 * Send a metric to the API endpoint
 */
async function sendMetricToAPI(metric: Metric): Promise<void> {
  try {
    const metricSample: MetricSample = {
      name: metric.name as 'TTFB' | 'LCP' | 'FID' | 'CLS',
      value: metric.value,
      id: metric.id,
      delta: metric.delta,
      rating: metric.rating,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
    };

    // Log to console for debugging
    console.log('[Web Vitals]', metricSample.name, metricSample.value, {
      rating: metricSample.rating,
      delta: metricSample.delta,
    });

    // Send to API
    const response = await fetch('/api/web-vitals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metricSample),
    });

    if (!response.ok) {
      console.error('[Web Vitals] Failed to send metric:', response.statusText);
    }
  } catch (error) {
    console.error('[Web Vitals] Error sending metric:', error);
  }
}

/**
 * Initialize web vitals collection
 * Call this from a client component (e.g., in app/page.tsx or a client component)
 */
export function reportWebVitals(): void {
  // Only run in browser
  if (typeof window === 'undefined') return;
  
  // Ensure we're in a browser environment with all required APIs
  if (!window.document || !window.fetch) return;

  // Subscribe to all Core Web Vitals
  // Wrap in try-catch to prevent errors from breaking the app
  try {
    onTTFB(sendMetricToAPI);
    onLCP(sendMetricToAPI);
    onFID(sendMetricToAPI);
    onCLS(sendMetricToAPI);
  } catch (error) {
    console.warn('[Web Vitals] Error initializing web vitals:', error);
  }
}

