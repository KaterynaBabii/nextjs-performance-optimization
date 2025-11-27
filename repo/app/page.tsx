/**
 * Home Page - Next.js Performance Optimization Demo
 * 
 * Implements:
 * - Static generation with ISR
 * - Prefetching integration
 * - Core Web Vitals collection
 */

import Link from 'next/link'
import { getCategories } from '@/lib/data'

// Revalidate every 60 seconds (ISR)
export const revalidate = 60

export default async function Home() {
  const categories = await getCategories()

  return (
    <main className="container">
      <h1>Next.js Performance Optimization Demo</h1>
      <p style={{ marginTop: '1rem', marginBottom: '2rem', color: '#666' }}>
        Large-scale web application prototype demonstrating performance optimization strategies.
      </p>

      <section>
        <h2>Browse Categories</h2>
        <div className="grid">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.id}`}
              className="card"
            >
              <h3>{category.name}</h3>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                {category.productCount} products
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Quick Links</h2>
        <nav style={{ marginTop: '1rem' }}>
          <Link href="/profile" style={{ marginRight: '1rem' }}>
            View Profile
          </Link>
          <Link href="/api/products">Products API</Link>
        </nav>
      </section>
    </main>
  )
}

