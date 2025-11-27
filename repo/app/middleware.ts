/**
 * Edge Middleware - Performance Optimization
 * 
 * Implements:
 * - Geolocation-based routing
 * - A/B testing buckets
 * - Device-based rendering rules
 * - Threat inspection
 * - AI prefetch integration
 * - CDN cache rules
 * 
 * Runs on Vercel Edge Runtime
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPredictedRoutes, prewarmCDNCache } from '@/lib/prefetch-service'

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // 1. Geolocation cookie logic
  const geo = request.geo || {}
  const country = geo.country || 'US'
  const city = geo.city || 'Unknown'
  
  // Set geolocation cookie
  response.cookies.set('geo-country', country, {
    maxAge: 86400, // 24 hours
    path: '/',
  })
  response.cookies.set('geo-city', city, {
    maxAge: 86400,
    path: '/',
  })

  // 2. A/B testing buckets
  const abTestBucket = request.cookies.get('ab-bucket')?.value || 
    (Math.random() < 0.5 ? 'A' : 'B')
  response.cookies.set('ab-bucket', abTestBucket, {
    maxAge: 2592000, // 30 days
    path: '/',
  })

  // 3. Device-based rendering rules
  const userAgent = request.headers.get('user-agent') || ''
  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent)
  const isTablet = /tablet|ipad/i.test(userAgent)
  
  response.headers.set('X-Device-Type', isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop')
  
  // 4. Threat inspection via HTTP headers
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
  ]
  
  let threatScore = 0
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header)
    if (value && value.includes('0.0.0.0')) {
      threatScore += 1
    }
  }
  
  if (threatScore > 0) {
    response.headers.set('X-Threat-Score', threatScore.toString())
  }

  // 5. AI Prefetch integration (SERVER-SIDE ONLY)
  // Get predicted routes and pass them to client via response header
  const pathHistory = request.cookies.get('path-history')?.value || '[]'
  let predictedRoutes: string[] = []
  
  try {
    const history = JSON.parse(pathHistory)
    const recentPaths = history.slice(-5) // Last 5 paths (context window size per paper)
    
    if (recentPaths.length >= 3) {
      // Measure AI inference overhead (per paper: <2% overhead)
      const inferenceStart = Date.now()
      
      // Call server-side prediction function (NO router, NO client APIs)
      predictedRoutes = await getPredictedRoutes(recentPaths)
      
      const inferenceTime = Date.now() - inferenceStart
      
      // Log overhead for monitoring (can be removed in production)
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[MIDDLEWARE] AI inference time: ${inferenceTime}ms`)
      }
      
      // Pass predicted routes to client via response header
      // Client component will read this and prefetch routes
      if (predictedRoutes.length > 0) {
        response.headers.set('X-Prefetch-Routes', JSON.stringify(predictedRoutes))
        
        // CDN Prewarm: Trigger background fetches to prewarm edge cache
        // This implements the paper's claim: "integrating with the CDN cache to prewarm edge nodes"
        // Fire-and-forget: doesn't block user request
        const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
        prewarmCDNCache(predictedRoutes, baseUrl).catch(() => {
          // Silently fail - prewarm is non-critical
        })
      }
    }
  } catch (e) {
    // Invalid path history or prediction error, ignore
    // Prefetch is non-blocking, so we continue
  }

  // Update path history
  const currentPath = request.nextUrl.pathname
  try {
    const history = JSON.parse(pathHistory)
    history.push(currentPath)
    const updatedHistory = history.slice(-10) // Keep last 10 paths
    response.cookies.set('path-history', JSON.stringify(updatedHistory), {
      maxAge: 3600, // 1 hour
      path: '/',
    })
  } catch (e) {
    response.cookies.set('path-history', JSON.stringify([currentPath]), {
      maxAge: 3600,
      path: '/',
    })
  }

  // 6. Advanced CDN cache rules
  const cacheControl = isMobile 
    ? 'public, s-maxage=60, stale-while-revalidate=120'
    : 'public, s-maxage=300, stale-while-revalidate=600'
  
  response.headers.set('Cache-Control', cacheControl)
  response.headers.set('CDN-Cache-Control', cacheControl)
  response.headers.set('Vary', 'User-Agent, Accept-Encoding')

  // 7. Performance headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-DNS-Prefetch-Control', 'on')

  return response
}

