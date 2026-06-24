-- Run this in the Supabase SQL editor to create the schema

-- Users table (linked to Supabase Auth)
create table users (
  id uuid primary key references auth.users(id),
  wallet_address text unique not null,
  created_at timestamptz default now()
);

-- Challenges table
create table challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references users(id) not null,
  on_chain_id integer,
  entry_fee bigint not null default 0,
  daily_penalty bigint not null,
  duration_days integer not null,
  max_participants integer not null,
  daily_limit_minutes integer not null,
  status text not null default 'open' check (status in ('open', 'active', 'completed', 'settled')),
  current_day integer not null default 0,
  started_at timestamptz,
  winner_id uuid references users(id),
  created_at timestamptz default now()
);

-- Challenge participants (join table)
create table challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references challenges(id) not null,
  user_id uuid references users(id) not null,
  joined_at timestamptz default now(),
  unique(challenge_id, user_id)
);

-- Screen time reports
create table screen_time_reports (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid references challenges(id) not null,
  user_id uuid references users(id) not null,
  date date not null,
  minutes integer not null,
  created_at timestamptz default now(),
  unique(challenge_id, user_id, date)
);

-- Indexes
create index idx_challenges_status on challenges(status);
create index idx_participants_challenge on challenge_participants(challenge_id);
create index idx_participants_user on challenge_participants(user_id);
create index idx_screentime_challenge_date on screen_time_reports(challenge_id, date);

-- RLS policies (service key bypasses these, but good practice)
alter table users enable row level security;
alter table challenges enable row level security;
alter table challenge_participants enable row level security;
alter table screen_time_reports enable row level security;

-- Users can read their own row
create policy "users_read_own" on users for select using (auth.uid() = id);
-- Challenges are readable by all authenticated users
create policy "challenges_read" on challenges for select using (auth.role() = 'authenticated');
-- Participants are readable by all authenticated users
create policy "participants_read" on challenge_participants for select using (auth.role() = 'authenticated');
-- Screen time readable by participants of that challenge
create policy "screentime_read" on screen_time_reports for select using (auth.role() = 'authenticated');
