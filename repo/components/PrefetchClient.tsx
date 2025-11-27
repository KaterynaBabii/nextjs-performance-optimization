/**
 * Client-Side Prefetch Component
 * 
 * Receives predicted routes from server (via props or script tag) and prefetches them using Next.js router
 * This component runs only on the client side
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { prefetchLikelyRoutesClient } from '@/lib/clientPrefetch'

interface PrefetchClientProps {
  predictedRoutes?: string[]
}

export default function PrefetchClient({ predictedRoutes: propsRoutes = [] }: PrefetchClientProps) {
  const router = useRouter()
  const [routes, setRoutes] = useState<string[]>(propsRoutes)
  const [isRouterReady, setIsRouterReady] = useState(false)

  // Wait for router to be ready
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // Check if router is ready
    if (router && typeof router.prefetch === 'function') {
      setIsRouterReady(true)
    } else {
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (router && typeof router.prefetch === 'function') {
          setIsRouterReady(true)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [router])

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return
    }

    // Try to get routes from script tag (injected by PrefetchRoutesInjector)
    if (routes.length === 0) {
      const scriptTag = document.getElementById('__NEXT_PREFETCH_ROUTES__')
      if (scriptTag) {
        try {
          const scriptRoutes = JSON.parse(scriptTag.textContent || '[]')
          if (Array.isArray(scriptRoutes) && scriptRoutes.length > 0) {
            setRoutes(scriptRoutes)
          }
        } catch (error) {
          // Invalid JSON, ignore
        }
      }
    }
  }, [routes.length])

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return
    }

    // Don't prefetch during navigation transitions
    if (document.readyState !== 'complete') {
      return
    }

    // Only prefetch if router is ready and routes are available
    if (isRouterReady && routes.length > 0 && router) {
      // Use requestIdleCallback or setTimeout to avoid blocking navigation
      const prefetchRoutes = () => {
        try {
          // Double-check router is still available
          if (router && typeof router.prefetch === 'function') {
            prefetchLikelyRoutesClient(router, routes)
          }
        } catch (error) {
          // Silently fail - prefetch is non-blocking
          if (process.env.NODE_ENV === 'development') {
            console.debug('[PREFETCH-CLIENT] Error calling prefetchLikelyRoutesClient:', error)
          }
        }
      }

      // Prefetch in next tick to avoid blocking navigation
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(prefetchRoutes, { timeout: 2000 })
      } else {
        setTimeout(prefetchRoutes, 0)
      }
    }
  }, [isRouterReady, router, routes])

  return null // This component doesn't render anything
}
