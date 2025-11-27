'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { AggregatedMetrics, MetricComparison } from '@/lib/metrics'
import { compareMetrics } from '@/lib/metrics'

export default function MetricsPage() {
  const [aggregated, setAggregated] = useState<AggregatedMetrics | null>(null)
  const [comparisons, setComparisons] = useState<MetricComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true)
        const response = await fetch('/api/web-vitals')
        if (!response.ok) {
          throw new Error('Failed to fetch metrics')
        }
        const data: AggregatedMetrics = await response.json()
        setAggregated(data)
        setComparisons(compareMetrics(data))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    // Refresh every 5 seconds to get latest metrics
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  const formatValue = (value: number | null, unit: string): string => {
    if (value === null) return 'N/A'
    return `${value.toFixed(2)} ${unit}`
  }

  const formatPercent = (value: number | null): string => {
    if (value === null) return 'N/A'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const formatDiff = (value: number | null, unit: string): string => {
    if (value === null) return 'N/A'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)} ${unit}`
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: '1rem',
            color: '#0070f3',
          }}
        >
          ← Back to Home
        </Link>
        <h1>Core Web Vitals Dashboard</h1>
        <p style={{ marginTop: '0.5rem', color: '#666' }}>
          Comparison against reference baseline and optimized values
        </p>
      </div>

      {loading && <p>Loading metrics...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {aggregated && (
        <div style={{ marginBottom: '2rem' }}>
          <p>
            <strong>Total samples collected:</strong> {aggregated.sampleCount}
          </p>
          {aggregated.sampleCount === 0 && (
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              No metrics collected yet. Visit the home page and interact with
              the site to generate metrics.
            </p>
          )}
        </div>
      )}

      {comparisons.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '1rem',
              backgroundColor: '#fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  Metric
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  Baseline
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  Optimized
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  Current Avg
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  Diff vs Baseline
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  % vs Baseline
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  Threshold
                </th>
                <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((comp) => {
                const unit =
                  comp.name === 'TTFB' || comp.name === 'FID'
                    ? 'ms'
                    : comp.name === 'LCP'
                    ? 's'
                    : ''
                return (
                  <tr key={comp.name} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      <strong>{comp.name}</strong>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: '#666',
                          marginTop: '0.25rem',
                        }}
                      >
                        {comp.description}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      {formatValue(comp.baseline, unit)}
                    </td>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      {formatValue(comp.optimized, unit)}
                    </td>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      {formatValue(comp.current, unit)}
                    </td>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      {formatDiff(comp.diffVsBaseline, unit)}
                    </td>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      {formatPercent(comp.percentImprovementVsBaseline)}
                    </td>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      ≤ {formatValue(comp.threshold, unit)}
                    </td>
                    <td style={{ padding: '1rem', border: '1px solid #ddd' }}>
                      {comp.current !== null ? (
                        comp.meetsThreshold ? (
                          <span style={{ color: 'green', fontWeight: 'bold' }}>
                            ✅ within threshold
                          </span>
                        ) : (
                          <span style={{ color: 'red', fontWeight: 'bold' }}>
                            ❌ above threshold
                          </span>
                        )
                      ) : (
                        <span style={{ color: '#999' }}>No data</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h2 style={{ marginBottom: '1rem' }}>About Reference Values</h2>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Baseline:</strong> Unoptimized performance values from the
          reference experiment.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Optimized:</strong> Performance values after applying
          optimizations in the reference experiment.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Threshold:</strong> Core Web Vitals "good" range targets.
          Values at or below the threshold are considered good.
        </p>
        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          To update reference values, edit{' '}
          <code style={{ backgroundColor: '#fff', padding: '0.2rem 0.4rem', borderRadius: '2px' }}>
            lib/metrics.ts
          </code>
          .
        </p>
      </div>
    </main>
  )
}

