"""
LSTM Model Evaluation Script
Computes Precision@K, Recall@K, and F1-score for next-page prediction
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from typing import Tuple, List, Dict
import json
import os

def load_model_and_data(model_path: str, data_dir: str = './data') -> Tuple:
    """
    Load trained model and test data.
    
    Args:
        model_path: Path to saved model
        data_dir: Directory containing preprocessed data
    
    Returns:
        Tuple of (model, X_val, y_val, vocab)
    """
    print(f"Loading model from {model_path}...")
    model = keras.models.load_model(model_path)
    
    print(f"Loading validation data from {data_dir}...")
    X_val = np.load(f'{data_dir}/X_val.npy')
    y_val = np.load(f'{data_dir}/y_val.npy')
    
    with open(f'{data_dir}/vocab.json', 'r') as f:
        vocab = json.load(f)
    
    # Reverse vocabulary for lookups
    reverse_vocab = {v: k for k, v in vocab.items()}
    
    return model, X_val, y_val, vocab, reverse_vocab

def get_top_k_predictions(model: keras.Model, X: np.ndarray, k: int = 3) -> np.ndarray:
    """
    Get top-K predictions for each input sequence.
    
    Args:
        model: Trained LSTM model
        X: Input sequences
        k: Number of top predictions to return
    
    Returns:
        Array of shape (len(X), k) with top-K predicted page indices
    """
    # Get probability predictions
    predictions = model.predict(X, verbose=0)
    
    # Get top-K indices
    top_k_indices = np.argsort(predictions, axis=1)[:, -k:][:, ::-1]
    
    return top_k_indices

def precision_at_k(y_true: np.ndarray, y_pred_topk: np.ndarray, k: int) -> float:
    """
    Compute Precision@K.
    
    Precision@K = (Number of relevant items in top-K) / K
    
    Args:
        y_true: True target page indices
        y_pred_topk: Top-K predicted page indices for each sample
        k: Value of K
    
    Returns:
        Precision@K score
    """
    # Check if true label is in top-K predictions
    hits = np.array([y_true[i] in y_pred_topk[i] for i in range(len(y_true))])
    precision = np.mean(hits)
    return float(precision)

def recall_at_k(y_true: np.ndarray, y_pred_topk: np.ndarray, k: int, 
                num_classes: int) -> float:
    """
    Compute Recall@K.
    
    Recall@K = (Number of relevant items in top-K) / (Total relevant items)
    
    For next-page prediction, this is equivalent to Precision@K since
    there's only one relevant item per sample.
    
    Args:
        y_true: True target page indices
        y_pred_topk: Top-K predicted page indices
        k: Value of K
        num_classes: Total number of classes (pages)
    
    Returns:
        Recall@K score
    """
    # For single-label classification, Recall@K = Precision@K
    return precision_at_k(y_true, y_pred_topk, k)

def f1_score_at_k(y_true: np.ndarray, y_pred_topk: np.ndarray, k: int,
                  num_classes: int) -> float:
    """
    Compute F1-score@K.
    
    F1@K = 2 * (Precision@K * Recall@K) / (Precision@K + Recall@K)
    
    Args:
        y_true: True target page indices
        y_pred_topk: Top-K predicted page indices
        k: Value of K
        num_classes: Total number of classes
    
    Returns:
        F1-score@K
    """
    precision = precision_at_k(y_true, y_pred_topk, k)
    recall = recall_at_k(y_true, y_pred_topk, k, num_classes)
    
    if precision + recall == 0:
        return 0.0
    
    f1 = 2 * (precision * recall) / (precision + recall)
    return float(f1)

def evaluate_model(model: keras.Model, X_val: np.ndarray, y_val: np.ndarray,
                  vocab: Dict, k_values: List[int] = [1, 3, 5]) -> Dict:
    """
    Evaluate model on validation set.
    
    Args:
        model: Trained LSTM model
        X_val: Validation input sequences
        y_val: Validation target pages
        vocab: Vocabulary mapping
        k_values: List of K values for evaluation
    
    Returns:
        Dictionary with evaluation metrics
    """
    print(f"Evaluating on {len(X_val)} validation samples...")
    
    num_classes = len(vocab) - 2  # Exclude <PAD> and <UNK>
    max_k = max(k_values)
    
    # Get top-K predictions
    y_pred_topk = get_top_k_predictions(model, X_val, k=max_k)
    
    results = {}
    
    for k in k_values:
        print(f"\nComputing metrics@K={k}...")
        
        # Get top-K predictions for this K
        y_pred_k = y_pred_topk[:, :k]
        
        precision = precision_at_k(y_val, y_pred_k, k)
        recall = recall_at_k(y_val, y_pred_k, k, num_classes)
        f1 = f1_score_at_k(y_val, y_pred_k, k, num_classes)
        
        results[f'precision@{k}'] = precision
        results[f'recall@{k}'] = recall
        results[f'f1@{k}'] = f1
        
        print(f"  Precision@{k}: {precision:.4f}")
        print(f"  Recall@{k}: {recall:.4f}")
        print(f"  F1@{k}: {f1:.4f}")
    
    # Also compute standard accuracy (top-1)
    y_pred_top1 = y_pred_topk[:, 0]
    accuracy = np.mean(y_val == y_pred_top1)
    results['accuracy'] = float(accuracy)
    print(f"\nAccuracy (top-1): {accuracy:.4f}")
    
    return results

def save_results(results: Dict, output_path: str = './results/evaluation_results.json'):
    """
    Save evaluation results to JSON file.
    
    Args:
        results: Dictionary with evaluation metrics
        output_path: Path to save results
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nResults saved to {output_path}")

def main():
    """
    Main evaluation pipeline.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Evaluate LSTM model for next-page prediction')
    parser.add_argument('--model', type=str, required=True,
                       help='Path to trained model')
    parser.add_argument('--data-dir', type=str, default='./data',
                       help='Directory containing preprocessed data')
    parser.add_argument('--k-values', type=int, nargs='+', default=[1, 3, 5],
                       help='K values for Precision@K, Recall@K, F1@K')
    parser.add_argument('--output', type=str, default='./results/evaluation_results.json',
                       help='Output path for evaluation results')
    
    args = parser.parse_args()
    
    # Load model and data
    model, X_val, y_val, vocab, reverse_vocab = load_model_and_data(
        args.model, args.data_dir
    )
    
    # Evaluate
    results = evaluate_model(model, X_val, y_val, vocab, k_values=args.k_values)
    
    # Save results
    save_results(results, args.output)
    
    print("\nEvaluation complete!")

if __name__ == '__main__':
    main()

