-- Deal CRM schema. Lives in its own `crm` schema so it never touches the
-- legacy public.deals / public.contacts tables.
--
-- Access model: the app connects with DATABASE_URL (server only) and scopes every
-- query by the user id from the verified Supabase session. RLS is enabled with
-- owner-only policies as a second layer, and no privileges are granted to the
-- anon/authenticated roles, so PostgREST cannot reach this schema even if it is
-- exposed later by mistake.

create schema if not exists crm;
create extension if not exists pg_trgm with schema extensions;

-- ---------- settings ----------
create table crm.user_settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  stale_days  integer not null default 7 check (stale_days >= 1),
  timezone    text not null default 'America/Chicago',
  created_at  timestamptz not null default now()
);

-- ---------- agents ----------
create table crm.agents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  agency      text,
  phone       text,
  email       text,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);
create unique index agents_user_name_agency_key
  on crm.agents (user_id, lower(name), coalesce(lower(agency), ''));
create index agents_name_trgm on crm.agents using gin (name extensions.gin_trgm_ops);

-- ---------- deals ----------
create table crm.deals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  agent_id         uuid,
  address          text not null check (length(btrim(address)) > 0),
  city             text,
  state            text,
  zip              text,
  -- 0 Comping complete ... 9 Inspection period, 10 Closed, 11 Lost / dead
  stage            smallint not null default 0 check (stage between 0 and 11),
  lead_status      text not null default 'Warm' check (lead_status in ('Hot', 'Warm', 'Cold', 'Dead')),
  cash_offer       numeric(12, 2) check (cash_offer >= 0),
  cash_plus_offer  numeric(12, 2) check (cash_plus_offer >= 0),
  -- Set at creation, then kept equal to the newest note by a trigger.
  last_contact_at  timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, user_id),
  foreign key (agent_id, user_id) references crm.agents (id, user_id) on delete set null (agent_id)
);
create index deals_user_stage_idx        on crm.deals (user_id, stage);
create index deals_user_lead_status_idx  on crm.deals (user_id, lead_status);
create index deals_user_last_contact_idx on crm.deals (user_id, last_contact_at);
create index deals_user_cash_offer_idx   on crm.deals (user_id, cash_offer);
create index deals_user_agent_idx        on crm.deals (user_id, agent_id);
create index deals_address_trgm on crm.deals using gin (address extensions.gin_trgm_ops);

-- ---------- notes ----------
create table crm.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  deal_id     uuid not null,
  type        text not null check (type in ('Call', 'Text', 'Email', 'Voicemail', 'Zoom')),
  body        text not null check (length(btrim(body)) > 0),
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (deal_id, user_id) references crm.deals (id, user_id) on delete cascade
);
create index notes_deal_created_idx on crm.notes (deal_id, created_at desc);

-- ---------- property notes ----------
create table crm.property_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  deal_id     uuid not null,
  body        text not null check (length(btrim(body)) > 0),
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  foreign key (deal_id, user_id) references crm.deals (id, user_id) on delete cascade
);
create index property_notes_deal_created_idx on crm.property_notes (deal_id, created_at desc);

-- ---------- tasks ----------
create table crm.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  deal_id      uuid,
  title        text not null check (length(btrim(title)) > 0),
  description  text,
  due_at       timestamptz not null,
  method       text not null default 'Task' check (method in ('Call', 'Text', 'Email', 'Voicemail', 'Zoom', 'Task')),
  done         boolean not null default false,
  done_at      timestamptz,
  source       text not null check (source in ('Follow-up', 'Manual')),
  created_at   timestamptz not null default now(),
  foreign key (deal_id, user_id) references crm.deals (id, user_id) on delete cascade
);
create index tasks_user_done_due_idx on crm.tasks (user_id, done, due_at);
create index tasks_deal_idx          on crm.tasks (deal_id) where deal_id is not null;

-- ---------- saved views ----------
create table crm.saved_views (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) > 0),
  rules       jsonb not null default '[]'::jsonb,
  sorts       jsonb not null default '[]'::jsonb,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------- triggers ----------
create function crm.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger deals_touch_updated_at before update on crm.deals
  for each row execute function crm.touch_updated_at();
create trigger notes_touch_updated_at before update on crm.notes
  for each row execute function crm.touch_updated_at();

-- last_contact_at = newest note, or the deal's creation time when it has none.
create function crm.sync_last_contact() returns trigger
language plpgsql as $$
declare
  target uuid := coalesce(new.deal_id, old.deal_id);
begin
  update crm.deals d
     set last_contact_at = coalesce(
           (select max(n.created_at) from crm.notes n where n.deal_id = d.id),
           d.created_at)
   where d.id = target;
  return null;
end $$;

create trigger notes_sync_last_contact
  after insert or update of created_at or delete on crm.notes
  for each row execute function crm.sync_last_contact();

-- ---------- row level security ----------
do $$
declare t text;
begin
  foreach t in array array['user_settings', 'agents', 'deals', 'notes', 'property_notes', 'tasks', 'saved_views']
  loop
    execute format('alter table crm.%I enable row level security', t);
    execute format(
      'create policy %I on crm.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || '_owner', t);
  end loop;
end $$;
