#!/bin/bash
# Setup script for AI model directory structure
# This creates the necessary directories for model deployment

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_MODELS="${REPO_ROOT}/public/models/tfjs_model"

echo "🔧 Setting up AI model directory structure..."
echo ""

# Create directory structure
mkdir -p "${PUBLIC_MODELS}"

echo "✅ Created directory: ${PUBLIC_MODELS}"
echo ""

# Check if model files exist in ai-model directory
AI_MODEL_DIR="${REPO_ROOT}/../tests/ai-model"
if [ -d "${AI_MODEL_DIR}/models/tfjs_model" ]; then
    echo "📦 Found TensorFlow.js model in ${AI_MODEL_DIR}/models/tfjs_model"
    echo ""
    read -p "Copy model files to public directory? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📋 Copying model files..."
        cp -r "${AI_MODEL_DIR}/models/tfjs_model/"* "${PUBLIC_MODELS}/"
        
        if [ -f "${AI_MODEL_DIR}/data/vocab.json" ]; then
            echo "📋 Copying vocabulary..."
            cp "${AI_MODEL_DIR}/data/vocab.json" "${PUBLIC_MODELS}/"
        fi
        
        echo "✅ Model files copied successfully"
        echo ""
        echo "🔍 Verifying setup..."
        node "${REPO_ROOT}/scripts/verify-ai-setup.js"
    else
        echo "⏭️  Skipped copying. You can copy manually later."
    fi
else
    echo "⚠️  Model files not found in ${AI_MODEL_DIR}/models/tfjs_model"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Train model: cd ${AI_MODEL_DIR} && jupyter notebook lstm-train.ipynb"
    echo "   2. Convert to TF.js: tensorflowjs_converter --input_format=keras ./models/lstm_final_model.h5 ./models/tfjs_model/"
    echo "   3. Run this script again to copy files"
    echo ""
fi

echo ""
echo "📁 Directory structure ready:"
echo "   ${PUBLIC_MODELS}"
echo ""
echo "📖 See ${PUBLIC_MODELS}/README.md for detailed instructions"

