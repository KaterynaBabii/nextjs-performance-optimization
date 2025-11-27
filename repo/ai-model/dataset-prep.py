"""
Dataset Preparation Script for LSTM Predictive Prefetching
Matches manuscript specifications:
- Tokenization
- Normalization
- Sliding-window segmentation (context size = 5)
- Train/validation split = 80/20
"""

import numpy as np
import pandas as pd
import json
import os
from typing import List, Tuple, Dict

# Configuration matching manuscript
CONTEXT_SIZE = 5  # Sliding window context size
TRAIN_SPLIT = 0.8
BATCH_SIZE = 64

def generate_synthetic_clickstream(num_sessions: int = 10000, num_routes: int = 20) -> pd.DataFrame:
    """
    Generate synthetic clickstream data for training.
    In production, replace with real clickstream logs.
    """
    print(f"Generating {num_sessions} synthetic sessions with {num_routes} routes...")
    
    routes = [f"/route_{i}" for i in range(num_routes)]
    sessions = []
    
    for session_id in range(num_sessions):
        # Each session has 8-25 page views
        num_views = np.random.randint(8, 26)
        user_id = np.random.randint(0, num_sessions // 10)
        
        for view_idx in range(num_views):
            # Simulate realistic navigation patterns
            if view_idx == 0:
                route = "/"
            elif view_idx < 3:
                # Early navigation follows common patterns
                route = np.random.choice(["/", "/category/1", "/category/2", "/product/1"])
            else:
                # Later navigation follows transition probabilities
                route = np.random.choice(routes)
            
            timestamp = session_id * 1000 + view_idx * 1000 + np.random.randint(0, 5000)
            
            sessions.append({
                'session_id': session_id,
                'user_id': user_id,
                'route': route,
                'timestamp': timestamp,
            })
    
    df = pd.DataFrame(sessions)
    print(f"Generated {len(df)} page views across {df['session_id'].nunique()} sessions")
    return df

def create_route_vocabulary(df: pd.DataFrame) -> Dict[str, int]:
    """Create vocabulary mapping routes to integers."""
    unique_routes = sorted(df['route'].unique())
    vocab = {route: idx for idx, route in enumerate(unique_routes)}
    vocab['<PAD>'] = len(vocab)
    vocab['<UNK>'] = len(vocab)
    return vocab

def create_sequences(df: pd.DataFrame, vocab: Dict[str, int], context_size: int = CONTEXT_SIZE) -> Tuple[np.ndarray, np.ndarray]:
    """
    Create sliding-window sequences with context size = 5.
    Each sequence uses the last 5 routes to predict the next route.
    """
    sequences = []
    targets = []
    
    for session_id, session_df in df.groupby('session_id'):
        session_df = session_df.sort_values('timestamp')
        routes = session_df['route'].values
        
        # Convert to integer indices
        route_indices = [vocab.get(route, vocab['<UNK>']) for route in routes]
        
        # Create sliding-window sequences (context size = 5)
        for i in range(len(route_indices) - context_size):
            seq = route_indices[i:i + context_size]
            target = route_indices[i + context_size]
            sequences.append(seq)
            targets.append(target)
    
    X = np.array(sequences, dtype=np.int32)
    y = np.array(targets, dtype=np.int32)
    
    print(f"Created {len(sequences)} sequences with context size {context_size}")
    return X, y

def normalize_sequences(X: np.ndarray, vocab_size: int) -> np.ndarray:
    """Normalize sequences (already tokenized, just ensure valid range)."""
    # Clip to valid vocabulary range
    X = np.clip(X, 0, vocab_size - 1)
    return X

def split_data(X: np.ndarray, y: np.ndarray, train_split: float = TRAIN_SPLIT) -> Tuple:
    """Split data into train and validation sets (80/20)."""
    split_idx = int(len(X) * train_split)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    print(f"Train: {len(X_train)} samples, Validation: {len(X_val)} samples")
    return X_train, X_val, y_train, y_val

def save_preprocessed_data(X_train: np.ndarray, X_val: np.ndarray,
                          y_train: np.ndarray, y_val: np.ndarray,
                          vocab: Dict[str, int], output_dir: str = './data'):
    """Save preprocessed data to disk."""
    os.makedirs(output_dir, exist_ok=True)
    
    np.save(f'{output_dir}/X_train.npy', X_train)
    np.save(f'{output_dir}/X_val.npy', X_val)
    np.save(f'{output_dir}/y_train.npy', y_train)
    np.save(f'{output_dir}/y_val.npy', y_val)
    
    with open(f'{output_dir}/vocab.json', 'w') as f:
        json.dump(vocab, f, indent=2)
    
    print(f"Preprocessed data saved to {output_dir}/")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Preprocess clickstream data for LSTM training')
    parser.add_argument('--input', type=str, default=None,
                       help='Path to input clickstream data file (CSV or JSON)')
    parser.add_argument('--output', type=str, default='./data',
                       help='Output directory for preprocessed data')
    parser.add_argument('--context-size', type=int, default=CONTEXT_SIZE,
                       help='Sliding window context size (default: 5)')
    parser.add_argument('--train-split', type=float, default=TRAIN_SPLIT,
                       help='Fraction of data for training (default: 0.8)')
    parser.add_argument('--mock-sessions', type=int, default=10000,
                       help='Number of mock sessions if no input file')
    
    args = parser.parse_args()
    
    # Load or generate data
    if args.input and os.path.exists(args.input):
        print(f"Loading data from {args.input}...")
        if args.input.endswith('.csv'):
            df = pd.read_csv(args.input)
        else:
            df = pd.read_json(args.input)
    else:
        print("No input file provided. Generating synthetic data...")
        df = generate_synthetic_clickstream(num_sessions=args.mock_sessions)
    
    # Create vocabulary
    print("Creating vocabulary...")
    vocab = create_route_vocabulary(df)
    print(f"Vocabulary size: {len(vocab)} routes")
    
    # Create sequences with context size = 5
    print("Creating sequences with sliding window...")
    X, y = create_sequences(df, vocab, context_size=args.context_size)
    
    # Normalize
    print("Normalizing sequences...")
    X = normalize_sequences(X, len(vocab))
    
    # Split data (80/20)
    print("Splitting data...")
    X_train, X_val, y_train, y_val = split_data(X, y, train_split=args.train_split)
    
    # Save preprocessed data
    print("Saving preprocessed data...")
    save_preprocessed_data(X_train, X_val, y_train, y_val, vocab, output_dir=args.output)
    
    print("\nPreprocessing complete!")
    print(f"Context size: {args.context_size}")
    print(f"Vocabulary size: {len(vocab)}")
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")

if __name__ == '__main__':
    main()

