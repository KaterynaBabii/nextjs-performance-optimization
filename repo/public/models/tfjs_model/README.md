# TensorFlow.js Model Directory

This directory should contain the converted LSTM model files for predictive prefetching.

## Required Files

After training and converting the model, this directory should contain:

1. **`model.json`** - Model topology and configuration
2. **`weights_*.bin`** - Model weights (one or more files)
3. **`vocab.json`** - Vocabulary mapping (page IDs to integers)

## Setup Instructions

### Step 1: Train Model
```bash
cd ../../../tests/ai-model
python dataset-prep.py --output ./data --sequence-length 5 --mock-sessions 200000
jupyter notebook lstm-train.ipynb
```

### Step 2: Convert to TensorFlow.js
```bash
pip install tensorflowjs
tensorflowjs_converter --input_format=keras ./models/lstm_final_model.h5 ./models/tfjs_model/
```

### Step 3: Copy Files Here
```bash
# From tests/ai-model directory
cp -r models/tfjs_model/* ../../../repo/public/models/tfjs_model/
cp data/vocab.json ../../../repo/public/models/tfjs_model/
```

### Step 4: Verify
```bash
cd ../../../repo
npm run verify:ai
```

## File Structure

```
public/models/tfjs_model/
├── model.json          # Model topology
├── weights_1.bin       # Model weights (example)
├── weights_2.bin       # Model weights (if split)
└── vocab.json          # Vocabulary mapping
```

## Model Architecture (Per Paper)

- **Embedding**: 128 dimensions
- **LSTM Layer 1**: 64 units
- **LSTM Layer 2**: 32 units
- **Context Window**: 5 routes
- **Output**: Dense softmax (top-3 predictions)

## Current Status

⚠️ **Model files not yet deployed**

The application will use rule-based fallback until model files are placed here.

## Verification

After placing files, verify with:
```bash
npm run verify:ai
```

Expected output: `✅ ALL CHECKS PASSED`

