/**
 * Category Page - Dynamic Route with Filters
 * 
 * Implements:
 * - Dynamic routing with ISR
 * - Client-side filtering
 * - Prefetching for products
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCategory, getProductsByCategory, getCategories } from '@/lib/data'
import ProductFilters from '@/components/ProductFilters'

// Revalidate every 60 seconds
export const revalidate = 60

export async function generateStaticParams() {
  // Pre-generate first 10 categories at build time
  const categories = await getCategories()
  return categories.slice(0, 10).map((cat) => ({
    id: cat.id.toString(),
  }))
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { filter?: string; sort?: string }
}) {
  const categoryId = parseInt(params.id)
  const category = await getCategory(categoryId)

  if (!category) {
    notFound()
  }

  const products = await getProductsByCategory(categoryId, {
    filter: searchParams.filter,
    sort: searchParams.sort,
  })

  return (
    <main className="container">
      <Link href="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>
        ← Back to Home
      </Link>

      <h1>{category.name}</h1>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>
        {products.length} products found
      </p>

      <ProductFilters
        categoryId={categoryId}
        currentFilter={searchParams.filter}
        currentSort={searchParams.sort}
      />

      <div className="grid" style={{ marginTop: '2rem' }}>
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            className="card"
          >
            <h3>{product.name}</h3>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>
              ${product.price.toFixed(2)}
            </p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              {product.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  )
}

