import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { MetricSample } from '@/lib/metrics'
import { aggregateMetrics } from '@/lib/metrics'

// In-memory storage (alternative to file-based storage)
// In production, you'd use a database
let metricsStore: MetricSample[] = []

// File path for persistent storage (optional)
const METRICS_FILE = join(process.cwd(), 'metrics-store.json')

/**
 * Load metrics from file if it exists
 */
function loadMetricsFromFile(): void {
  try {
    if (existsSync(METRICS_FILE)) {
      const fileContent = readFileSync(METRICS_FILE, 'utf-8')
      metricsStore = JSON.parse(fileContent)
    }
  } catch (error) {
    console.error('Error loading metrics from file:', error)
    metricsStore = []
  }
}

/**
 * Save metrics to file
 */
function saveMetricsToFile(): void {
  try {
    writeFileSync(METRICS_FILE, JSON.stringify(metricsStore, null, 2))
  } catch (error) {
    console.error('Error saving metrics to file:', error)
  }
}

// Load metrics on server startup
if (typeof window === 'undefined') {
  loadMetricsFromFile()
}

/**
 * POST /api/web-vitals
 * Store a new metric sample
 */
export async function POST(request: NextRequest) {
  try {
    // Load existing metrics from file
    loadMetricsFromFile()
    
    const body = await request.json()

    // Validate metric sample
    const requiredFields = ['name', 'value', 'id', 'delta', 'rating', 'navigationType']
    for (const field of requiredFields) {
      if (!(field in body)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate metric name
    const validNames = ['TTFB', 'LCP', 'FID', 'CLS']
    if (!validNames.includes(body.name)) {
      return NextResponse.json(
        { error: `Invalid metric name: ${body.name}` },
        { status: 400 }
      )
    }

    // Validate value is a number
    if (typeof body.value !== 'number' || isNaN(body.value)) {
      return NextResponse.json(
        { error: 'Metric value must be a number' },
        { status: 400 }
      )
    }

    const metricSample: MetricSample = {
      name: body.name,
      value: body.value,
      id: body.id,
      delta: body.delta,
      rating: body.rating,
      navigationType: body.navigationType,
      timestamp: body.timestamp || Date.now(),
    }

    // Add to store
    metricsStore.push(metricSample)

    // Persist to file
    saveMetricsToFile()

    return NextResponse.json(
      { success: true, message: 'Metric stored', sampleCount: metricsStore.length },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error storing metric:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/web-vitals
 * Return aggregated metrics
 */
export async function GET() {
  try {
    // Reload from file to ensure we have latest data
    loadMetricsFromFile()

    // Aggregate metrics
    const aggregated = aggregateMetrics(metricsStore)

    return NextResponse.json(aggregated, { status: 200 })
  } catch (error) {
    console.error('Error retrieving metrics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

