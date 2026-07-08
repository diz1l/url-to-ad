-- Run this in the Supabase SQL Editor
-- Project: url-to-ad

create table projects (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  status text not null default 'pending', -- pending | extracting | generating | done | error
  error_message text,
  brand_profile jsonb,
  image_candidates jsonb,  -- string[]
  metrics jsonb,           -- { fetch_ms, render_used, llm_ms, tokens_in, tokens_out, est_cost_usd }
  created_at timestamptz default now()
);

create table ads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  idea text,
  primary_text text,
  headline text,
  description text,
  cta text,
  image_url text,
  position int,  -- 1..3
  updated_at timestamptz default now()
);
