# Zoodealio CRM

A desktop CRM for working cash offers on homes through listing agents: who was contacted, notes per deal and per property, follow-ups as tasks, and a pipeline from first comping to closing.

Built from the design handoff in [`design_handoff_deal_crm/`](design_handoff_deal_crm/README.md) (the HTML there is a reference, not code that ships).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Postgres on Supabase (email login) · Drizzle ORM.

## Screens

Dashboard · Leads (server-side filters, sorts, search, saved views, bulk actions, paging) · Board · Deal detail · Add/Edit deal · Tasks · Agents · Agent profile · Schedule modal · Settings.

Filtering, sorting, search and paging all run in the database, so Leads, the deal picker and agent search work with thousands of deals.

## Setup

1. **Install**
   ```bash
   npm install
   ```
2. **Environment.** Copy `.env.example` to `.env.local` and fill it in:
   | Variable | Where to get it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `DATABASE_URL` | Supabase → Connect → **Transaction pooler** string (server only, never exposed to the browser) |
3. **Create the tables.** This creates a `crm` schema and leaves any other schema alone:
   ```bash
   npm run db:migrate
   ```
4. **Run it**, then sign up at `/login`:
   ```bash
   npm run dev
   ```
5. **Optional sample data** (12 fictional deals from the prototype) for an account that has no deals yet:
   ```bash
   SEED_USER_EMAIL=you@example.com npm run db:seed
   ```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run db:migrate` | Applies `db/migrations/*.sql` in order, once each |
| `npm run db:seed` | Sample data (refuses if the user already has deals) |
| `npm test` | Unit tests for URL/filter parsing, formatting, time zones and the stage model |
| `npm run lint` | ESLint |

## How it works

- **Auth and data isolation.** Supabase Auth (email + password). `proxy.ts` protects every route except `/login`. Every query is scoped by the verified user id, every table has an owner column, and composite foreign keys stop a row from pointing at another user's deal. Row-level security is on for all tables, and the browser-facing roles have no access to the `crm` schema at all.
- **Cash and Cash+** are two real stored columns on each deal.
- **Last contact** is kept equal to the newest note by a database trigger (a new deal counts from its creation time).
- **Follow-ups are tasks.** A deal's "next follow-up" is its earliest open Follow-up task. Setting a new one from a deal replaces the open one. Completing a task never edits the deal; the deal just moves on to its next follow-up, or "None scheduled". Tasks created from the Tasks page are always Manual.
- **Stale** = an active deal (stages 0–7) with no contact for N days. N and your time zone are in **Settings**. The time zone decides "today" and "overdue".
- **Saved views** are per user and stored as validated JSON. The four defaults are created on first sign-in.
- **Bulk "Move to next stage"** advances active deals one stage and stops at Closed.

## Layout

```
app/(app)/…        authenticated screens (dashboard, leads, board, deals, tasks, agents, settings)
app/login          sign in / sign up
components/        shared UI (Button, Modal, Sidebar, ScheduleModal, …)
lib/               queries, server actions, spec/validation, formatting
db/migrations/     SQL schema (source of truth for constraints, triggers and RLS)
scripts/           migrate + seed
tests/             unit tests
```

## Deploying (Vercel)

Add the three environment variables above to the project, run `npm run db:migrate` once against the production database, and deploy. Use the pooler connection string for `DATABASE_URL`.

## Known gaps

- No agent delete, no deal merge, no CSV import/export.
