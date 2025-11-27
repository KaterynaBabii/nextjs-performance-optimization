/**
 * Categories API Route
 * 
 * Returns list of categories
 */

import { NextResponse } from 'next/server'
import { getCategories, getCategory } from '@/lib/data'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  try {
    if (id) {
      const category = await getCategory(parseInt(id))
      if (!category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(category)
    }

    const categories = await getCategories()
    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

