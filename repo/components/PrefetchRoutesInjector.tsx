/**
 * Server Component - Injects predicted routes from middleware into page
 * 
 * This component reads the X-Prefetch-Routes header set by middleware
 * and injects it as a script tag for the client component to read
 */

import { headers } from 'next/headers'

export default function PrefetchRoutesInjector() {
  // This runs on the server, so we can read headers
  const headersList = headers()
  const prefetchRoutesHeader = headersList.get('x-prefetch-routes')

  if (!prefetchRoutesHeader) {
    return null
  }

  try {
    const routes = JSON.parse(prefetchRoutesHeader)
    
    if (!Array.isArray(routes) || routes.length === 0) {
      return null
    }

    // Inject script tag with predicted routes
    // Client component will read this and prefetch routes
    return (
      <script
        id="__NEXT_PREFETCH_ROUTES__"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(routes) }}
      />
    )
  } catch (error) {
    // Invalid JSON, ignore
    return null
  }
}

