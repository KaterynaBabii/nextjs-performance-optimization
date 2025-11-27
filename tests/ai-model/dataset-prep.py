"""
Dataset Preparation Script
Preprocesses clickstream data into sequences for LSTM training

Generates mock clickstream data if no dataset is provided.
In production, replace with real clickstream data.
"""

import numpy as np
import pandas as pd
import json
from typing import List, Tuple, Dict
import os

# Configuration
SEQUENCE_LENGTH = 20
EMBEDDING_SIZE = 64
BATCH_SIZE = 64
TRAIN_SPLIT = 0.8

def generate_mock_clickstream_data(num_sessions: int = 10000, num_pages: int = 50) -> pd.DataFrame:
    """
    Generate mock clickstream data for testing.
    
    In production, replace this with real clickstream data loading.
    
    Args:
        num_sessions: Number of user sessions to generate
        num_pages: Number of unique pages
    
    Returns:
        DataFrame with columns: session_id, page_id, timestamp, user_id
    """
    print(f"Generating {num_sessions} mock sessions with {num_pages} pages...")
    
    sessions = []
    page_ids = [f"page_{i}" for i in range(num_pages)]
    
    for session_id in range(num_sessions):
        # Each session has 5-30 page views
        num_views = np.random.randint(5, 31)
        user_id = np.random.randint(0, num_sessions // 10)  # 10% unique users
        
        for view_idx in range(num_views):
            # Simulate realistic navigation patterns
            if view_idx == 0:
                # First page is usually home
                page_id = "page_0"
            elif view_idx < 3:
                # Early pages are common navigation paths
                page_id = np.random.choice(["page_0", "page_1", "page_2", "page_3"], 
                                          p=[0.3, 0.3, 0.2, 0.2])
            else:
                # Later pages follow transition probabilities
                page_id = np.random.choice(page_ids)
            
            timestamp = session_id * 1000 + view_idx * 1000 + np.random.randint(0, 5000)
            
            sessions.append({
                'session_id': session_id,
                'user_id': user_id,
                'page_id': page_id,
                'timestamp': timestamp,
            })
    
    df = pd.DataFrame(sessions)
    print(f"Generated {len(df)} page views across {df['session_id'].nunique()} sessions")
    return df

def load_real_clickstream_data(filepath: str) -> pd.DataFrame:
    """
    Load real clickstream data from file.
    
    Expected format: CSV or JSON with columns:
    - session_id: unique session identifier
    - page_id: page identifier
    - timestamp: timestamp of page view
    - user_id: (optional) user identifier
    
    Args:
        filepath: Path to clickstream data file
    
    Returns:
        DataFrame with clickstream data
    """
    if filepath.endswith('.csv'):
        df = pd.read_csv(filepath)
    elif filepath.endswith('.json'):
        df = pd.read_json(filepath)
    else:
        raise ValueError(f"Unsupported file format: {filepath}")
    
    required_columns = ['session_id', 'page_id', 'timestamp']
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    
    return df

def create_page_vocabulary(df: pd.DataFrame) -> Dict[str, int]:
    """
    Create vocabulary mapping page IDs to integers.
    
    Args:
        df: DataFrame with page_id column
    
    Returns:
        Dictionary mapping page_id to integer index
    """
    unique_pages = sorted(df['page_id'].unique())
    vocab = {page_id: idx for idx, page_id in enumerate(unique_pages)}
    # Add special tokens
    vocab['<PAD>'] = len(vocab)
    vocab['<UNK>'] = len(vocab)
    return vocab

def create_sequences(df: pd.DataFrame, vocab: Dict[str, int], 
                    sequence_length: int = SEQUENCE_LENGTH) -> Tuple[np.ndarray, np.ndarray]:
    """
    Convert clickstream data into sequences for LSTM training.
    
    Args:
        df: DataFrame with clickstream data
        vocab: Vocabulary mapping page_id to integer
        sequence_length: Length of input sequences
    
    Returns:
        Tuple of (X, y) where:
        - X: Input sequences of shape (num_sequences, sequence_length)
        - y: Target pages of shape (num_sequences,)
    """
    sequences = []
    targets = []
    
    # Group by session
    for session_id, session_df in df.groupby('session_id'):
        session_df = session_df.sort_values('timestamp')
        page_ids = session_df['page_id'].values
        
        # Convert to integer indices
        page_indices = [vocab.get(pid, vocab['<UNK>']) for pid in page_ids]
        
        # Create sequences
        for i in range(len(page_indices) - sequence_length):
            seq = page_indices[i:i + sequence_length]
            target = page_indices[i + sequence_length]
            sequences.append(seq)
            targets.append(target)
    
    X = np.array(sequences, dtype=np.int32)
    y = np.array(targets, dtype=np.int32)
    
    print(f"Created {len(sequences)} sequences from {df['session_id'].nunique()} sessions")
    return X, y

def split_data(X: np.ndarray, y: np.ndarray, train_split: float = TRAIN_SPLIT) -> Tuple:
    """
    Split data into train and validation sets.
    
    Args:
        X: Input sequences
        y: Target values
        train_split: Fraction of data for training
    
    Returns:
        Tuple of (X_train, X_val, y_train, y_val)
    """
    split_idx = int(len(X) * train_split)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]
    
    print(f"Train: {len(X_train)} samples, Validation: {len(X_val)} samples")
    return X_train, X_val, y_train, y_val

def save_preprocessed_data(X_train: np.ndarray, X_val: np.ndarray,
                          y_train: np.ndarray, y_val: np.ndarray,
                          vocab: Dict[str, int], output_dir: str = './data'):
    """
    Save preprocessed data to disk.
    
    Args:
        X_train, X_val: Training and validation sequences
        y_train, y_val: Training and validation targets
        vocab: Vocabulary mapping
        output_dir: Directory to save files
    """
    os.makedirs(output_dir, exist_ok=True)
    
    np.save(f'{output_dir}/X_train.npy', X_train)
    np.save(f'{output_dir}/X_val.npy', X_val)
    np.save(f'{output_dir}/y_train.npy', y_train)
    np.save(f'{output_dir}/y_val.npy', y_val)
    
    with open(f'{output_dir}/vocab.json', 'w') as f:
        json.dump(vocab, f, indent=2)
    
    print(f"Preprocessed data saved to {output_dir}/")

def main():
    """
    Main preprocessing pipeline.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Preprocess clickstream data for LSTM training')
    parser.add_argument('--input', type=str, default=None,
                       help='Path to input clickstream data file (CSV or JSON). If not provided, generates mock data.')
    parser.add_argument('--output', type=str, default='./data',
                       help='Output directory for preprocessed data')
    parser.add_argument('--sequence-length', type=int, default=SEQUENCE_LENGTH,
                       help='Length of input sequences')
    parser.add_argument('--train-split', type=float, default=TRAIN_SPLIT,
                       help='Fraction of data for training')
    parser.add_argument('--mock-sessions', type=int, default=10000,
                       help='Number of mock sessions to generate if no input file provided')
    
    args = parser.parse_args()
    
    # Load or generate data
    if args.input and os.path.exists(args.input):
        print(f"Loading data from {args.input}...")
        df = load_real_clickstream_data(args.input)
    else:
        print("No input file provided. Generating mock data...")
        df = generate_mock_clickstream_data(num_sessions=args.mock_sessions)
    
    # Create vocabulary
    print("Creating vocabulary...")
    vocab = create_page_vocabulary(df)
    print(f"Vocabulary size: {len(vocab)} pages")
    
    # Create sequences
    print("Creating sequences...")
    X, y = create_sequences(df, vocab, sequence_length=args.sequence_length)
    
    # Split data
    print("Splitting data...")
    X_train, X_val, y_train, y_val = split_data(X, y, train_split=args.train_split)
    
    # Save preprocessed data
    print("Saving preprocessed data...")
    save_preprocessed_data(X_train, X_val, y_train, y_val, vocab, output_dir=args.output)
    
    print("\nPreprocessing complete!")
    print(f"Vocabulary size: {len(vocab)}")
    print(f"Training samples: {len(X_train)}")
    print(f"Validation samples: {len(X_val)}")
    print(f"Sequence length: {args.sequence_length}")

if __name__ == '__main__':
    main()

