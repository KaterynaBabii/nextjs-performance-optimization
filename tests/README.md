# Tests Directory

Complete testing suite for the Next.js performance optimization research project. This directory contains all scripts, configurations, and documentation required for reproducibility as requested by IEEE Access reviewers.

## Directory Structure

```
tests/
├── load/              # Load testing with k6 and Artillery
├── metrics/           # Web performance metrics (Core Web Vitals, Lighthouse)
├── ai-model/          # LSTM model training and evaluation
├── environment/       # System information and reproducibility documentation
└── README.md          # This file
```

## Quick Start

### 1. Load Testing
```bash
cd tests/load
# See README.md for detailed instructions
k6 run k6-ramp.js
```

### 2. Performance Metrics
```bash
cd tests/metrics
# See README.md for detailed instructions
lighthouse http://localhost:3000 --config-path=./lighthouse-config.json
```

### 3. AI Model Training
```bash
cd tests/ai-model
# See README.md for detailed instructions
python dataset-prep.py --output ./data --mock-sessions 10000
jupyter notebook lstm-train.ipynb
```

### 4. Environment Information
```bash
cd tests/environment
./system-info.sh > system-info.txt
```

## Overview

### Load Testing (`tests/load/`)
- **k6 Ramp Test**: Gradual load increase (0 → 100 VUs)
- **k6 Spike Test**: Sudden traffic spike (10 → 500 VUs)
- **Artillery Spike Test**: Spike test with Pareto distribution
- **Metrics**: TTFB, response times, error rates

### Performance Metrics (`tests/metrics/`)
- **Core Web Vitals**: TTFB, LCP, FID, CLS collection
- **Lighthouse Audits**: Performance metrics with custom throttling
- **Network Simulation**: RTT 80±10ms, 10 Mbps throughput

### AI Model (`tests/ai-model/`)
- **Dataset Preparation**: Clickstream data preprocessing
- **LSTM Training**: Next-page prediction model
- **Evaluation**: Precision@K, Recall@K, F1-score metrics
- **Hyperparameters**: Sequence length 20, embedding 64, LSTM units 128

### Environment (`tests/environment/`)
- **System Information**: Hardware and software specs
- **Version Tracking**: All dependency versions
- **Reproducibility Notes**: Detailed setup and troubleshooting

## Prerequisites

### Required Tools
- **Node.js**: v20.11.0+
- **Python**: 3.11.0+
- **k6**: 0.48.0+ (for load testing)
- **Artillery**: 2.0.0+ (for load testing)
- **Lighthouse**: 11.4.0+ (for performance testing)
- **TensorFlow**: 2.15.0+ (for AI model training)
- **Jupyter**: 1.0.0+ (for model training notebook)

### Installation

**Node.js tools:**
```bash
npm install -g artillery lighthouse
```

**k6:**
```bash
# macOS
brew install k6

# Linux
# See https://k6.io/docs/getting-started/installation/
```

**Python tools:**
```bash
pip install tensorflow numpy pandas jupyter matplotlib
```

## Running All Tests

### Complete Test Suite

```bash
# 1. Collect system information
cd tests/environment
./system-info.sh > system-info-$(date +%Y%m%d).txt

# 2. Run load tests
cd ../load
mkdir -p results
k6 run k6-ramp.js
k6 run k6-spike.js
artillery run artillery-spike.yml --output results/artillery-spike.json

# 3. Run performance metrics
cd ../metrics
mkdir -p results
lighthouse http://localhost:3000 \
  --config-path=./lighthouse-config.json \
  --output=json \
  --output-path=./results/lighthouse-report.json

# 4. Train and evaluate AI model
cd ../ai-model
python dataset-prep.py --output ./data --mock-sessions 10000
# Then run lstm-train.ipynb in Jupyter
python evaluation.py --model ./models/lstm_final_model.h5 --data-dir ./data
```

## Results Structure

After running tests, results are organized as:

```
tests/
├── load/results/
│   ├── ramp-test-summary.json
│   ├── spike-test-summary.json
│   └── artillery-spike.json
├── metrics/results/
│   ├── lighthouse-report.json
│   └── lighthouse-runs/ (multiple runs)
└── ai-model/
    ├── models/
    │   └── lstm_final_model.h5
    └── results/
        ├── evaluation_results.json
        ├── training_history.csv
        └── model_config.json
```

## Reproducibility

All tests are designed for reproducibility:

1. **Version Pinning**: All dependencies are pinned in `tests/environment/versions.txt`
2. **Configuration Files**: All test configurations are in version control
3. **Random Seeds**: AI model training uses fixed seeds (documented in notebook)
4. **Network Conditions**: Consistent throttling parameters across all tests
5. **Documentation**: Comprehensive README files in each subdirectory

## Reviewer Requirements

This test suite addresses all reviewer requirements:

✅ **Reproducibility**: Complete environment documentation and version tracking  
✅ **Load Testing**: k6 and Artillery scripts with detailed configurations  
✅ **Environment Specs**: System information collection and hardware details  
✅ **Statistical Robustness**: Multiple runs, metrics aggregation, evaluation scripts  
✅ **AI Model Transparency**: Full model architecture, hyperparameters, training code

## Documentation

Each subdirectory contains a detailed README:
- `load/README.md` - Load testing instructions
- `metrics/README.md` - Performance metrics collection
- `ai-model/README.md` - Model training and evaluation
- `environment/reproducibility-notes.md` - Detailed reproducibility guide

## Support

For questions or issues:
1. Check the README in the relevant subdirectory
2. Review `environment/reproducibility-notes.md` for troubleshooting
3. Examine code comments in test scripts
4. Contact the research team

## References

- [k6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [TensorFlow Documentation](https://www.tensorflow.org/)
- [Next.js Documentation](https://nextjs.org/docs)

