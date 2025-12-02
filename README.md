# Next.js Performance Optimization

A comprehensive Next.js 14+ (App Router) TypeScript project demonstrating performance optimization strategies for large-scale web applications, including AI-powered predictive prefetching, Core Web Vitals measurement, and load testing.

## Overview

This project implements a complete performance optimization system that:

- **AI-Powered Predictive Prefetching**: LSTM-based route prediction for intelligent prefetching
- **Core Web Vitals Collection**: TTFB, LCP, FID, CLS measurement and comparison
- **Performance Optimizations**: ISR, Edge Middleware, CDN caching, and more
- **Load Testing**: k6 and Artillery integration for performance testing
- **Statistical Analysis**: Automated metrics analysis with confidence intervals
- **Reproducible Experiments**: Complete testing suite for performance research

## Reference Values

The project aims to achieve the following performance targets through optimization:

### Baseline (Unoptimized)
- **TTFB**: 320 ms
- **LCP**: 3.40 s
- **FID**: 190 ms
- **CLS**: 0.24

### Optimized
- **TTFB**: 198 ms
- **LCP**: 2.48 s
- **FID**: 68 ms
- **CLS**: 0.06

### Core Web Vitals Thresholds ("Good" Range)
- **TTFB**: ≤ 200 ms
- **LCP**: ≤ 2.5 s
- **FID**: ≤ 100 ms
- **CLS**: ≤ 0.1

## Quick Start

### 1. Install Dependencies

```bash
# Root project
npm install

# Main application (repo/)
cd repo
npm install
```

### 2. Run Development Server

```bash
# Root app (Web Vitals dashboard)
npm run dev
# Starts at http://localhost:3000

# Main application (performance optimization app)
cd repo
npm run dev
# Starts at http://localhost:3001
```

### 3. Web Vitals Dashboard

1. Start both servers:
   ```bash
   # Terminal 1: Root app
   npm run dev
   
   # Terminal 2: Main app
   cd repo
   npm run dev
   ```
2. Navigate to `http://localhost:3001` (main app)
3. Metrics are automatically collected and sent to dashboard
4. View dashboard at `http://localhost:3000/metrics`
5. Dashboard auto-refreshes every 5 seconds

### 4. Performance Optimization App

1. Navigate to `http://localhost:3001` (repo app)
2. Browse categories, products, and profile pages
3. AI-powered prefetching works automatically
4. Check browser console for prefetch logs

## Key Features

### AI-Powered Predictive Prefetching
- **LSTM Model**: Predicts next routes based on navigation history
- **Server-Side Prediction**: `prefetch-service.ts` runs in middleware/API routes
- **Client-Side Prefetching**: `PrefetchClient` component prefetches predicted routes
- **Edge Runtime**: Low-latency predictions using Edge functions

### Performance Optimizations
- **ISR (Incremental Static Regeneration)**: Home and category pages with 60s revalidation
- **Edge Middleware**: Geolocation, A/B testing, threat inspection, CDN caching
- **Dynamic Routes**: Product pages with SSR, category pages with ISR
- **API Routes**: RESTful endpoints with Edge runtime

### Core Web Vitals Measurement
- **Automatic Collection**: TTFB, LCP, FID, CLS metrics
- **Reference Comparison**: Compares against baseline and optimized values
- **Threshold Status**: Shows if metrics meet "good" thresholds
- **Statistical Analysis**: Mean, SD, 95% confidence intervals

### Load Testing
- **k6 Tests**: Ramp and spike tests
- **Artillery**: Pareto distribution load patterns
- **30 Repeated Runs**: Statistical significance
- **Automated Analysis**: Results aggregation and comparison

## Project Structure

```
.
├── app/                          # Root Next.js app (Web Vitals experiment)
│   ├── api/
│   │   └── web-vitals/
│   │       └── route.ts         # Web Vitals API endpoint
│   ├── metrics/
│   │   └── page.tsx              # Metrics dashboard
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── repo/                         # Main performance optimization application
│   ├── app/                      # Next.js App Router application
│   │   ├── page.tsx              # Home page (ISR)
│   │   ├── category/[id]/        # Category pages (ISR + filters)
│   │   ├── product/[id]/         # Product pages (SSR)
│   │   ├── profile/              # Profile page (SSR)
│   │   ├── api/                  # API routes
│   │   │   ├── prefetch/         # AI prefetch endpoint
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   └── user/
│   │   └── middleware.ts         # Edge middleware (geolocation, A/B, prefetch)
│   │
│   ├── components/               # React components
│   │   ├── PrefetchClient.tsx    # Client-side prefetch component
│   │   ├── PrefetchRoutesInjector.tsx  # Server component for route injection
│   │   └── ProductFilters.tsx
│   │
│   ├── lib/                      # Shared utilities
│   │   ├── prefetch-service.ts   # Server-side route prediction (AI model)
│   │   ├── clientPrefetch.ts     # Client-side prefetch utilities
│   │   └── data.ts               # Mock data
│   │
│   ├── tests/                    # Testing suite
│   │   ├── load/                 # Load testing (k6, Artillery)
│   │   ├── metrics/              # Core Web Vitals collection
│   │   ├── ai-model/             # AI model evaluation
│   │   └── environment/          # System info
│   │
│   ├── analysis/                 # Statistical analysis
│   │   └── results/              # Experiment results
│   │
│   └── ai-model/                 # LSTM model training
│
├── lib/                          # Root app utilities
│   ├── metrics.ts                # Metric types and comparison logic
│   └── webVitalsClient.ts        # Web Vitals collector
│
└── tests/                        # Root level tests
    ├── load/                     # Load testing scripts
    ├── metrics/                  # Metrics collection
    └── ai-model/                 # AI model training
```

## Architecture

### Server-Side (No Router)
- **`lib/prefetch-service.ts`**: Route prediction only, no router imports
- **Middleware**: Calls `getPredictedRoutes()` to predict routes
- **API Routes**: Server-side prediction endpoints

### Client-Side (Router Allowed)
- **`lib/clientPrefetch.ts`**: Client prefetch utilities with `useRouter`
- **`components/PrefetchClient.tsx`**: React component that prefetches routes
- **`components/PrefetchRoutesInjector.tsx`**: Server component that injects routes

### Data Flow
1. User navigates → Middleware tracks path history
2. Middleware → Calls `getPredictedRoutes()` (server-side)
3. Middleware → Sets `X-Prefetch-Routes` header
4. `PrefetchRoutesInjector` → Reads header, injects script tag
5. `PrefetchClient` → Reads script tag, prefetches routes using router

## Customizing Reference Values

Update reference values in `lib/metrics.ts`:

```typescript
export const REFERENCE_VALUES: ReferenceValues = {
  baseline: {
    ttfb: 320,  // Your baseline value
    lcp: 3.40,
    fid: 190,
    cls: 0.24,
  },
  optimized: {
    ttfb: 198,  // Your optimized value
    lcp: 2.48,
    fid: 68,
    cls: 0.06,
  },
};
```

## How It Works

### Web Vitals Collection
1. **Client Collection**: `webVitalsClient.ts` subscribes to web-vitals events
2. **API Storage**: `/api/web-vitals` stores metrics in `metrics-store.json`
3. **Aggregation**: Metrics averaged across all samples
4. **Comparison**: `compareMetrics()` calculates differences and improvements
5. **Dashboard**: `/metrics` page displays results with auto-refresh

### Predictive Prefetching
1. **Path Tracking**: Middleware tracks user navigation in cookies
2. **Route Prediction**: `getPredictedRoutes()` predicts top-3 next routes
3. **Route Injection**: Server component injects routes via script tag
4. **Client Prefetch**: `PrefetchClient` reads routes and prefetches using Next.js router

## Running Tests

### Load Testing
```bash
cd repo/tests/load
k6 run k6-ramp.js      # Gradual load increase
k6 run k6-spike.js     # Spike test
artillery run artillery-spike.yml
```

### Metrics Collection
```bash
cd repo
npm run lighthouse    # Collects Core Web Vitals
# Results saved in repo/lighthouse/results/
```

For full Core Web Vitals (LCP, FID, CLS) in browser:
1. Open http://localhost:3001 in browser
2. Open DevTools console
3. Copy and paste contents of `repo/tests/metrics/collect-core-web-vitals.js`
4. Run the script to collect detailed metrics

### Analysis
```bash
cd repo/analysis
node analyze-all-experiments.js
```

## Troubleshooting

### Router Errors
If you see "No router instance found" errors:
1. Clear build cache: `rm -rf .next`
2. Clear browser cache: Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
3. Restart dev server

### Prefetching Disabled
Prefetching is currently disabled in middleware for debugging. To re-enable:
1. Uncomment prefetch code in `repo/app/middleware.ts`
2. Uncomment `<PrefetchClient />` in `repo/app/layout.tsx`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Technologies

- **Next.js 14+** (App Router)
- **TypeScript**
- **React 18**
- **web-vitals** library
- **TensorFlow.js** (for AI model inference)
- **k6** (load testing)
- **Artillery** (load testing)

## Running Experiments

For detailed instructions on running all experiments, see **[EXPERIMENTS-GUIDE.md](./EXPERIMENTS-GUIDE.md)**.

### Quick Start for Experiments

```bash
# 1. Start the application
cd repo
npm run build
npm run start

# 2. Run load tests (in another terminal)
cd tests/load
k6 run k6-ramp.js

# 3. Collect metrics
cd ../metrics
node collect-core-web-vitals.js

# 4. Analyze results
cd ../../analysis
node analyze-all-experiments.js
```

### Experiment Scenarios

1. **Baseline**: Unoptimized Next.js app
2. **Optimized**: With ISR + Edge Middleware
3. **AI-Enhanced**: With LSTM predictive prefetching

Each scenario requires:
- 10 load test runs (for statistical significance)
- 30 metrics collection runs (Lighthouse)
- Statistical analysis with 95% confidence intervals

## Documentation

- **Experiments Guide**: See [EXPERIMENTS-GUIDE.md](./EXPERIMENTS-GUIDE.md) for complete experiment instructions
- **Main App**: See `repo/README.md` for detailed application documentation
- **AI Model**: See `repo/ai-model/README.md` for LSTM model details
- **Analysis**: See `repo/analysis/README.md` for statistical analysis tools

## License

See LICENSE file for details.

