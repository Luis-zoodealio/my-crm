-- Follow-up cadences: named sequences of touches a user can apply to a deal.
-- Light automation — the cadence suggests the next step, the user confirms.
create table crm.cadences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  -- [{ "days": <int>, "method": <'Call'|'Text'|'Email'|'Voicemail'|'Zoom'> }, ...]
  steps       jsonb not null default '[]'::jsonb,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table crm.cadences enable row level security;
create policy cadences_owner on crm.cadences for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A deal can be on at most one cadence. cadence_step is the index of the NEXT
-- step to schedule; when it reaches the step count the cadence is complete (tail = stop).
alter table crm.deals add column if not exists cadence_id uuid references crm.cadences (id) on delete set null;
alter table crm.deals add column if not exists cadence_step integer not null default 0;
