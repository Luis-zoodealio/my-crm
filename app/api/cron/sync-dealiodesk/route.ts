import { and, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, deals, userSettings } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// DealioDesk user whose round-robin assignments feed this CRM.
const DEALIO_ASSIGNED_USER_ID = 'b91ed836-75d4-480d-8cb9-28c6555d67fe'
// Only deals that have reached this offers lane enter the CRM (stage 0).
const COMPING_COMPLETE_LANE = 'comping-complete'

// The shape DealioDesk's property search returns (only the fields we use).
interface DealioProperty {
  propertyTransactionId: string
  address: string
  deals?: { offersLaneCode?: string }[]
  agentName?: string | null
  agentPhone?: string | null
  offerExpirySummary?: {
    expiringOffers?: { type: number; amount: number }[]
  }
}

// "123 Main St, Ocala, FL" -> { address, city, state }. Leaves city/state null
// when the format is unexpected rather than guessing.
function splitAddress(full: string): { address: string; city: string | null; state: string | null } {
  const parts = full.split(',').map((p) => p.trim())
  if (parts.length >= 3) {
    return { address: parts.slice(0, -2).join(', '), city: parts[parts.length - 2], state: parts[parts.length - 1] || null }
  }
  return { address: full, city: null, state: null }
}

async function fetchCompingCompleteProperties(): Promise<DealioProperty[]> {
  const base = process.env.DEALIO_API_URL
  const token = process.env.DEALIO_API_TOKEN
  if (!base || !token) {
    throw new Error('DEALIO_API_URL and DEALIO_API_TOKEN must be set in environment variables.')
  }

  const matches: DealioProperty[] = []
  let page = 1
  // Paginate through the user's OffersReady properties — comping-complete lives
  // in that phase — and keep only the ones in the comping-complete lane.
  for (;;) {
    const url = new URL('/api/transactions/properties/search', base)
    url.searchParams.set('assignedToUserId', DEALIO_ASSIGNED_USER_ID)
    url.searchParams.append('phases', 'OffersReady')
    url.searchParams.set('includeDeals', 'true')
    url.searchParams.set('pageSize', '100')
    url.searchParams.set('pageNumber', String(page))

    const res = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`DealioDesk responded ${res.status}: ${await res.text()}`)
    }
    const body = (await res.json()) as { items?: DealioProperty[]; totalCount?: number; page?: number; pageSize?: number }
    const items = body.items ?? []
    for (const p of items) {
      if (p.deals?.[0]?.offersLaneCode === COMPING_COMPLETE_LANE) matches.push(p)
    }

    const pageSize = body.pageSize ?? 100
    const total = body.totalCount ?? items.length
    if (page * pageSize >= total || items.length === 0) break
    page++
  }
  return matches
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Resolve the CRM owner — whoever has logged in (and so has settings) first.
  const [userRow] = await db.select({ userId: userSettings.userId }).from(userSettings).limit(1)
  if (!userRow) {
    return NextResponse.json({ error: 'No CRM user found. Log in to the app at least once first.' }, { status: 500 })
  }
  const userId = userRow.userId

  let properties: DealioProperty[]
  try {
    properties = await fetchCompingCompleteProperties()
  } catch (e) {
    console.error('[sync-dealiodesk]', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'DealioDesk fetch failed' }, { status: 502 })
  }

  let added = 0
  let skipped = 0

  for (const prop of properties) {
    // Skip deals already imported.
    const [existing] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.dealiodeskTransactionId, prop.propertyTransactionId))
    if (existing) {
      skipped++
      continue
    }

    // Find or create the listing agent.
    let agentId: string | null = null
    if (prop.agentName) {
      const [existingAgent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.userId, userId), sql`lower(${agents.name}) = lower(${prop.agentName})`))
      if (existingAgent) {
        agentId = existingAgent.id
      } else {
        const [newAgent] = await db
          .insert(agents)
          .values({ userId, name: prop.agentName, phone: prop.agentPhone ?? null })
          .returning({ id: agents.id })
        agentId = newAgent.id
      }
    }

    // Offers: type 1 is the cash offer, type 0 the cash-plus offer.
    const offers = prop.offerExpirySummary?.expiringOffers ?? []
    const cashOffer = offers.find((o) => o.type === 1)?.amount ?? null
    const cashPlusOffer = offers.find((o) => o.type === 0)?.amount ?? null
    const { address, city, state } = splitAddress(prop.address)

    await db.insert(deals).values({
      userId,
      agentId,
      address,
      city,
      state,
      stage: 0,
      leadStatus: 'Warm',
      cashOffer,
      cashPlusOffer,
      dealiodeskTransactionId: prop.propertyTransactionId,
    })
    added++
  }

  console.log(`[sync-dealiodesk] added=${added} skipped=${skipped}`)
  return NextResponse.json({ added, skipped, total: properties.length })
}
