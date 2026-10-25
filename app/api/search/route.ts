import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { search } from '@/lib/queries/search'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const user = await requireUser()
  const results = await search(user.id, q)
  return NextResponse.json(results)
}
