// Dev-only fictional data from the design prototype.
//   SEED_USER_EMAIL=you@example.com npm run db:seed
// Refuses to run if that user already has deals.
import { config } from 'dotenv'
import postgres from 'postgres'

config({ path: '.env.local' })

type Seed = {
  addr: string; city: string; state: string; zip: string
  agent: string; agency: string; phone: string; email: string
  stage: number; offer: number; temp: 'Hot' | 'Warm' | 'Cold' | 'Dead'
  daysSinceContact: number
  followUpInDays: number; followUpTitle: string; followUpHow: string
  notes: [type: string, daysAgo: number, body: string][]
  propertyNotes?: [daysAgo: number, body: string][]
}

const DEALS: Seed[] = [
  { addr: '218 Cedar Ave', city: 'Dallas', state: 'TX', zip: '75208', agent: 'Sandra Whitfield', agency: 'Lakeview Realty', phone: '(214) 555-0187', email: 's.whitfield@lakeviewrealty.com', stage: 6, offer: 398000, temp: 'Hot', daysSinceContact: 8, followUpInDays: -1, followUpTitle: 'Call Sandra about the counter', followUpHow: 'Call',
    notes: [['Call', 8, 'Sandra says the seller wants $421K and a 10-day close. Told her I would review and call back.'], ['Email', 10, 'Sent offer details and proof of funds.'], ['Voicemail', 12, 'Left a message asking about the disputed comps.'], ['Text', 14, 'Agent said the seller disagrees with the 14 Maple comp.'], ['Call', 16, 'First call. Seller is motivated and wants to move before the holidays.']],
    propertyNotes: [[14, '3 bed, 2 bath. Roof about 15 years old. Vacant, lockbox on the front door.']] },
  { addr: '1428 Alder Ct', city: 'Austin', state: 'TX', zip: '78704', agent: 'Marco Rivera', agency: 'Rivera & Co', phone: '(512) 555-0142', email: 'marco@riveraco.com', stage: 8, offer: 485000, temp: 'Hot', daysSinceContact: 2, followUpInDays: 0, followUpTitle: 'Send inspection access', followUpHow: 'Email',
    notes: [['Call', 2, 'Offer accepted at $485,000. Inspection scheduled.'], ['Email', 6, 'Sent purchase agreement.']] },
  { addr: '65 Harbor Way', city: 'Houston', state: 'TX', zip: '77002', agent: 'Kline Realty Group', agency: 'Kline Realty Group', phone: '(713) 555-0166', email: 'deals@klinerealty.com', stage: 4, offer: 910000, temp: 'Hot', daysSinceContact: 1, followUpInDays: 0, followUpTitle: 'Check if details were reviewed', followUpHow: 'Text',
    notes: [['Email', 1, 'Offer is ready. Waiting on internal sign-off before sharing details.']] },
  { addr: '930 Larkspur Ln', city: 'Plano', state: 'TX', zip: '75024', agent: 'Dana Okafor', agency: 'Okafor Homes', phone: '(972) 555-0119', email: 'dana@okaforhomes.com', stage: 3, offer: 640000, temp: 'Warm', daysSinceContact: 3, followUpInDays: 1, followUpTitle: 'Ask for seller timeline', followUpHow: 'Call',
    notes: [['Call', 3, 'Dana requested property condition details before the seller will talk.']] },
  { addr: '77 Bishop St', city: 'Fort Worth', state: 'TX', zip: '76102', agent: 'Lee Chen', agency: 'Chen Holdings', phone: '(817) 555-0173', email: 'lee@chenholdings.com', stage: 1, offer: 312000, temp: 'Warm', daysSinceContact: 9, followUpInDays: -1, followUpTitle: 'Re-engage on comps', followUpHow: 'Voicemail',
    notes: [['Text', 9, 'Lee viewed the comping report.']] },
  { addr: '12 Mill Rd', city: 'Frisco', state: 'TX', zip: '75034', agent: 'Priya Patel', agency: 'Patel Realty', phone: '(469) 555-0128', email: 'priya@patelrealty.com', stage: 2, offer: 275000, temp: 'Cold', daysSinceContact: 12, followUpInDays: 4, followUpTitle: 'Try again after agent disputes comps', followUpHow: 'Email',
    notes: [['Email', 12, 'Agent disputes the comps and says the home is worth more.']] },
  { addr: '4410 Ridge Dr', city: 'Dallas', state: 'TX', zip: '75209', agent: 'Joe Alvarez', agency: 'Alvarez Group', phone: '(214) 555-0150', email: 'joe@alvarezgroup.com', stage: 0, offer: 520000, temp: 'Cold', daysSinceContact: 0, followUpInDays: 6, followUpTitle: 'Follow up on comping report', followUpHow: 'Email',
    notes: [['Email', 0, 'Sent comping report.']] },
  { addr: '802 Pine Hollow', city: 'Austin', state: 'TX', zip: '78745', agent: 'Tia Brooks', agency: 'Brooks Realty', phone: '(512) 555-0191', email: 'tia@brooksrealty.com', stage: 9, offer: 455000, temp: 'Warm', daysSinceContact: 4, followUpInDays: 0, followUpTitle: 'Confirm appraisal date', followUpHow: 'Call',
    notes: [['Call', 4, 'Inspection period started. Report due Oct 30.']] },
  { addr: '36 Sutter Pl', city: 'Dallas', state: 'TX', zip: '75214', agent: 'Ruth Nguyen', agency: 'Nguyen Realty', phone: '(214) 555-0104', email: 'ruth@nguyenrealty.com', stage: 10, offer: 362000, temp: 'Warm', daysSinceContact: 6, followUpInDays: 30, followUpTitle: 'Closed. Ask for referrals.', followUpHow: 'Email',
    notes: [['Call', 6, 'Closed and funded.']] },
  { addr: '19 Oak Lane', city: 'Round Rock', state: 'TX', zip: '78664', agent: 'Bill Hart', agency: 'Hart Realty', phone: '(512) 555-0135', email: 'bill@hartrealty.com', stage: 11, offer: 330000, temp: 'Dead', daysSinceContact: 21, followUpInDays: 60, followUpTitle: 'Dead. Revisit in 60 days.', followUpHow: 'Email',
    notes: [['Call', 21, 'Seller took another offer.']] },
  { addr: '501 Willow Bend', city: 'Dallas', state: 'TX', zip: '75218', agent: 'Sandra Whitfield', agency: 'Lakeview Realty', phone: '(214) 555-0187', email: 's.whitfield@lakeviewrealty.com', stage: 5, offer: 372000, temp: 'Warm', daysSinceContact: 2, followUpInDays: 2, followUpTitle: 'Await seller response', followUpHow: 'Text',
    notes: [['Email', 2, 'Shared offer details with Sandra.']] },
  { addr: '88 Garner Rd', city: 'Houston', state: 'TX', zip: '77008', agent: 'Kline Realty Group', agency: 'Kline Realty Group', phone: '(713) 555-0166', email: 'deals@klinerealty.com', stage: 7, offer: 745000, temp: 'Hot', daysSinceContact: 0, followUpInDays: 1, followUpTitle: 'Send contract draft', followUpHow: 'Email',
    notes: [['Call', 0, 'Our offer was selected. Contract draft next.']] },
]

async function main() {
  const url = process.env.DATABASE_URL
  const email = process.env.SEED_USER_EMAIL
  if (!url) throw new Error('DATABASE_URL is not set in .env.local')
  if (!email) throw new Error('Set SEED_USER_EMAIL to the account that should own the sample data')

  const sql = postgres(url, { max: 1 })
  try {
    const [user] = await sql`select id from auth.users where lower(email) = lower(${email})`
    if (!user) throw new Error(`No auth user with email ${email}. Sign up in the app first.`)
    const userId: string = user.id

    const [{ n }] = await sql`select count(*)::int as n from crm.deals where user_id = ${userId}`
    if (n > 0) throw new Error(`User already has ${n} deals; refusing to seed.`)

    const [settings] = await sql`
      insert into crm.user_settings (user_id) values (${userId})
      on conflict (user_id) do update set user_id = excluded.user_id
      returning timezone`
    const tz: string = settings.timezone

    await sql.begin(async (tx) => {
      const agentIds = new Map<string, string>()
      for (const d of DEALS) {
        if (!agentIds.has(d.agent)) {
          const [a] = await tx`
            insert into crm.agents (user_id, name, agency, phone, email)
            values (${userId}, ${d.agent}, ${d.agency}, ${d.phone}, ${d.email})
            returning id`
          agentIds.set(d.agent, a.id)
        }
      }
      for (const d of DEALS) {
        // Sample Cash+ is 8% above Cash purely for demo data. The column is a real stored value.
        const [deal] = await tx`
          insert into crm.deals (user_id, agent_id, address, city, state, zip, stage, lead_status, cash_offer, cash_plus_offer)
          values (${userId}, ${agentIds.get(d.agent)!}, ${d.addr}, ${d.city}, ${d.state}, ${d.zip}, ${d.stage}, ${d.temp},
                  ${d.offer}, ${Math.round(d.offer * 1.08)})
          returning id`
        for (const [type, daysAgo, body] of d.notes) {
          await tx`
            insert into crm.notes (user_id, deal_id, type, body, created_by, created_at)
            values (${userId}, ${deal.id}, ${type}, ${body}, ${userId}, now() - make_interval(days => ${daysAgo}))`
        }
        for (const [daysAgo, body] of d.propertyNotes ?? []) {
          await tx`
            insert into crm.property_notes (user_id, deal_id, body, created_by, created_at)
            values (${userId}, ${deal.id}, ${body}, ${userId}, now() - make_interval(days => ${daysAgo}))`
        }
        // Follow-up at 10:00 local time, N days from today in the user's timezone.
        await tx`
          insert into crm.tasks (user_id, deal_id, title, due_at, method, source)
          values (${userId}, ${deal.id}, ${d.followUpTitle},
                  (date_trunc('day', now() at time zone ${tz}) + make_interval(days => ${d.followUpInDays}, hours => 10)) at time zone ${tz},
                  ${d.followUpHow}, 'Follow-up')`
      }
      await tx`
        insert into crm.tasks (user_id, title, description, due_at, method, source) values
          (${userId}, 'Update the comping report template', 'Add the Cash+ line.',
           (date_trunc('day', now() at time zone ${tz}) + interval '16 hours') at time zone ${tz}, 'Task', 'Manual'),
          (${userId}, 'Send weekly pipeline summary', null,
           (date_trunc('day', now() at time zone ${tz}) + interval '2 days 9 hours') at time zone ${tz}, 'Email', 'Manual')`
    })
    console.log(`Seeded ${DEALS.length} deals for ${email}`)
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
