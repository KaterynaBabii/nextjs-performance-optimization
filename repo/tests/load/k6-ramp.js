// k6 Ramp-Up and Ramp-Down Load Test
// Gradually increases load, maintains peak, then ramps down
// Tests application behavior under gradually increasing load

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const ttfbTrend = new Trend('ttfb');
const responseTimeTrend = new Trend('response_time');

// Test configuration
export const options = {
  stages: [
    // Ramp-up: 0 to 100 VUs over 30 seconds
    { duration: '30s', target: 100 },
    // Maintain 100 VUs for 30 seconds
    { duration: '30s', target: 100 },
    // Ramp-down: 100 to 0 VUs over 20 seconds
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    // 95% of requests must complete below 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate must be below 1%
    errors: ['rate<0.01'],
    // TTFB should be below 200ms for 90% of requests
    ttfb: ['p(90)<200'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test scenarios with weights
const scenarios = [
  { name: 'home', url: '/', weight: 40 },
  { name: 'metrics', url: '/metrics', weight: 30 },
  { name: 'api', url: '/api/web-vitals', weight: 30 },
];

// Think time distribution (Pareto-like: most users wait 1-2s, some wait longer)
function thinkTime() {
  const rand = Math.random();
  if (rand < 0.7) {
    // 70% of users: 1-2 seconds
    return Math.random() * 1000 + 1000;
  } else if (rand < 0.9) {
    // 20% of users: 2-4 seconds
    return Math.random() * 2000 + 2000;
  } else {
    // 10% of users: 4-8 seconds
    return Math.random() * 4000 + 4000;
  }
}

// Select scenario based on weights
function selectScenario() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (rand <= cumulative) {
      return scenario;
    }
  }
  return scenarios[0];
}

export default function () {
  const scenario = selectScenario();
  const url = `${BASE_URL}${scenario.url}`;

  // Make request
  const response = http.get(url, {
    tags: { name: scenario.name },
    headers: {
      'User-Agent': 'k6-load-test',
      'Accept': scenario.url === '/api/web-vitals' ? 'application/json' : 'text/html',
    },
  });

  // Extract TTFB from response timing
  const ttfb = response.timings.waiting;
  ttfbTrend.add(ttfb);
  responseTimeTrend.add(response.timings.duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
    'content type correct': (r) => {
      if (scenario.url === '/api/web-vitals') {
        return r.headers['Content-Type']?.includes('application/json');
      }
      return r.headers['Content-Type']?.includes('text/html');
    },
  });

  errorRate.add(!success);

  // Think time (simulate user reading/thinking)
  sleep(thinkTime() / 1000);
}

// Summary function for custom metrics
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/ramp-test-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  let summary = '\n=== Load Test Summary ===\n\n';
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `Avg TTFB: ${data.metrics.ttfb.values.avg.toFixed(2)}ms\n`;
  summary += `P90 TTFB: ${data.metrics.ttfb.values['p(90)'].toFixed(2)}ms\n`;
  return summary;
}

