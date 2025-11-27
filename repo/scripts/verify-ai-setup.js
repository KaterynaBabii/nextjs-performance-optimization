#!/usr/bin/env node
/**
 * AI Setup Verification Script
 * 
 * Verifies that the AI model is properly set up and will be used (not fallback)
 */

const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.join(__dirname, '..')
const PUBLIC_MODELS = path.join(REPO_ROOT, 'public', 'models', 'tfjs_model')
const MODEL_JSON = path.join(PUBLIC_MODELS, 'model.json')
const VOCAB_JSON = path.join(PUBLIC_MODELS, 'vocab.json')

console.log('🔍 AI Setup Verification\n')
console.log('=' .repeat(50))

let allChecksPassed = true

// Check 1: Public directory exists
console.log('\n1️⃣  Checking public directory...')
if (!fs.existsSync(path.join(REPO_ROOT, 'public'))) {
  console.log('   ❌ public/ directory does not exist')
  console.log('   → Create: mkdir -p repo/public/models/tfjs_model')
  allChecksPassed = false
} else {
  console.log('   ✅ public/ directory exists')
}

// Check 2: Model directory exists
console.log('\n2️⃣  Checking model directory...')
if (!fs.existsSync(PUBLIC_MODELS)) {
  console.log('   ❌ models/tfjs_model/ directory does not exist')
  console.log('   → Create: mkdir -p repo/public/models/tfjs_model')
  allChecksPassed = false
} else {
  console.log('   ✅ models/tfjs_model/ directory exists')
}

// Check 3: Model JSON file exists
console.log('\n3️⃣  Checking model.json...')
if (!fs.existsSync(MODEL_JSON)) {
  console.log('   ❌ model.json not found')
  console.log('   → Expected: repo/public/models/tfjs_model/model.json')
  console.log('   → Convert model: tensorflowjs_converter --input_format=keras ./models/lstm_final_model.h5 ./models/tfjs_model/')
  allChecksPassed = false
} else {
  const modelStats = fs.statSync(MODEL_JSON)
  console.log('   ✅ model.json exists')
  console.log(`   📦 Size: ${(modelStats.size / 1024).toFixed(2)} KB`)
  
  // Try to parse and check structure
  try {
    const modelData = JSON.parse(fs.readFileSync(MODEL_JSON, 'utf8'))
    if (modelData.modelTopology) {
      console.log('   ✅ Model structure looks valid')
      if (modelData.modelTopology.layers) {
        console.log(`   📊 Layers: ${modelData.modelTopology.layers.length}`)
      }
    }
  } catch (e) {
    console.log('   ⚠️  Could not parse model.json:', e.message)
  }
}

// Check 4: Vocabulary file exists
console.log('\n4️⃣  Checking vocab.json...')
if (!fs.existsSync(VOCAB_JSON)) {
  console.log('   ❌ vocab.json not found')
  console.log('   → Expected: repo/public/models/tfjs_model/vocab.json')
  console.log('   → Copy from: tests/ai-model/data/vocab.json')
  allChecksPassed = false
} else {
  const vocabStats = fs.statSync(VOCAB_JSON)
  console.log('   ✅ vocab.json exists')
  console.log(`   📦 Size: ${(vocabStats.size / 1024).toFixed(2)} KB`)
  
  // Try to parse and check structure
  try {
    const vocab = JSON.parse(fs.readFileSync(VOCAB_JSON, 'utf8'))
    const vocabSize = Object.keys(vocab).length
    console.log(`   📊 Vocabulary size: ${vocabSize} tokens`)
    
    // Check for required special tokens
    if (vocab['<PAD>'] !== undefined && vocab['<UNK>'] !== undefined) {
      console.log('   ✅ Special tokens (<PAD>, <UNK>) present')
    } else {
      console.log('   ⚠️  Special tokens may be missing')
    }
  } catch (e) {
    console.log('   ⚠️  Could not parse vocab.json:', e.message)
  }
}

// Check 5: Model weights files
console.log('\n5️⃣  Checking model weights...')
if (fs.existsSync(PUBLIC_MODELS)) {
  const files = fs.readdirSync(PUBLIC_MODELS)
  const weightFiles = files.filter(f => f.endsWith('.bin') || f.match(/weights\d+\.bin/))
  
  if (weightFiles.length === 0) {
    console.log('   ❌ No weight files found (.bin files)')
    console.log('   → Model conversion may be incomplete')
    allChecksPassed = false
  } else {
    console.log(`   ✅ Found ${weightFiles.length} weight file(s)`)
    weightFiles.forEach(f => {
      const size = fs.statSync(path.join(PUBLIC_MODELS, f)).size
      console.log(`      - ${f}: ${(size / 1024 / 1024).toFixed(2)} MB`)
    })
  }
}

// Check 6: Environment variables
console.log('\n6️⃣  Checking environment configuration...')
const envFile = path.join(REPO_ROOT, '.env.local')
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8')
  if (envContent.includes('MODEL_URL') || envContent.includes('AI_PREFETCH_ENABLED')) {
    console.log('   ✅ .env.local contains AI configuration')
  } else {
    console.log('   ⚠️  .env.local exists but no AI config found')
    console.log('   → Add: MODEL_URL=/models/tfjs_model/model.json')
    console.log('   → Add: AI_PREFETCH_ENABLED=true')
  }
} else {
  console.log('   ⚠️  .env.local not found (optional)')
  console.log('   → Create with: MODEL_URL=/models/tfjs_model/model.json')
}

// Check 7: Code integration
console.log('\n7️⃣  Checking code integration...')
const prefetchService = path.join(REPO_ROOT, 'lib', 'prefetch-service.ts')
if (fs.existsSync(prefetchService)) {
  const code = fs.readFileSync(prefetchService, 'utf8')
  if (code.includes('loadLayersModel')) {
    console.log('   ✅ prefetch-service.ts contains model loading code')
  }
  if (code.includes('predictWithModel')) {
    console.log('   ✅ prefetch-service.ts contains model prediction code')
  }
  if (code.includes('AI-FALLBACK')) {
    console.log('   ✅ Enhanced logging present')
  }
} else {
  console.log('   ❌ prefetch-service.ts not found')
  allChecksPassed = false
}

// Final summary
console.log('\n' + '='.repeat(50))
if (allChecksPassed) {
  console.log('\n✅ ALL CHECKS PASSED')
  console.log('   Your AI model is properly set up!')
  console.log('   The application will use the LSTM model (not fallback).')
  console.log('\n📝 Next steps:')
  console.log('   1. Start the app: npm run dev')
  console.log('   2. Check console for: [AI-MODEL] ✅ TensorFlow.js model loaded successfully')
  console.log('   3. Navigate pages and verify prefetch requests in Network tab')
} else {
  console.log('\n❌ SOME CHECKS FAILED')
  console.log('   The application will use rule-based fallback (not LSTM model).')
  console.log('\n📝 Required actions:')
  console.log('   1. Train model with correct architecture')
  console.log('   2. Convert to TensorFlow.js format')
  console.log('   3. Copy model files to repo/public/models/tfjs_model/')
  console.log('   4. Re-run this verification script')
  console.log('\n📖 See: IEEE-ACCESS-VERIFICATION-CHECKLIST.md for detailed steps')
}

console.log('\n')

