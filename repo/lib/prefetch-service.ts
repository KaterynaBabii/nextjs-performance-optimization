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
 * 
 * Model Architecture (per paper):
 * - Embedding(128)
 * - LSTM(64) -> LSTM(32)
 * - Dense(softmax)
 * - Context window: 5 routes
 */

// TensorFlow.js import
// Note: Edge Runtime (middleware) may not support @tensorflow/tfjs-node
// In that case, the code will gracefully fall back to rule-based prediction
import * as tf from '@tensorflow/tfjs-node'

// Model and vocabulary cache (loaded once)
let model: tf.LayersModel | null = null
let vocab: Record<string, number> | null = null
let reverseVocab: Record<number, string> | null = null
let modelLoadPromise: Promise<void> | null = null

/**
 * Load TensorFlow.js model and vocabulary
 * 
 * Model should be converted from Python Keras model using:
 * tensorflowjs_converter --input_format=keras ./models/lstm_final_model.h5 ./models/tfjs_model/
 */
async function loadModel(): Promise<void> {
  if (model && vocab) {
    return // Already loaded
  }

  if (modelLoadPromise) {
    return modelLoadPromise // Loading in progress
  }

  modelLoadPromise = (async () => {
    try {
      // Load model from public directory (or CDN)
      // In production, this would be:
      // const modelUrl = process.env.MODEL_URL || '/models/tfjs_model/model.json'
      // For now, we use a fallback if model is not available
      
      const modelUrl = process.env.MODEL_URL || '/models/tfjs_model/model.json'
      
      try {
        model = await tf.loadLayersModel(modelUrl)
        console.log('[PREFETCH-SERVICE] TensorFlow.js model loaded successfully')
      } catch (error) {
        // Edge Runtime may not support tfjs-node, gracefully fall back
        console.warn('[PREFETCH-SERVICE] Could not load TensorFlow.js model, using rule-based fallback:', error)
        model = null
      }

      // Load vocabulary
      // In production, this would be from the same directory as the model
      try {
        const vocabUrl = process.env.VOCAB_URL || '/models/tfjs_model/vocab.json'
        const vocabResponse = await fetch(vocabUrl)
        if (vocabResponse.ok) {
          vocab = await vocabResponse.json()
          reverseVocab = Object.fromEntries(
            Object.entries(vocab).map(([k, v]) => [v, k])
          )
          console.log('[PREFETCH-SERVICE] Vocabulary loaded successfully')
        }
      } catch (error) {
        console.warn('[PREFETCH-SERVICE] Could not load vocabulary, using rule-based fallback:', error)
        vocab = null
        reverseVocab = null
      }
    } catch (error) {
      console.error('[PREFETCH-SERVICE] Error loading model:', error)
      model = null
      vocab = null
      reverseVocab = null
    }
  })()

  return modelLoadPromise
}

/**
 * Convert route paths to tokenized sequence
 * 
 * @param paths - Array of route paths (max 5 for context window)
 * @returns Tokenized sequence array of length 5 (padded if needed)
 */
function pathsToSequence(paths: string[]): number[] {
  if (!vocab) {
    return []
  }

  // Take last 5 paths (context window size)
  const recentPaths = paths.slice(-5)
  
  // Convert paths to tokens
  const sequence = recentPaths.map(path => vocab![path] ?? vocab!['<UNK>'] ?? 0)
  
  // Pad to length 5 if needed
  while (sequence.length < 5) {
    sequence.unshift(vocab!['<PAD>'] ?? 0)
  }

  return sequence.slice(-5) // Ensure exactly 5 tokens
}

/**
 * Predict next routes using TensorFlow.js model
 * 
 * @param paths - Array of recent navigation paths (max 5)
 * @returns Array of predicted route strings (top 3)
 */
async function predictWithModel(paths: string[]): Promise<string[]> {
  if (!model || !vocab || !reverseVocab) {
    return [] // Fall back to rule-based
  }

  try {
    // Convert paths to sequence
    const sequence = pathsToSequence(paths)
    if (sequence.length !== 5) {
      return []
    }

    // Create tensor: shape [1, 5]
    const inputTensor = tf.tensor2d([sequence], [1, 5])

    // Run inference
    const predictions = model.predict(inputTensor) as tf.Tensor

    // Get top-3 predictions
    const topK = await tf.topk(predictions, 3)
    const topIndices = await topK.indices.array() as number[][]
    const topValues = await topK.values.array() as number[][]

    // Clean up tensors
    inputTensor.dispose()
    predictions.dispose()
    topK.indices.dispose()
    topK.values.dispose()

    // Convert indices to route strings
    const predictedRoutes: string[] = []
    for (let i = 0; i < 3 && i < topIndices[0].length; i++) {
      const idx = topIndices[0][i]
      const route = reverseVocab![idx]
      if (route && route !== '<PAD>' && route !== '<UNK>') {
        predictedRoutes.push(route)
      }
    }

    return predictedRoutes
  } catch (error) {
    console.error('[PREFETCH-SERVICE] Model inference error:', error)
    return [] // Fall back to rule-based
  }
}

/**
 * Predict next routes based on path history
 * 
 * SERVER-SIDE ONLY - Does not use router or any client-side APIs
 * 
 * Uses TensorFlow.js LSTM model if available, otherwise falls back to rule-based prediction.
 * 
 * @param paths - Array of recent navigation paths (max 5 for context window)
 * @returns Array of predicted route strings (top 3)
 */
export async function getPredictedRoutes(paths: string[]): Promise<string[]> {
  // Ensure this is server-side only
  if (typeof window !== 'undefined') {
    throw new Error('getPredictedRoutes can only be called on the server side')
  }

  if (!paths || paths.length === 0) {
    return []
  }

  // Try to load model if not already loaded
  await loadModel()

  // Try to use TensorFlow.js model first
  if (model && vocab) {
    const modelPredictions = await predictWithModel(paths)
    if (modelPredictions.length > 0) {
      return modelPredictions.slice(0, 3)
    }
  }

  // Fallback to rule-based prediction (for reproducibility when model not available)
  const lastPath = paths[paths.length - 1]
  const predictions: string[] = []

  // Rule-based prediction patterns (mimics common navigation flows)
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
 * CDN Prewarm Helper
 * 
 * Triggers background fetches to prewarm CDN cache for predicted routes.
 * This implements the paper's claim: "integrating with the CDN cache to prewarm edge nodes"
 * 
 * @param routes - Array of predicted routes to prewarm
 * @param baseUrl - Base URL for the application
 */
export async function prewarmCDNCache(routes: string[], baseUrl: string = ''): Promise<void> {
  // Fire-and-forget: don't await, don't block
  // This runs in background to prewarm CDN cache without affecting user request latency
  
  if (!routes || routes.length === 0) {
    return
  }

  // Use setImmediate or setTimeout to defer execution
  setImmediate(() => {
    routes.forEach(async (route) => {
      try {
        const url = `${baseUrl}${route.startsWith('/') ? route : `/${route}`}`
        
        // HEAD request to prewarm cache without downloading full content
        // This triggers CDN cache warming without significant bandwidth
        await fetch(url, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'CDN-Prewarm-Agent/1.0',
          },
        }).catch(() => {
          // Silently fail - prewarm is non-critical
        })
      } catch (error) {
        // Silently fail - prewarm is non-critical
      }
    })
  })
}

