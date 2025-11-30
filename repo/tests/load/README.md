# Load Testing Suite

This directory contains load testing scripts for evaluating Next.js application performance under various traffic patterns.

## Overview

The load testing suite includes:
- **Artillery**: Spike test with Pareto distribution
- **k6**: Ramp-up/ramp-down and spike tests
- Custom metrics tracking (TTFB, response times, error rates)

## Prerequisites

### Install Artillery

```bash
npm install -g artillery
```

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415C3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
Download from [k6.io](https://k6.io/docs/getting-started/installation/)

## Test Configurations

### Artillery Spike Test

**File:** `artillery-spike.yml`

**Configuration:**
- Warm-up: 100 RPS for 10 seconds
- Spike: 500 RPS for 30 seconds
- Recovery: 100 RPS for 20 seconds
- Think time: 1-3 seconds (Pareto distribution)

**Run:**
```bash
artillery run artillery-spike.yml --output results/artillery-spike.json
```

**View results:**
```bash
artillery report results/artillery-spike.json
```

### k6 Ramp Test

**File:** `k6-ramp.js`

**Configuration:**
- Ramp-up: 0 → 100 VUs over 30 seconds
- Maintain: 100 VUs for 30 seconds
- Ramp-down: 100 → 0 VUs over 20 seconds
- Think time: Variable (1-8 seconds, weighted distribution)

**Run:**
```bash
k6 run k6-ramp.js
```

**With custom base URL:**
```bash
BASE_URL=http://localhost:3000 k6 run k6-ramp.js
```

**Output:**
- Console summary
- `results/ramp-test-summary.json`

### k6 Spike Test

**File:** `k6-spike.js`

**Configuration:**
- Baseline: 10 VUs for 10 seconds
- Spike: 10 → 500 VUs in 10 seconds
- Maintain: 500 VUs for 30 seconds
- Recovery: 500 → 10 VUs in 10 seconds
- Stabilize: 10 VUs for 10 seconds

**Run:**
```bash
k6 run k6-spike.js
```

**Output:**
- Console summary
- `results/spike-test-summary.json`

## Test Scenarios

All tests simulate three types of requests:

1. **Home Page** (40% weight): `GET /`
2. **Metrics Dashboard** (30% weight): `GET /metrics`
3. **API Endpoint** (30% weight): `GET /api/web-vitals`

## Metrics Collected

### Standard Metrics
- **HTTP Requests**: Total count, rate
- **Response Time**: Average, p95, p99
- **Error Rate**: Percentage of failed requests
- **Virtual Users**: Concurrent users at peak

### Custom Metrics
- **TTFB (Time to First Byte)**: Server response time
- **Response Time Trend**: Distribution of response times
- **Error Rate**: Failed request percentage

## Thresholds

### k6 Ramp Test
- 95% of requests < 500ms
- Error rate < 1%
- TTFB p90 < 200ms

### k6 Spike Test (Relaxed)
- Error rate < 5% (allows degradation during spike)
- Response time p95 < 2000ms
- TTFB p90 < 500ms

## Results Directory

Create a `results/` directory to store test outputs:

```bash
mkdir -p results
```

## Interpreting Results

### Good Performance Indicators
- ✅ Error rate < 1% under normal load
- ✅ Response time p95 < 500ms
- ✅ TTFB p90 < 200ms
- ✅ No memory leaks (stable response times over time)

### Performance Degradation Indicators
- ❌ Error rate > 5% during spike
- ❌ Response time p95 > 2000ms
- ❌ TTFB > 500ms consistently
- ❌ Increasing response times over time (memory leak)

## Running All Tests

### Quick Test Suite

```bash
# Create results directory
mkdir -p results

# Run all k6 tests
echo "Running k6 ramp test..."
k6 run k6-ramp.js

echo "Running k6 spike test..."
k6 run k6-spike.js

# Run Artillery test
echo "Running Artillery spike test..."
artillery run artillery-spike.yml --output results/artillery-spike.json
artillery report results/artillery-spike.json
```

### Full Test Suite Script

Create `run-all-tests.sh`:

```bash
#!/bin/bash

BASE_URL=${1:-http://localhost:3000}
RESULTS_DIR="results/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RESULTS_DIR"

echo "Starting load tests against $BASE_URL"
echo "Results will be saved to $RESULTS_DIR"

# k6 Ramp Test
echo "Running k6 ramp test..."
BASE_URL=$BASE_URL k6 run k6-ramp.js --out json="$RESULTS_DIR/k6-ramp.json"

# k6 Spike Test
echo "Running k6 spike test..."
BASE_URL=$BASE_URL k6 run k6-spike.js --out json="$RESULTS_DIR/k6-spike.json"

# Artillery Spike Test
echo "Running Artillery spike test..."
artillery run artillery-spike.yml --output "$RESULTS_DIR/artillery-spike.json"
artillery report "$RESULTS_DIR/artillery-spike.json"

echo "All tests completed. Results in $RESULTS_DIR"
```

Make executable and run:
```bash
chmod +x run-all-tests.sh
./run-all-tests.sh http://localhost:3000
```

## Best Practices

1. **Warm up the application** before running tests
2. **Monitor server resources** (CPU, memory, network) during tests
3. **Run tests multiple times** for statistical significance
4. **Test in production-like environment** when possible
5. **Compare results** before and after optimizations

## Troubleshooting

### k6: "Cannot find module"
- Ensure k6 is installed: `k6 version`
- Check script paths are correct

### Artillery: "Connection refused"
- Ensure Next.js dev server is running: `npm run dev`
- Check BASE_URL is correct

### High error rates
- Check server logs for errors
- Verify server has enough resources
- Consider reducing load in test configuration

## References

- [k6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Load Testing Best Practices](https://k6.io/docs/test-types/load-testing/)

