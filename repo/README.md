# Next.js Performance Optimization - Complete Reproducibility Package

This repository contains the complete reproducibility package for the IEEE Access paper:

**"Performance Optimization Strategies for Large-scale Web Applications using Next.js"**

## 📋 Repository Structure

```
repo/
├── app/                         # Next.js prototype application
│   ├── page.tsx                # Home page (ISR)
│   ├── category/[id]/page.tsx  # Category page (ISR + filters)
│   ├── product/[id]/page.tsx   # Product page (SSR)
│   ├── profile/page.tsx        # Profile page (SSR)
│   ├── api/                    # API routes
│   │   ├── products/route.ts
│   │   ├── categories/route.ts
│   │   ├── user/route.ts
│   │   └── prefetch/route.ts   # AI model inference endpoint
│   ├── middleware.ts           # Edge middleware (geolocation, A/B testing, prefetch)
│   └── layout.tsx
│
├── ai-model/                    # LSTM Predictive Prefetching
│   ├── dataset-prep.py         # Data preprocessing (context size = 5)
│   ├── lstm-train.ipynb        # Model training (Embedding=128, LSTM(64)→LSTM(32))
│   ├── evaluation.py           # Precision@3, Recall@3, F1-score
│   ├── predict.js              # TensorFlow.js inference
│   └── prefetch-service.ts     # Next.js integration
│
├── tests/                       # Testing suite
│   ├── load/                   # Load testing (k6, Artillery)
│   ├── metrics/                # Core Web Vitals collection
│   ├── ai-model/               # Model evaluation tests
│   └── environment/           # System information
│
├── analysis/                    # Statistical analysis
│   ├── analyze-metrics.js      # Mean, SD, 95% CI calculations
│   └── table3-example.csv      # Example results table
│
├── lighthouse/                  # Lighthouse CI setup
│   ├── .lighthouserc.json
│   └── run-lighthouse.js
│
├── wpt/                         # WebPageTest integration
│   ├── wpt-run.js
│   └── config.json
│
├── data/                        # Data generation
│   └── synthetic-clickstream-generator.py
│
└── lib/                         # Shared utilities
    ├── data.ts                 # Mock data
    └── prefetch-service.ts     # AI prefetch service
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Prepare AI Model Dataset

```bash
cd ai-model
python3 dataset-prep.py --output ./data --mock-sessions 10000
```

### 3. Train LSTM Model

```bash
jupyter notebook lstm-train.ipynb
```

### 4. Run Next.js Application

```bash
npm run dev
```

### 5. Run Load Tests

```bash
cd tests/load
k6 run k6-ramp.js
```

### 6. Collect Performance Metrics

```bash
npm run lighthouse
npm run wpt
```

### 7. Analyze Results

```bash
npm run analyze
```

## 📊 Key Features

### Next.js Prototype Application
- **Home Page**: ISR with 60s revalidation
- **Category Pages**: Dynamic routes with ISR + client-side filtering
- **Product Pages**: SSR with dynamic metadata
- **Profile Page**: SSR for user-specific content
- **API Routes**: RESTful endpoints for products, categories, user data
- **Edge Middleware**: Geolocation, A/B testing, threat inspection, AI prefetch

### LSTM Predictive Prefetching
- **Architecture**: Embedding(128) → LSTM(64) → LSTM(32) → Dense(softmax)
- **Context Size**: 5 (sliding window)
- **Training**: Adam optimizer, lr=0.001, batch_size=64, epochs=5
- **Evaluation**: Precision@3, Recall@3, F1-score
- **Integration**: TensorFlow.js for edge inference

### Load Testing
- **k6 Ramp Test**: Gradual load increase
- **k6 Spike Test**: 100 → 500 RPS spike
- **Artillery**: Pareto distribution (α=1.5)
- **30 Repeated Runs**: 3 scenarios × 10 each

### Performance Metrics
- **Core Web Vitals**: TTFB, LCP, FID, CLS
- **Lighthouse**: Custom throttling (RTT 80±10ms)
- **WebPageTest**: Multi-location testing
- **Statistical Analysis**: Mean, SD, 95% CI

## 📝 Reproducibility

All experiments are fully reproducible:

1. **Environment**: System info scripts capture CPU, RAM, OS, Node.js, Chrome versions
2. **Network**: RTT 80±10ms, 0.3% packet loss simulation
3. **Versions**: All dependencies pinned in `package.json` and `tests/environment/versions.txt`
4. **Data**: Synthetic data generators for consistent datasets
5. **Analysis**: Automated statistical calculations with confidence intervals

## 📚 Documentation

- **AI Model**: See `ai-model/README.md`
- **Load Testing**: See `tests/load/README.md`
- **Metrics Collection**: See `tests/metrics/README.md`
- **Environment Setup**: See `tests/environment/reproducibility-notes.md`

## 🔬 Experimental Setup

### Network Conditions
- RTT: 80ms ± 10ms
- Throughput: 10 Mbps
- Packet Loss: 0.3%
- CPU Throttling: 4x (mobile simulation)

### Test Scenarios
1. **Baseline**: Unoptimized Next.js app
2. **Optimized**: With ISR, edge middleware, prefetching
3. **AI-Enhanced**: With LSTM predictive prefetching

### Metrics Collected
- Time to First Byte (TTFB)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Response times (p50, p95, p99)
- Error rates
- Throughput

## 📄 License

See LICENSE file for details.

## 🤝 Citation

If you use this reproducibility package, please cite:

```
[Your IEEE Access Paper Citation]
```

## 📧 Contact

For questions about reproducibility, please open an issue or contact the authors.

