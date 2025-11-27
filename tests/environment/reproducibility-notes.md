# Reproducibility Notes

This document provides detailed information for reproducing the experiments described in the research paper.

## Environment Setup

### Hardware Specifications

**Primary Test Environment:**
- **CPU**: Intel Xeon E5-2686 v4 @ 2.30GHz (16 cores)
- **RAM**: 32 GB DDR4
- **Storage**: 500 GB SSD (NVMe)
- **Network**: Gigabit Ethernet

**Alternative Test Environment (Cloud):**
- **Instance Type**: AWS EC2 c5.4xlarge
- **CPU**: Intel Xeon Platinum 8124M @ 3.00GHz (16 vCPUs)
- **RAM**: 32 GB
- **Storage**: 100 GB EBS SSD

### Software Environment

**Operating System:**
- **Primary**: macOS 14.6.0 (Darwin 23.6.0)
- **Alternative**: Ubuntu 22.04 LTS (Linux 5.15.0)

**Node.js Ecosystem:**
- Node.js: v20.11.0 (LTS)
- NPM: 10.2.4
- Next.js: 14.2.0
- React: 18.3.0
- TypeScript: 5.3.0

**Python Ecosystem:**
- Python: 3.11.0
- TensorFlow: 2.15.0
- NumPy: 1.24.0
- Pandas: 2.0.0
- Jupyter: 1.0.0

**Testing Tools:**
- k6: 0.48.0
- Artillery: 2.0.0
- Lighthouse: 11.4.0
- Chrome: 120.0.6099.109

## Network Simulation Parameters

All performance tests use consistent network throttling to simulate real-world conditions:

### Mobile Network Simulation (4G-like)
- **RTT (Round-Trip Time)**: 80ms ± 10ms
- **Download Throughput**: 10 Mbps (10240 Kbps)
- **Upload Throughput**: 10 Mbps (10240 Kbps)
- **Packet Loss**: 0.3%
- **CPU Throttling**: 4x slowdown (mobile device simulation)

### Configuration
These parameters are configured in:
- `tests/metrics/lighthouse-config.json` (Lighthouse tests)
- Chrome DevTools Protocol (for custom tests)

## Reproducing Load Tests

### Prerequisites
1. Install k6: `brew install k6` (macOS) or follow [k6 installation guide](https://k6.io/docs/getting-started/installation/)
2. Install Artillery: `npm install -g artillery`
3. Ensure Next.js application is running: `npm run dev`

### Running Load Tests

**k6 Ramp Test:**
```bash
cd tests/load
k6 run k6-ramp.js
```

**k6 Spike Test:**
```bash
k6 run k6-spike.js
```

**Artillery Spike Test:**
```bash
artillery run artillery-spike.yml --output results/artillery-spike.json
artillery report results/artillery-spike.json
```

### Expected Results
- **Ramp Test**: Gradual increase from 0 to 100 VUs, maintain, then ramp down
- **Spike Test**: Sudden spike from 10 to 500 VUs, maintain, then recover
- **Metrics**: Response times, TTFB, error rates logged to console and JSON files

## Reproducing Performance Metrics Tests

### Prerequisites
1. Install Lighthouse: `npm install -g lighthouse`
2. Ensure Chrome/Chromium is installed
3. Start Next.js application: `npm run dev`

### Running Lighthouse Tests

**Single Audit:**
```bash
cd tests/metrics
lighthouse http://localhost:3000 \
  --config-path=./lighthouse-config.json \
  --output=json \
  --output-path=./results/lighthouse-report.json
```

**Multiple Runs (for statistical significance):**
```bash
for i in {1..10}; do
  lighthouse http://localhost:3000 \
    --config-path=./lighthouse-config.json \
    --output=json \
    --output-path=./results/run-$i.json \
    --quiet
done
```

### Core Web Vitals Collection

**Browser Console Method:**
1. Open `http://localhost:3000` in Chrome
2. Open DevTools (F12)
3. Run the script from `collect-core-web-vitals.js` in console
4. Interact with page to generate FID events

**Automated Method (Puppeteer):**
```bash
node -e "
const puppeteer = require('puppeteer');
// Use collect-core-web-vitals.js script
"
```

## Reproducing AI Model Training

### Prerequisites
1. Install Python 3.11+
2. Install dependencies: `pip install tensorflow numpy pandas jupyter matplotlib`
3. Ensure GPU support (optional but recommended)

### Dataset Preparation

**With Mock Data (for testing):**
```bash
cd tests/ai-model
python dataset-prep.py --output ./data --mock-sessions 10000
```

**With Real Data:**
```bash
python dataset-prep.py --input path/to/clickstream.csv --output ./data
```

### Model Training

1. Launch Jupyter: `jupyter notebook lstm-train.ipynb`
2. Run all cells in sequence
3. Monitor training progress in console and `results/training_history.csv`
4. Model checkpoints saved to `models/` directory

### Model Evaluation

```bash
python evaluation.py \
  --model ./models/lstm_final_model.h5 \
  --data-dir ./data \
  --k-values 1 3 5
```

### Expected Metrics
- **Precision@3**: ~0.65-0.75 (depends on dataset)
- **Recall@3**: ~0.65-0.75
- **F1@3**: ~0.65-0.75
- **Accuracy (top-1)**: ~0.40-0.50

## Statistical Robustness

### Multiple Runs
All experiments should be run multiple times to ensure statistical significance:

- **Load Tests**: 5-10 runs per configuration
- **Performance Metrics**: 10+ runs per page/configuration
- **AI Model Training**: 3-5 runs with different random seeds

### Random Seeds
For reproducibility, set random seeds:

**Python/TensorFlow:**
```python
import numpy as np
import tensorflow as tf
np.random.seed(42)
tf.random.set_seed(42)
```

**Node.js:**
```javascript
// Note: JavaScript Math.random() cannot be seeded
// Use a seeded random library if needed
```

## Known Issues and Workarounds

### Issue 1: High Variance in Performance Metrics
**Problem**: Lighthouse results vary significantly between runs.

**Solution**: 
- Run 10+ iterations and report median/mean
- Ensure consistent network conditions
- Clear browser cache between runs
- Use headless mode for consistency

### Issue 2: GPU Memory Errors
**Problem**: Out of memory when training LSTM model.

**Solution**:
- Reduce batch size: `BATCH_SIZE = 32` or `16`
- Reduce sequence length: `SEQUENCE_LENGTH = 10`
- Use smaller model: `LSTM_UNITS = 64`

### Issue 3: Network Throttling Not Applied
**Problem**: Lighthouse doesn't apply custom throttling.

**Solution**:
- Verify `lighthouse-config.json` is correctly formatted
- Use `--throttling-method=devtools` flag
- Check Chrome DevTools network throttling settings

## Data Availability

### Datasets
- **Clickstream Data**: Synthetic data generated by `dataset-prep.py`
- **Real Data**: Replace with actual clickstream logs (format documented in `dataset-prep.py`)

### Results
All test results are saved to:
- `tests/load/results/` - Load test results
- `tests/metrics/results/` - Performance metrics
- `tests/ai-model/results/` - Model evaluation metrics
- `tests/ai-model/models/` - Trained models

## Version Control

### Pinning Versions
All dependencies should be pinned:
- `package.json`: Use exact versions (no `^` or `~`)
- `requirements.txt`: Pin all Python packages
- Document Node.js and Python versions in `versions.txt`

### Updating Versions
When updating versions:
1. Update `versions.txt`
2. Update `package.json` or `requirements.txt`
3. Re-run all tests to verify compatibility
4. Document changes in this file

## Contact and Support

For questions about reproducibility:
1. Check this document first
2. Review README files in each test directory
3. Examine code comments in test scripts
4. Contact research team

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [k6 Documentation](https://k6.io/docs/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [TensorFlow Documentation](https://www.tensorflow.org/)

