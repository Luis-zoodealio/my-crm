import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { STAGES } from '@/lib/stages'

export const COLUMN_PAGE = 50

export type BoardCard = {
  id: string
  address: string
  city: string | null
  state: string | null
  zip: string | null
  leadStatus: string
  stage: number
  cashOffer: number | null
  cashPlusOffer: number | null
  agentName: string | null
  daysSinceContact: number
  followUps: number
  firstContactMade: boolean
}

export type BoardColumn = { stage: number; total: number; cards: BoardCard[] }

type Raw = Record<string, unknown>

// Hot first, then the deals that have gone longest without contact.
const ORDER = sql`case d.lead_status when 'Hot' then 0 when 'Warm' then 1 when 'Cold' then 2 else 3 end, d.last_contact_at asc, d.id`

const SELECT = sql`
  d.id, d.address, d.city, d.state, d.zip, d.stage, d.lead_status,
  d.cash_offer::float8 as cash_offer, d.cash_plus_offer::float8 as cash_plus_offer,
  a.name as agent_name,
  (select count(*)::int from crm.notes n where n.deal_id = d.id) as note_count,
  floor(extract(epoch from (now() - d.last_contact_at)) / 86400)::int as days`

const toCard = (r: Raw): BoardCard => ({
  id: r.id as string,
  address: r.address as string,
  city: r.city as string | null,
  state: r.state as string | null,
  zip: r.zip as string | null,
  leadStatus: r.lead_status as string,
  stage: Number(r.stage),
  cashOffer: r.cash_offer as number | null,
  cashPlusOffer: r.cash_plus_offer as number | null,
  agentName: r.agent_name as string | null,
  daysSinceContact: Number(r.days),
  // A follow-up is any logged exchange after the first contact.
  followUps: Math.max(0, Number(r.note_count) - 1),
  firstContactMade: Number(r.note_count) > 0,
})

/** First COLUMN_PAGE cards of every stage, plus each stage's true total. */
export async function getBoard(userId: string): Promise<BoardColumn[]> {
  const rows = await db.execute(sql`
    select * from (
      select ${SELECT},
             row_number() over (partition by d.stage order by ${ORDER}) as rn,
             count(*) over (partition by d.stage) as total
        from crm.deals d
        left join crm.agents a on a.id = d.agent_id
       where d.user_id = ${userId}
    ) x
    where rn <= ${COLUMN_PAGE}
    order by stage, rn`)
  const cols: BoardColumn[] = STAGES.map((_, stage) => ({ stage, total: 0, cards: [] }))
  for (const r of [...rows] as Raw[]) {
    const col = cols[Number(r.stage)]
    col.total = Number(r.total)
    col.cards.push(toCard(r))
  }
  return cols
}

/** Next page of one column, for "Load more". */
export async function getBoardColumn(userId: string, stage: number, offset: number): Promise<BoardColumn> {
  const rows = await db.execute(sql`
    select ${SELECT}, count(*) over () as total
      from crm.deals d
      left join crm.agents a on a.id = d.agent_id
     where d.user_id = ${userId} and d.stage = ${stage}
     order by ${ORDER}
     limit ${COLUMN_PAGE} offset ${offset}`)
  const list = [...rows] as Raw[]
  return { stage, total: list.length ? Number(list[0].total) : 0, cards: list.map(toCard) }
}
