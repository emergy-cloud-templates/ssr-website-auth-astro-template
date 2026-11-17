-- Adapted from /common/legos/node/stripe-billing@1.0.0 (dvk-common dfb9868). Owned by this project.
-- The emergy.cloud platform creates these tables in the project's database (the host script runs this file); a
-- project without the platform runs it with its own migrations.
-- Lego stripe-billing: the Stripe customer of each user and a mirror of their subscriptions (the webhook writes it;
-- the app reads it, never Stripe, to decide access). Run it with the project's migrations (db:migrate); never applied
-- by an agent. Server only: row level security on, no policy. Text ids so a local provider fits.
create table if not exists public.billing_customers (
  user_id text primary key,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  -- Stripe's subscription id.
  id text primary key,
  user_id text not null,
  customer_id text not null,
  -- The product's plan id; null for a price the product does not sell.
  plan text,
  price_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user on public.billing_subscriptions (user_id);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
