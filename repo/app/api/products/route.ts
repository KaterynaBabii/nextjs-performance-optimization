/**
 * Products API Route
 * 
 * Returns list of products with optional filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProductsByCategory, getProduct } from '@/lib/data'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const categoryId = searchParams.get('categoryId')
  const productId = searchParams.get('id')
  const filter = searchParams.get('filter')
  const sort = searchParams.get('sort')

  try {
    if (productId) {
      // Get single product
      const product = await getProduct(parseInt(productId))
      if (!product) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(product)
    }

    if (categoryId) {
      // Get products by category
      const products = await getProductsByCategory(parseInt(categoryId), {
        filter: filter || undefined,
        sort: sort || undefined,
      })
      return NextResponse.json(products)
    }

    return NextResponse.json(
      { error: 'Missing categoryId or id parameter' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

