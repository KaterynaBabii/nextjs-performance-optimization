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

// TensorFlow.js import - dynamic import to support Edge Runtime
// Note: Edge Runtime (middleware) may not support @tensorflow/tfjs-node
// In that case, the code will gracefully fall back to rule-based prediction
// Using 'any' type to avoid TypeScript checking the module at compile time
let tf: any = null
let tfLoadPromise: Promise<boolean> | null = null

// Model and vocabulary cache (loaded once)
let model: any = null // tf.LayersModel | null
let vocab: Record<string, number> | null = null
let reverseVocab: Record<number, string> | null = null
let modelLoadPromise: Promise<void> | null = null

/**
 * Dynamically load TensorFlow.js - only when needed and only if available
 * This allows the code to work in Edge Runtime where tfjs-node may not be available
 */
async function loadTensorFlow(): Promise<boolean> {
  if (tf) {
    return true // Already loaded
  }

  if (tfLoadPromise) {
    return await tfLoadPromise
  }

  tfLoadPromise = (async (): Promise<boolean> => {
    try {
      // Try to load tfjs-node (Node.js runtime) using dynamic import
      // In Edge Runtime, this will fail gracefully
      // Using string literal to avoid TypeScript module resolution at compile time
      const tfModule = await import('@tensorflow/tfjs-node' as string)
      tf = tfModule
      console.log('[AI-MODEL] ✅ TensorFlow.js loaded successfully')
      return true
    } catch (error) {
      console.warn('[AI-MODEL] ⚠️ Could not load @tensorflow/tfjs-node, using rule-based fallback')
      console.warn('[AI-MODEL] Error:', error instanceof Error ? error.message : String(error))
      tf = null
      return false
    }
  })()

  return await tfLoadPromise
}

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
      // First, try to load TensorFlow.js
      const tfLoaded = await loadTensorFlow()
      if (!tfLoaded || !tf) {
        console.warn('[AI-MODEL] ⚠️ TensorFlow.js not available, using rule-based fallback')
        model = null
        vocab = null
        reverseVocab = null
        return
      }

      // Load model from public directory (or CDN)
      // In production, this would be:
      // const modelUrl = process.env.MODEL_URL || '/models/tfjs_model/model.json'
      // For now, we use a fallback if model is not available
      
      const modelUrl = process.env.MODEL_URL || '/models/tfjs_model/model.json'
      
      try {
        model = await tf.loadLayersModel(modelUrl)
        console.log('[AI-MODEL] ✅ TensorFlow.js model loaded successfully from:', modelUrl)
        console.log('[AI-MODEL] Model architecture:', {
          layers: model.layers.length,
          trainableParams: model.countParams()
        })
      } catch (error) {
        // Edge Runtime may not support tfjs-node, gracefully fall back
        console.warn('[AI-MODEL] ❌ Could not load TensorFlow.js model, using rule-based fallback')
        console.warn('[AI-MODEL] Error details:', error instanceof Error ? error.message : String(error))
        console.warn('[AI-MODEL] Model URL attempted:', modelUrl)
        console.warn('[AI-FALLBACK] ⚠️ AI-enhanced experiments will use rule-based prediction, not LSTM model')
        model = null
      }

      // Load vocabulary
      // In production, this would be from the same directory as the model
      const vocabUrl = process.env.VOCAB_URL || '/models/tfjs_model/vocab.json'
      try {
        const vocabResponse = await fetch(vocabUrl)
        if (vocabResponse.ok) {
          vocab = await vocabResponse.json()
          if (vocab) {
            reverseVocab = Object.fromEntries(
              Object.entries(vocab).map(([k, v]) => [v, k])
            )
            console.log('[AI-MODEL] ✅ Vocabulary loaded successfully, size:', Object.keys(vocab).length)
          }
        }
      } catch (error) {
        console.warn('[AI-MODEL] ❌ Could not load vocabulary, using rule-based fallback')
        console.warn('[AI-MODEL] Vocab URL attempted:', vocabUrl)
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
  if (!model || !vocab || !reverseVocab || !tf) {
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
    const predictions = model.predict(inputTensor) as any

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
    const inferenceStart = Date.now()
    const modelPredictions = await predictWithModel(paths)
    const inferenceTime = Date.now() - inferenceStart
    
    if (modelPredictions.length > 0) {
      console.log('[AI-INFERENCE] ✅ LSTM model prediction:', {
        inputPaths: paths,
        predictions: modelPredictions,
        inferenceTime: `${inferenceTime}ms`
      })
      return modelPredictions.slice(0, 3)
    }
  } else {
    console.log('[AI-FALLBACK] ⚠️ Using rule-based prediction (model not available)')
  }

  // Fallback to rule-based prediction (for reproducibility when model not available)
  console.log('[AI-FALLBACK] Using rule-based prediction for paths:', paths)
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
  const finalPredictions = predictions.slice(0, 3)
  console.log('[AI-FALLBACK] Rule-based predictions:', finalPredictions)
  return finalPredictions
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

