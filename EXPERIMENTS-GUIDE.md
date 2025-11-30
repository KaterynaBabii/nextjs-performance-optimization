# How to Run Experiments

Complete guide for running all performance experiments in this project.

## Prerequisites

### Required Tools
- **Node.js 18+**
- **k6** (for load testing): [Install k6](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- **Artillery** (optional, for load testing): `npm install -g artillery`
- **Python 3.8+** (for AI model training)

### Install Dependencies
```bash
# Main application
cd repo
npm install

# Root app (if needed)
cd ..
npm install
```

## Experiment Types

This project includes three main experiment scenarios:

1. **Baseline (Unoptimized)**: Standard Next.js app without optimizations
2. **Optimized (ISR + Edge)**: With ISR, Edge Middleware, and basic prefetching
3. **AI-Enhanced (with Prefetching)**: With LSTM predictive prefetching

## Running Experiments

### 1. Load Testing Experiments

#### k6 Ramp Test
Gradual load increase to test system behavior under increasing load.

```bash
cd repo/tests/load

# Run single test
k6 run k6-ramp.js

# Run 10 tests (for statistical significance)
for i in {1..10}; do
  echo "Running test $i..."
  k6 run k6-ramp.js --out json=results/k6-ramp/k6-run-$(printf "%03d" $i).json
done
```

#### k6 Spike Test
Sudden load spike (100 → 500 RPS) to test system resilience.

```bash
cd repo/tests/load

# Run single test
k6 run k6-spike.js

# Run 10 tests
for i in {1..10}; do
  echo "Running test $i..."
  k6 run k6-spike.js --out json=results/k6-spike/k6-run-$(printf "%03d" $i).json
done
```

#### Artillery Spike Test
Alternative spike test using Artillery.

```bash
cd repo/tests/load

# Run single test
artillery run artillery-spike.yml

# Run 10 tests (requires custom script)
for i in {1..10}; do
  echo "Running test $i..."
  artillery run artillery-spike.yml --output results/artillery-spike/artillery-run-$(printf "%03d" $i).json
done
```

### 2. Core Web Vitals Collection

#### Lighthouse Tests
Automated Lighthouse runs for Core Web Vitals.

```bash
cd repo

# Run single Lighthouse test
npm run lighthouse

# Or manually
node lighthouse/run-lighthouse.js

# Run 30 tests (for statistical analysis)
for i in {1..30}; do
  echo "Running Lighthouse test $i..."
  node lighthouse/run-lighthouse.js --output lighthouse/results/lighthouse-run-$(printf "%03d" $i).json
done
```

#### Manual Core Web Vitals Collection
1. Start the application:
   ```bash
   cd repo
   npm run dev
   ```

2. Navigate to `http://localhost:3000`
3. Open DevTools → Performance tab
4. Record performance
5. Check Core Web Vitals in the console
6. Metrics are automatically sent to `/api/web-vitals`

#### Automated Metrics Collection
```bash
cd repo/tests/metrics

# Run metrics collection script
node collect-core-web-vitals.js

# This will:
# - Visit pages multiple times
# - Collect TTFB, LCP, FID, CLS
# - Save results to results/ directory
```

### 3. AI Model Evaluation

#### Train the Model
```bash
cd repo/ai-model

# Prepare dataset
python3 dataset-prep.py --output ./data --mock-sessions 10000

# Train model (Jupyter Notebook)
jupyter notebook lstm-train.ipynb

# Or use Python script
python3 train-model.py
```

#### Evaluate Model Performance
```bash
cd repo/ai-model

# Run evaluation
python3 evaluation.py

# This outputs:
# - Precision@3
# - Recall@3
# - F1-score
```

### 4. Statistical Analysis

#### Analyze Single Experiment
```bash
cd repo/analysis

# Analyze Lighthouse results
node analyze-metrics.js ../lighthouse/results ./results

# Analyze load test results
node analyze-metrics.js ../tests/load/results/k6-ramp ./results
```

#### Analyze All Experiments
```bash
cd repo/analysis

# Run comprehensive analysis
node analyze-all-experiments.js

# This generates:
# - all-experiments-summary.json
# - all-experiments-comparison.csv
# - all-experiments-report.html
```

#### View Results
```bash
cd repo/analysis/results/all-experiments

# View CSV comparison
cat all-experiments-comparison.csv

# View HTML report (open in browser)
open all-experiments-report.html

# View JSON summary
cat all-experiments-summary.json | jq
```

## Complete Experiment Workflow

### Step 1: Prepare Environment
```bash
cd repo
npm install
npm run build  # Build production version
```

### Step 2: Run Baseline Experiments

1. **Disable optimizations** in code (or use baseline branch)
2. **Start production server**:
   ```bash
   npm run start
   ```

3. **Run load tests**:
   ```bash
   cd tests/load
   # Run k6 tests
   for i in {1..10}; do
     k6 run k6-ramp.js --out json=results/baseline/k6-ramp/k6-run-$(printf "%03d" $i).json
   done
   ```

4. **Collect metrics**:
   ```bash
   cd tests/metrics
   # Run 30 Lighthouse tests
   for i in {1..30}; do
     node collect-core-web-vitals.js --output results/baseline/lighthouse-run-$(printf "%03d" $i).json
   done
   ```

### Step 3: Run Optimized Experiments

1. **Enable ISR and Edge Middleware** (should be enabled by default)
2. **Restart server**:
   ```bash
   npm run start
   ```

3. **Run same tests**:
   ```bash
   # Load tests
   cd tests/load
   for i in {1..10}; do
     k6 run k6-ramp.js --out json=results/optimized/k6-ramp/k6-run-$(printf "%03d" $i).json
   done

   # Metrics
   cd ../metrics
   for i in {1..30}; do
     node collect-core-web-vitals.js --output results/optimized/lighthouse-run-$(printf "%03d" $i).json
   done
   ```

### Step 4: Run AI-Enhanced Experiments

1. **Enable prefetching**:
   - Uncomment prefetch code in `app/middleware.ts`
   - Uncomment `<PrefetchClient />` in `app/layout.tsx`

2. **Restart server**:
   ```bash
   npm run start
   ```

3. **Run same tests**:
   ```bash
   # Load tests
   cd tests/load
   for i in {1..10}; do
     k6 run k6-ramp.js --out json=results/ai-enhanced/k6-ramp/k6-run-$(printf "%03d" $i).json
   done

   # Metrics
   cd ../metrics
   for i in {1..30}; do
     node collect-core-web-vitals.js --output results/ai-enhanced/lighthouse-run-$(printf "%03d" $i).json
   done
   ```

### Step 5: Analyze Results

```bash
cd repo/analysis

# Analyze all experiments
node analyze-all-experiments.js

# View results
open results/all-experiments/all-experiments-report.html
```

## Quick Commands

### Using npm scripts (if available)
```bash
cd repo

# Load testing
npm run test:load      # k6 ramp test
npm run test:spike     # k6 spike test

# Metrics
npm run lighthouse     # Run Lighthouse
npm run wpt            # Run WebPageTest

# Analysis
npm run analyze        # Analyze metrics
```

## Expected Results Structure

After running experiments, you should have:

```
repo/
├── tests/
│   ├── load/
│   │   └── results/
│   │       ├── baseline/
│   │       ├── optimized/
│   │       └── ai-enhanced/
│   └── metrics/
│       └── results/
│           ├── baseline/        # 30 Lighthouse runs
│           ├── optimized/      # 30 Lighthouse runs
│           └── ai-enhanced/    # 30 Lighthouse runs
│
└── analysis/
    └── results/
        └── all-experiments/
            ├── all-experiments-summary.json
            ├── all-experiments-comparison.csv
            └── all-experiments-report.html
```

## Troubleshooting

### k6 Not Found
```bash
# Install k6
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Server Not Running
Make sure the Next.js server is running before load tests:
```bash
cd repo
npm run start
# Keep this running in one terminal
```

### Port Already in Use
```bash
# Kill process on port 3000
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run start
```

## Experiment Configuration

### Load Test Parameters
Edit test files to adjust:
- **Ramp duration**: `k6-ramp.js` - `stages` array
- **Spike intensity**: `k6-spike.js` - `stages` array
- **Target URLs**: Update `url` in test files

### Metrics Collection
- **Number of runs**: Change loop count (30 recommended for CI)
- **Pages to test**: Edit `collect-core-web-vitals.js`
- **Throttling**: Configure in Lighthouse config

## Best Practices

1. **Run 30+ iterations** for statistical significance
2. **Use production build** (`npm run build && npm run start`)
3. **Clear cache** between experiment scenarios
4. **Document environment** (CPU, RAM, Node version)
5. **Save raw results** before analysis
6. **Compare against baseline** consistently

## Next Steps

After running experiments:
1. Review `all-experiments-report.html`
2. Check `all-experiments-comparison.csv` for metrics
3. Analyze statistical significance (95% CI)
4. Document findings
5. Compare against reference values

