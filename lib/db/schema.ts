import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgSchema,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Mirrors db/migrations/*.sql, which is the source of truth for constraints,
// indexes, triggers and RLS.
export const crm = pgSchema('crm')

export const userSettings = crm.table('user_settings', {
  userId: uuid('user_id').primaryKey(),
  staleDays: integer('stale_days').notNull().default(7),
  timezone: text('timezone').notNull().default('America/Chicago'),
})

export const agents = crm.table('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  agency: text('agency'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const deals = crm.table('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  agentId: uuid('agent_id'),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  stage: smallint('stage').notNull().default(0),
  leadStatus: text('lead_status').notNull().default('Warm'),
  cashOffer: numeric('cash_offer', { precision: 12, scale: 2, mode: 'number' }),
  cashPlusOffer: numeric('cash_plus_offer', { precision: 12, scale: 2, mode: 'number' }),
  lastContactAt: timestamp('last_contact_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  dealiodeskTransactionId: text('dealiodesk_transaction_id').unique(),
  cadenceId: uuid('cadence_id'),
  cadenceStep: integer('cadence_step').notNull().default(0),
})

export const cadences = crm.table('cadences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  steps: jsonb('steps').notNull().default([]),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notes = crm.table('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  dealId: uuid('deal_id').notNull(),
  type: text('type').notNull(),
  body: text('body').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const propertyNotes = crm.table('property_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  dealId: uuid('deal_id').notNull(),
  body: text('body').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tasks = crm.table('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  dealId: uuid('deal_id'),
  title: text('title').notNull(),
  description: text('description'),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  method: text('method').notNull().default('Task'),
  done: boolean('done').notNull().default(false),
  doneAt: timestamp('done_at', { withTimezone: true }),
  source: text('source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const activity = crm.table('activity', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  dealId: uuid('deal_id').notNull(),
  kind: text('kind').notNull(),
  data: jsonb('data').notNull().default({}),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const savedViews = crm.table('saved_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  rules: jsonb('rules').notNull().default([]),
  sorts: jsonb('sorts').notNull().default([]),
  position: integer('position').notNull().default(0),
})
