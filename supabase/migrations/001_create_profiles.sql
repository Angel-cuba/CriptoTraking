-- Kripto: user profiles
-- Authentication is managed by Supabase Auth.

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    risk_profile text not null default 'balanced',
    watchlist text[] not null default '{}',
    updated_at timestamptz not null default now(),

    constraint valid_risk_profile
        check (
            risk_profile in (
                'conservative',
                'balanced',
                'aggressive'
            )
        )
);

-- Enable Row Level Security.
alter table public.profiles enable row level security;

-- Users can only read their own profile.
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Users can only create their own profile.
create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- Users can only update their own profile.
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Users can only delete their own profile.
create policy "Users can delete own profile"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);
