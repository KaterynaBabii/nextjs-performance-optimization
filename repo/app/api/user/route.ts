/**
 * User API Route
 * 
 * Returns user profile information
 */

import { NextResponse } from 'next/server'
import { getUserProfile } from '@/lib/data'

export async function GET() {
  try {
    const user = await getUserProfile()
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

