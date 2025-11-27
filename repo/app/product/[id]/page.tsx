/**
 * Product Page - Dynamic Route with SSR
 * 
 * Implements:
 * - Server-side rendering
 * - Dynamic metadata
 * - Prefetching recommendations
 */

import { notFound } from 'next/navigation'
import { getProduct, getRelatedProducts } from '@/lib/data'
import type { Metadata } from 'next'
import Link from 'next/link'

// Force SSR (no static generation)
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const product = await getProduct(parseInt(params.id))

  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  return {
    title: product.name,
    description: product.description,
  }
}

export default async function ProductPage({
  params,
}: {
  params: { id: string }
}) {
  const productId = parseInt(params.id)
  const product = await getProduct(productId)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(productId)

  return (
    <main className="container">
      <Link
        href={`/category/${product.categoryId}`}
        style={{ display: 'inline-block', marginBottom: '1rem' }}
      >
        ← Back to Category
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div>
          <h1>{product.name}</h1>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '1rem' }}>
            ${product.price.toFixed(2)}
          </p>
          <p style={{ marginTop: '1rem', color: '#666' }}>
            {product.description}
          </p>
          <div style={{ marginTop: '2rem' }}>
            <button
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Add to Cart
            </button>
          </div>
        </div>

        <div>
          <h2>Product Details</h2>
          <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
            <li style={{ padding: '0.5rem 0' }}>
              <strong>Category:</strong> {product.categoryName}
            </li>
            <li style={{ padding: '0.5rem 0' }}>
              <strong>SKU:</strong> {product.sku}
            </li>
            <li style={{ padding: '0.5rem 0' }}>
              <strong>Stock:</strong> {product.stock} available
            </li>
          </ul>
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <section style={{ marginTop: '3rem' }}>
          <h2>Related Products</h2>
          <div className="grid" style={{ marginTop: '1rem' }}>
            {relatedProducts.map((related) => (
              <Link
                key={related.id}
                href={`/product/${related.id}`}
                className="card"
              >
                <h3>{related.name}</h3>
                <p style={{ color: '#666', marginTop: '0.5rem' }}>
                  ${related.price.toFixed(2)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

