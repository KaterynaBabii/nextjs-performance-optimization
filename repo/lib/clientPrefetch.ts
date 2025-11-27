/**
 * Client-Side Prefetch Utilities
 * 
 * Uses Next.js App Router navigation API for prefetching routes
 * This file MUST be marked with "use client" and can only be used in client components
 */

'use client'

import { useRouter } from 'next/navigation'

/**
 * Prefetch likely routes on the client side using Next.js router
 * 
 * This function MUST be called from within a React component that has access to router.
 * It receives the router instance as a parameter to avoid calling useRouter() outside component context.
 * 
 * @param router - Router instance from useRouter() hook
 * @param routes - Array of route strings to prefetch
 */
export function prefetchLikelyRoutesClient(router: ReturnType<typeof useRouter>, routes: string[]): void {
  // Ensure we're in a client environment
  if (typeof window === 'undefined') {
    return
  }

  // Validate router instance
  if (!router) {
    console.warn('[CLIENT-PREFETCH] Router instance not provided')
    return
  }

  // Check if router.prefetch is available
  if (typeof router.prefetch !== 'function') {
    console.warn('[CLIENT-PREFETCH] router.prefetch is not available', {
      routerType: typeof router,
      routerKeys: Object.keys(router || {})
    })
    return
  }

  if (!routes || routes.length === 0) {
    return
  }

  // Prefetch routes one by one with error handling
  routes.forEach((route) => {
    if (route && typeof route === 'string') {
      try {
        // Ensure route is a valid path
        const normalizedRoute = route.startsWith('/') ? route : `/${route}`
        
        // Call router.prefetch with error handling
        router.prefetch(normalizedRoute)
      } catch (error) {
        // Silently fail - prefetch is non-blocking
        if (process.env.NODE_ENV === 'development') {
          console.debug('[CLIENT-PREFETCH] Prefetch error (non-critical):', {
            route,
            error: error instanceof Error ? error.message : String(error),
            errorName: error instanceof Error ? error.name : undefined
          })
        }
      }
    }
  })
}
