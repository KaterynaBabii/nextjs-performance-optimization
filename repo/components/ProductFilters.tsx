/**
 * Product Filters Component
 * 
 * Client-side filtering and sorting for products
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface ProductFiltersProps {
  categoryId: number
  currentFilter?: string
  currentSort?: string
}

export default function ProductFilters({
  categoryId,
  currentFilter,
  currentSort,
}: ProductFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState(currentFilter || '')
  const [sort, setSort] = useState(currentSort || '')

  const handleFilterChange = (value: string) => {
    setFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('filter', value)
    } else {
      params.delete('filter')
    }
    router.push(`/category/${categoryId}?${params.toString()}`)
  }

  const handleSortChange = (value: string) => {
    setSort(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('sort', value)
    } else {
      params.delete('sort')
    }
    router.push(`/category/${categoryId}?${params.toString()}`)
  }

  return (
    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div>
        <label htmlFor="filter" style={{ marginRight: '0.5rem' }}>
          Filter:
        </label>
        <input
          id="filter"
          type="text"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          placeholder="Search products..."
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      </div>

      <div>
        <label htmlFor="sort" style={{ marginRight: '0.5rem' }}>
          Sort:
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => handleSortChange(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          <option value="">Default</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  )
}

