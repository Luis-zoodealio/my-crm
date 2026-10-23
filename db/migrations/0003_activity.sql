-- Append-only activity log for the unified deal timeline. Captures system
-- events (stage/status/offer/agent changes, follow-ups, creation) so the deal
-- page can show one chronological history alongside exchanges and property notes.
create table crm.activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  deal_id     uuid not null,
  kind        text not null check (kind in (
                'created', 'imported', 'stage_changed', 'status_changed',
                'offer_changed', 'agent_changed', 'followup_scheduled', 'followup_done')),
  data        jsonb not null default '{}'::jsonb,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  foreign key (deal_id, user_id) references crm.deals (id, user_id) on delete cascade
);
create index activity_deal_created_idx on crm.activity (deal_id, created_at desc);

alter table crm.activity enable row level security;
create policy activity_owner on crm.activity for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
