-- Add plan column to subscriptions
alter table subscriptions add column if not exists plan text not null default 'healer';

-- Practitioner clients
create table if not exists practitioner_clients (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  age integer,
  conditions text[] not null default '{}',
  goal text,
  notes text,
  avatar_emoji text not null default '🌿',
  created_at timestamptz not null default now()
);

alter table practitioner_clients enable row level security;
create policy "Practitioners manage own clients" on practitioner_clients
  for all using (auth.uid() = practitioner_id);

-- Session / appointment notes
create table if not exists practitioner_client_sessions (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references practitioner_clients(id) on delete cascade not null,
  session_date date not null default current_date,
  energy integer,
  mood integer,
  symptoms text[] default '{}',
  celery_oz integer,
  morning_protocol boolean default false,
  client_notes text,
  practitioner_notes text,
  protocol_changes text,
  created_at timestamptz not null default now(),
  unique(client_id, session_date)
);

alter table practitioner_client_sessions enable row level security;
create policy "Practitioners manage own sessions" on practitioner_client_sessions
  for all using (auth.uid() = practitioner_id);

-- Cached AI protocols per client
create table if not exists practitioner_protocols (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references practitioner_clients(id) on delete cascade not null,
  content text not null,
  generated_at timestamptz not null default now(),
  unique(client_id)
);

alter table practitioner_protocols enable row level security;
create policy "Practitioners manage own protocols" on practitioner_protocols
  for all using (auth.uid() = practitioner_id);
