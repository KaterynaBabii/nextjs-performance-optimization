// k6 Spike Test
// Sudden traffic spike: 0 → 500 VUs in 10 seconds
// Tests application resilience under sudden load increases

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const ttfbTrend = new Trend('ttfb');
const responseTimeTrend = new Trend('response_time');

// Spike test configuration
export const options = {
  stages: [
    // Baseline: 10 VUs for 10 seconds
    { duration: '10s', target: 10 },
    // Spike: 10 to 500 VUs in 10 seconds
    { duration: '10s', target: 500 },
    // Maintain spike: 500 VUs for 30 seconds
    { duration: '30s', target: 500 },
    // Recovery: 500 to 10 VUs in 10 seconds
    { duration: '10s', target: 10 },
    // Stabilize: 10 VUs for 10 seconds
    { duration: '10s', target: 10 },
  ],
  thresholds: {
    // Allow higher error rate during spike (5%)
    http_req_failed: ['rate<0.05'],
    // Response time may degrade during spike
    http_req_duration: ['p(95)<2000'],
    // TTFB threshold relaxed during spike
    ttfb: ['p(90)<500'],
  },
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Endpoints to test
const endpoints = [
  { name: 'home', url: '/', weight: 40 },
  { name: 'metrics', url: '/metrics', weight: 30 },
  { name: 'api', url: '/api/web-vitals', weight: 30 },
];

// Select endpoint based on weights
function selectEndpoint() {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (const endpoint of endpoints) {
    cumulative += endpoint.weight;
    if (rand <= cumulative) {
      return endpoint;
    }
  }
  return endpoints[0];
}

export default function () {
  const endpoint = selectEndpoint();
  const url = `${BASE_URL}${endpoint.url}`;

  // Make request
  const response = http.get(url, {
    tags: { name: endpoint.name },
    headers: {
      'User-Agent': 'k6-spike-test',
      'Accept': endpoint.url === '/api/web-vitals' ? 'application/json' : 'text/html',
    },
  });

  // Extract TTFB
  const ttfb = response.timings.waiting;
  ttfbTrend.add(ttfb);
  responseTimeTrend.add(response.timings.duration);

  // Check response
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response received': (r) => r.body.length > 0,
  });

  errorRate.add(!success);

  // Minimal think time during spike (users are impatient)
  sleep(Math.random() * 0.5 + 0.1);
}

// Summary output
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/spike-test-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  let summary = '\n=== Spike Test Summary ===\n\n';
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `Avg Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `P95 Response Time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `P99 Response Time: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `Avg TTFB: ${data.metrics.ttfb.values.avg.toFixed(2)}ms\n`;
  summary += `Max TTFB: ${data.metrics.ttfb.values.max.toFixed(2)}ms\n`;
  summary += `VUs Max: ${data.metrics.vus_max.values.max}\n`;
  return summary;
}

