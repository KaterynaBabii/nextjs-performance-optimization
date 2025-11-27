/**
 * Prefetch Service - AI Model Integration (SERVER-SIDE ONLY)
 * 
 * Integrates with TensorFlow.js LSTM model for route prediction
 * 
 * STRICT RULES:
 * - NO imports of next/router or next/navigation
 * - NO prefetching logic (only prediction)
 * - Safe to run in Middleware, API routes, or Server Components
 * - Returns only route predictions (array of strings)
 * 
 * For client-side prefetching, use clientPrefetch.ts
 */

// In production, this would load the actual TensorFlow.js model
// For now, we use a rule-based fallback that simulates model predictions

/**
 * Predict next routes based on path history
 * 
 * SERVER-SIDE ONLY - Does not use router or any client-side APIs
 * 
 * @param paths - Array of recent navigation paths (max 5)
 * @returns Array of predicted route strings (top 3)
 */
export async function getPredictedRoutes(paths: string[]): Promise<string[]> {
  // Ensure this is server-side only
  if (typeof window !== 'undefined') {
    throw new Error('getPredictedRoutes can only be called on the server side')
  }

  // In production, this would:
  // 1. Load the TensorFlow.js model
  // 2. Convert paths to tokenized sequences
  // 3. Run inference
  // 4. Return top-3 route strings

  // For reproducibility, we use a rule-based predictor
  // that mimics LSTM behavior based on common navigation patterns

  if (!paths || paths.length === 0) {
    return []
  }

  const lastPath = paths[paths.length - 1]
  const predictions: string[] = []

  // Rule-based prediction patterns
  if (lastPath === '/') {
    predictions.push('/category/1', '/category/2', '/profile')
  } else if (lastPath.startsWith('/category/')) {
    const categoryId = lastPath.split('/')[2]
    predictions.push(`/category/${categoryId}`, '/product/1', '/product/2')
  } else if (lastPath.startsWith('/product/')) {
    const productId = lastPath.split('/')[2]
    predictions.push('/category/1', `/product/${parseInt(productId) + 1}`, '/')
  } else if (lastPath === '/profile') {
    predictions.push('/', '/category/1', '/category/2')
  } else {
    // Default predictions
    predictions.push('/', '/category/1', '/profile')
  }

  // Return top-3 routes
  return predictions.slice(0, 3)
}

/**
 * Legacy function for backward compatibility
 * Returns predictions with probabilities
 * 
 * @deprecated Use getPredictedRoutes() for new code
 */
export async function predictNextRoutes(paths: string[]): Promise<Array<{ route: string; probability: number }>> {
  const routes = await getPredictedRoutes(paths)
  // Assign equal probabilities for simplicity
  const probability = 1 / routes.length
  return routes.map(route => ({ route, probability }))
}

/**
 * Load TensorFlow.js model (for production use)
 * 
 * This function would load the actual trained model:
 * 
 * import * as tf from '@tensorflow/tfjs'
 * 
 * export async function loadModel() {
 *   const model = await tf.loadLayersModel('/models/lstm-model.json')
 *   return model
 * }
 */

