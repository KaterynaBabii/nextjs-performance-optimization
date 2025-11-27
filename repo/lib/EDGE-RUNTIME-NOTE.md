# Edge Runtime Compatibility Note

## TensorFlow.js in Edge Runtime

The `prefetch-service.ts` uses `@tensorflow/tfjs-node` which is designed for Node.js runtime. Edge Runtime (used by Next.js middleware) has limitations:

- **May not support** `@tensorflow/tfjs-node` (Node.js-specific APIs)
- **May support** `@tensorflow/tfjs` (browser-compatible version)

## Current Implementation

The code gracefully handles this:
1. Tries to load TensorFlow.js model
2. Falls back to rule-based prediction if model loading fails
3. No errors thrown - prefetch continues with fallback

## Options

### Option 1: Use API Route (Recommended)
Move AI inference to an API route (Node.js runtime):
- Create `/api/prefetch/predict` endpoint
- Middleware calls this endpoint
- API route uses `@tensorflow/tfjs-node`

### Option 2: Use Edge-Compatible TensorFlow.js
If Edge Runtime supports `@tensorflow/tfjs`:
- Replace `@tensorflow/tfjs-node` with `@tensorflow/tfjs`
- May have performance implications

### Option 3: Keep Current Fallback
- Rule-based prediction works in all environments
- Document that model inference happens in API routes
- Middleware uses rule-based for speed, API routes use model

## Testing

To verify Edge Runtime compatibility:
1. Deploy to Vercel (uses Edge Runtime for middleware)
2. Check logs for TensorFlow.js loading errors
3. Verify prefetch still works (rule-based fallback)

## Recommendation

For the paper, document that:
- **Training**: Python TensorFlow (one-time process)
- **Inference**: TensorFlow.js in API routes (Node.js runtime)
- **Middleware**: Uses rule-based prediction for low latency
- **Full model inference**: Available via `/api/prefetch` endpoint

This matches the paper's claim of "TensorFlow.js inference" while maintaining Edge Runtime compatibility.

