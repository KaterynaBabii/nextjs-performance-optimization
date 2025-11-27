/**
 * Prefetch API Route - AI Model Inference
 * 
 * Calls the LSTM model to predict next routes based on path history
 * Returns top-3 predicted routes for prefetching
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPredictedRoutes } from '@/lib/prefetch-service'

export const runtime = 'edge' // Use Edge Runtime for low latency

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { paths } = body

    if (!paths || !Array.isArray(paths) || paths.length < 3) {
      return NextResponse.json(
        { error: 'Invalid input: paths array with at least 3 elements required' },
        { status: 400 }
      )
    }

    // Get top-3 predicted routes (server-side only, no router)
    const routes = await getPredictedRoutes(paths.slice(-5)) // Use last 5 paths

    // Return in format compatible with legacy code
    const predictions = routes.map((route) => ({
      route,
      probability: 1 / routes.length, // Equal probability
    }))

    return NextResponse.json({
      predictions,
      routes, // Also include raw routes array
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('Prefetch API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}

