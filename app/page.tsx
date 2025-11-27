'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { reportWebVitals } from '@/lib/webVitalsClient'

export default function Home() {
  useEffect(() => {
    // Initialize web vitals collection when the page loads
    // Only run in browser environment after component mounts
    if (typeof window !== 'undefined' && window.document) {
      // Small delay to ensure router is fully initialized
      const timer = setTimeout(() => {
        reportWebVitals()
      }, 0)
      
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Next.js Web Vitals Experiment</h1>
      <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        This page collects Core Web Vitals metrics (TTFB, LCP, FID, CLS) as you
        interact with the site.
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <h2>How it works:</h2>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
          <li>Metrics are automatically collected as you browse</li>
          <li>Click around the page to generate First Input Delay (FID) events</li>
          <li>View aggregated results and comparisons on the dashboard</li>
        </ul>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Test interactions:</h2>
        <button
          onClick={() => alert('Button clicked - this generates a FID event')}
          style={{
            padding: '0.5rem 1rem',
            marginRight: '0.5rem',
            cursor: 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Click me (generates FID)
        </button>
        <button
          onClick={() => {
            const div = document.createElement('div')
            div.textContent = 'New element added'
            div.style.padding = '1rem'
            div.style.marginTop = '1rem'
            div.style.backgroundColor = '#f0f0f0'
            document.body.appendChild(div)
            setTimeout(() => div.remove(), 2000)
          }}
          style={{
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Add/Remove Element (may affect CLS)
        </button>
      </div>

      <div>
        <Link
          href="/metrics"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: '4px',
            fontWeight: '500',
          }}
        >
          View Metrics Dashboard →
        </Link>
      </div>
    </main>
  )
}

