#!/bin/bash
# Deploy AI model files to public directory
# This script copies trained and converted model files to the correct location

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AI_MODEL_DIR="${REPO_ROOT}/../tests/ai-model"
PUBLIC_MODELS="${REPO_ROOT}/public/models/tfjs_model"

echo "🚀 Deploying AI Model Files"
echo "============================"
echo ""

# Check if source directory exists
if [ ! -d "${AI_MODEL_DIR}/models/tfjs_model" ]; then
    echo "❌ Error: Model files not found in ${AI_MODEL_DIR}/models/tfjs_model"
    echo ""
    echo "📝 Please train and convert the model first:"
    echo "   1. cd ${AI_MODEL_DIR}"
    echo "   2. python dataset-prep.py --output ./data --sequence-length 5 --mock-sessions 200000"
    echo "   3. jupyter notebook lstm-train.ipynb"
    echo "   4. tensorflowjs_converter --input_format=keras ./models/lstm_final_model.h5 ./models/tfjs_model/"
    exit 1
fi

# Create target directory
mkdir -p "${PUBLIC_MODELS}"

echo "📦 Copying TensorFlow.js model files..."
cp -r "${AI_MODEL_DIR}/models/tfjs_model/"* "${PUBLIC_MODELS}/"

# Check if vocab.json exists
if [ -f "${AI_MODEL_DIR}/data/vocab.json" ]; then
    echo "📦 Copying vocabulary file..."
    cp "${AI_MODEL_DIR}/data/vocab.json" "${PUBLIC_MODELS}/"
else
    echo "⚠️  Warning: vocab.json not found in ${AI_MODEL_DIR}/data/"
    echo "   You may need to copy it manually after dataset preparation"
fi

echo ""
echo "✅ Model files deployed successfully!"
echo ""
echo "📁 Files in ${PUBLIC_MODELS}:"
ls -lh "${PUBLIC_MODELS}" | tail -n +2 || echo "   (empty)"
echo ""

# Verify deployment
echo "🔍 Verifying deployment..."
node "${REPO_ROOT}/scripts/verify-ai-setup.js"

