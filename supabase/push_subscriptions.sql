-- Push subscriptions table for web push notifications
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  keys jsonb not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

-- Users can only manage their own subscriptions
create policy "Users manage own push subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id);

-- Service role can read all (for sending pushes)
create policy "Service role reads all" on push_subscriptions
  for select using (true);
