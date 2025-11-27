# AI Model Training and Evaluation

This directory contains scripts and notebooks for training and evaluating an LSTM model for predictive prefetching based on user clickstream data.

## Overview

The AI model component includes:
- **Dataset Preparation**: Preprocesses clickstream data into sequences
- **LSTM Training**: Jupyter notebook for model training
- **Evaluation**: Computes Precision@K, Recall@K, and F1-score metrics

## Model Architecture

### Hyperparameters

- **Sequence Length**: 20 (number of previous pages used for prediction)
- **Embedding Size**: 64 (dimension of page embeddings)
- **LSTM Units**: 128 (number of LSTM hidden units)
- **Batch Size**: 64
- **Learning Rate**: 0.001
- **Train/Validation Split**: 80/20

### Architecture

```
Input (sequence of page IDs)
  ↓
Embedding Layer (vocab_size → 64)
  ↓
LSTM Layer (128 units)
  ↓
Dropout (0.2)
  ↓
Dense Layer (num_classes, softmax)
  ↓
Output (probability distribution over pages)
```

## Prerequisites

### Install Python Dependencies

```bash
pip install tensorflow numpy pandas jupyter matplotlib
```

Or use a requirements file:

```bash
pip install -r requirements.txt
```

Create `requirements.txt`:
```
tensorflow>=2.10.0
numpy>=1.21.0
pandas>=1.3.0
jupyter>=1.0.0
matplotlib>=3.4.0
```

### GPU Support (Optional)

For faster training, install TensorFlow with GPU support:

```bash
pip install tensorflow[and-cuda]
```

## Dataset Preparation

### Step 1: Prepare Clickstream Data

The dataset should be in CSV or JSON format with columns:
- `session_id`: Unique session identifier
- `page_id`: Page identifier
- `timestamp`: Timestamp of page view
- `user_id`: (Optional) User identifier

**Example CSV format:**
```csv
session_id,user_id,page_id,timestamp
0,0,page_0,1000
0,0,page_1,2000
0,0,page_2,3000
1,1,page_0,4000
```

### Step 2: Run Dataset Preparation

**With real data:**
```bash
python dataset-prep.py --input path/to/clickstream.csv --output ./data
```

**With mock data (for testing):**
```bash
python dataset-prep.py --output ./data --mock-sessions 10000
```

**Options:**
- `--input`: Path to input clickstream data file (CSV or JSON)
- `--output`: Output directory for preprocessed data (default: `./data`)
- `--sequence-length`: Length of input sequences (default: 20)
- `--train-split`: Fraction of data for training (default: 0.8)
- `--mock-sessions`: Number of mock sessions if no input file (default: 10000)

**Output:**
- `data/X_train.npy`: Training input sequences
- `data/X_val.npy`: Validation input sequences
- `data/y_train.npy`: Training target pages
- `data/y_val.npy`: Validation target pages
- `data/vocab.json`: Vocabulary mapping page IDs to integers

## Model Training

### Step 1: Launch Jupyter Notebook

```bash
jupyter notebook lstm-train.ipynb
```

Or use JupyterLab:
```bash
jupyter lab lstm-train.ipynb
```

### Step 2: Run Training Cells

The notebook includes:
1. Library imports
2. Data loading
3. Model architecture definition
4. Callback configuration
5. Training
6. Evaluation
7. Model saving
8. Training history visualization

### Step 3: Monitor Training

Training progress is logged to:
- Console output (loss, accuracy per epoch)
- `results/training_history.csv`
- Model checkpoints in `models/` directory

### Training Output

After training, you'll have:
- `models/lstm_final_model.h5`: Final trained model
- `models/lstm_saved_model/`: SavedModel format (for TensorFlow.js conversion)
- `results/training_history.csv`: Training metrics per epoch
- `results/training_history.png`: Training curves plot
- `results/model_config.json`: Model configuration and final metrics

## Model Evaluation

### Run Evaluation Script

```bash
python evaluation.py --model ./models/lstm_final_model.h5 --data-dir ./data
```

**Options:**
- `--model`: Path to trained model
- `--data-dir`: Directory containing preprocessed data (default: `./data`)
- `--k-values`: K values for Precision@K, Recall@K, F1@K (default: 1, 3, 5)
- `--output`: Output path for evaluation results (default: `./results/evaluation_results.json`)

### Evaluation Metrics

The script computes:
- **Precision@K**: Fraction of top-K predictions that are correct
- **Recall@K**: Fraction of correct pages found in top-K predictions
- **F1@K**: Harmonic mean of Precision@K and Recall@K
- **Accuracy**: Top-1 accuracy

**Example output:**
```
Evaluating on 2000 validation samples...

Computing metrics@K=1...
  Precision@1: 0.4523
  Recall@1: 0.4523
  F1@1: 0.4523

Computing metrics@K=3...
  Precision@3: 0.6789
  Recall@3: 0.6789
  F1@3: 0.6789

Computing metrics@K=5...
  Precision@5: 0.7890
  Recall@5: 0.7890
  F1@5: 0.7890

Accuracy (top-1): 0.4523
```

## Complete Workflow

### Quick Start

```bash
# 1. Prepare data (with mock data for testing)
python dataset-prep.py --output ./data --mock-sessions 10000

# 2. Train model (in Jupyter notebook)
jupyter notebook lstm-train.ipynb
# Run all cells in the notebook

# 3. Evaluate model
python evaluation.py --model ./models/lstm_final_model.h5 --data-dir ./data
```

### Full Pipeline Script

Create `run-full-pipeline.sh`:

```bash
#!/bin/bash

echo "Step 1: Preparing dataset..."
python dataset-prep.py --output ./data --mock-sessions 10000

echo "Step 2: Training model..."
# Note: Jupyter notebook must be run manually
echo "Please run lstm-train.ipynb in Jupyter to train the model"

echo "Step 3: Evaluating model..."
python evaluation.py --model ./models/lstm_final_model.h5 --data-dir ./data

echo "Pipeline complete!"
```

## Model Usage for Prefetching

After training, the model can be used to predict next pages:

```python
import tensorflow as tf
import numpy as np
import json

# Load model
model = tf.keras.models.load_model('./models/lstm_final_model.h5')

# Load vocabulary
with open('./data/vocab.json', 'r') as f:
    vocab = json.load(f)

reverse_vocab = {v: k for k, v in vocab.items()}

# Predict next page for a sequence
def predict_next_pages(sequence, top_k=3):
    """
    Predict top-K next pages for a given sequence.
    
    Args:
        sequence: List of page IDs (length should be 20)
        top_k: Number of top predictions to return
    
    Returns:
        List of (page_id, probability) tuples
    """
    # Convert page IDs to indices
    seq_indices = [vocab.get(pid, vocab['<UNK>']) for pid in sequence]
    seq_array = np.array([seq_indices])
    
    # Get predictions
    predictions = model.predict(seq_array, verbose=0)[0]
    
    # Get top-K
    top_k_indices = np.argsort(predictions)[-top_k:][::-1]
    
    # Convert back to page IDs
    results = []
    for idx in top_k_indices:
        page_id = reverse_vocab.get(idx, '<UNK>')
        prob = float(predictions[idx])
        results.append((page_id, prob))
    
    return results

# Example usage
sequence = ['page_0', 'page_1', 'page_2'] + ['page_0'] * 17  # Pad to length 20
predictions = predict_next_pages(sequence, top_k=3)
print("Top 3 predicted next pages:")
for page_id, prob in predictions:
    print(f"  {page_id}: {prob:.4f}")
```

## Troubleshooting

### Out of Memory

- Reduce batch size: `BATCH_SIZE = 32` or `16`
- Reduce sequence length: `SEQUENCE_LENGTH = 10`
- Use smaller model: `LSTM_UNITS = 64`

### Poor Performance

- Increase training data
- Tune hyperparameters (learning rate, LSTM units)
- Try different architectures (bidirectional LSTM, attention)
- Check data quality and preprocessing

### Model Not Saving

- Ensure `models/` directory exists
- Check file permissions
- Verify disk space

## References

- [TensorFlow Documentation](https://www.tensorflow.org/)
- [LSTM Networks](https://www.tensorflow.org/guide/keras/rnn)
- [Sequence-to-Sequence Models](https://www.tensorflow.org/tutorials/text/nmt_with_attention)

## Research Notes

### Model Transparency

- Model architecture is fully documented in the notebook
- Hyperparameters are explicitly defined and saved
- Training history is logged for reproducibility

### Statistical Robustness

- Train/validation split ensures no data leakage
- Multiple evaluation metrics (Precision@K, Recall@K, F1@K)
- Training history allows monitoring for overfitting

### Reproducibility

- Random seeds should be set for reproducibility:
  ```python
  tf.random.set_seed(42)
  np.random.seed(42)
  ```
- All hyperparameters are saved in `model_config.json`
- Dataset preprocessing is deterministic (with fixed seed)

