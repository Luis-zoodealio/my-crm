import Anthropic from '@anthropic-ai/sdk'
import { and, eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agents, deals, userSettings } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEALIO_ASSIGNED_USER_ID = 'b91ed836-75d4-480d-8cb9-28c6555d67fe'

interface SyncedDeal {
  transactionId: string
  address: string
  city: string | null
  state: string | null
  agentName: string | null
  agentPhone: string | null
  cashOffer: number | null
  cashPlusOffer: number | null
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.DEALIO_MCP_URL || !process.env.DEALIO_MCP_TOKEN) {
    return NextResponse.json(
      { error: 'DEALIO_MCP_URL and DEALIO_MCP_TOKEN must be set in environment variables.' },
      { status: 500 }
    )
  }

  // Resolve the CRM owner — whoever has logged in first.
  const [userRow] = await db.select({ userId: userSettings.userId }).from(userSettings).limit(1)
  if (!userRow) {
    return NextResponse.json(
      { error: 'No CRM user found. Log in to the app at least once first.' },
      { status: 500 }
    )
  }
  const userId = userRow.userId

  // Fetch Comping Complete deals from DealioDesk via the Anthropic MCP client.
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const mcpResponse = await (anthropic.beta.messages as any).create(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      system:
        'You are a JSON extraction tool. Call the DealioDesk MCP tool exactly as instructed and return ONLY a JSON array — no markdown, no code blocks, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Call read_operation with operation_id "Transactions.SearchProperties" and params:
{"phases":["OffersReady"],"assignedToUserId":"${DEALIO_ASSIGNED_USER_ID}","pageSize":100,"includeDeals":true}

Return ONLY items where deals[0].offersLaneCode === "comping-complete".

Output this exact JSON array (empty array if none match):
[{"transactionId":"<propertyTransactionId>","address":"<street address only>","city":"<city>","state":"<2-letter state>","agentName":"<agentName or null>","agentPhone":"<agentPhone or null>","cashOffer":<expiringOffers type=1 amount or null>,"cashPlusOffer":<expiringOffers type=0 amount or null>}]

The DealioDesk address field is "Street, City, STATE" — split it accordingly.`,
        },
      ],
      mcp_servers: [
        {
          type: 'url',
          url: process.env.DEALIO_MCP_URL,
          authorization_token: process.env.DEALIO_MCP_TOKEN,
        },
      ],
    },
    { headers: { 'anthropic-beta': 'mcp-client-2025-04-04' } }
  )

  const raw = (mcpResponse.content as any[])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text as string)
    .join('')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  let properties: SyncedDeal[]
  try {
    properties = JSON.parse(raw)
    if (!Array.isArray(properties)) throw new Error('not an array')
  } catch {
    console.error('[sync-dealiodesk] Failed to parse response:', raw)
    return NextResponse.json({ error: 'Unexpected response format from DealioDesk', raw }, { status: 500 })
  }

  let added = 0
  let skipped = 0

  for (const prop of properties) {
    // Skip deals already imported.
    const [existing] = await db
      .select({ id: deals.id })
      .from(deals)
      .where(eq(deals.dealiodeskTransactionId, prop.transactionId))

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
        .where(
          and(
            eq(agents.userId, userId),
            sql`lower(${agents.name}) = lower(${prop.agentName})`
          )
        )

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

    await db.insert(deals).values({
      userId,
      agentId,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      stage: 0,
      leadStatus: 'Warm',
      cashOffer: prop.cashOffer,
      cashPlusOffer: prop.cashPlusOffer,
      dealiodeskTransactionId: prop.transactionId,
    })

    added++
  }

  console.log(`[sync-dealiodesk] added=${added} skipped=${skipped}`)
  return NextResponse.json({ added, skipped, total: properties.length })
}
