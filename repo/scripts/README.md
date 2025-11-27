# Verification Scripts

## verify-ai-setup.js

Verifies that the AI model is properly set up and will be used (not fallback).

### Usage

```bash
npm run verify:ai
```

### What it checks

1. ✅ Public directory exists
2. ✅ Model directory exists (`public/models/tfjs_model/`)
3. ✅ Model JSON file exists (`model.json`)
4. ✅ Vocabulary file exists (`vocab.json`)
5. ✅ Model weight files exist (`.bin` files)
6. ✅ Environment configuration
7. ✅ Code integration

### Output

- ✅ **All checks passed**: Model is ready, app will use LSTM
- ❌ **Some checks failed**: Model missing, app will use fallback

### After fixing issues

Re-run the script to verify:
```bash
npm run verify:ai
```

Then start the app and check console logs:
```bash
npm run dev
# Look for: [AI-MODEL] ✅ TensorFlow.js model loaded successfully
```

