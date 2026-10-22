'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { getBoardColumn, type BoardCard } from './query'

export async function loadBoardColumn(stage: number, offset: number): Promise<{ ok: true; total: number; cards: BoardCard[] } | { ok: false; error: string }> {
  try {
    const user = await requireUser()
    const s = z.number().int().min(0).max(11).parse(stage)
    const o = z.number().int().min(0).max(100000).parse(offset)
    const col = await getBoardColumn(user.id, s, o)
    return { ok: true, total: col.total, cards: col.cards }
  } catch (e) {
    console.error(e)
    return { ok: false, error: 'Could not load more deals. Please try again.' }
  }
}
