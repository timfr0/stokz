create table if not exists tickers (
  id bigserial primary key,
  symbol text not null unique,
  name text,
  exchange text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists daily_price_bars (
  id bigserial primary key,
  ticker_id bigint not null references tickers(id) on delete cascade,
  trade_date date not null,
  open numeric(18,8),
  high numeric(18,8),
  low numeric(18,8),
  close numeric(18,8) not null,
  adjusted_close numeric(18,8),
  volume bigint,
  log_return numeric(18,8),
  created_at timestamptz not null default now(),
  unique (ticker_id, trade_date)
);

create table if not exists forecast_runs (
  id bigserial primary key,
  model_name text not null,
  backend text not null default 'placeholder',
  horizon_days integer not null default 1,
  universe_size integer not null,
  status text not null default 'completed',
  generated_at timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb
);

create table if not exists forecast_predictions (
  id bigserial primary key,
  forecast_run_id bigint not null references forecast_runs(id) on delete cascade,
  ticker_id bigint not null references tickers(id) on delete cascade,
  as_of_date date not null,
  target_date date not null,
  horizon_days integer not null default 1,
  model_name text not null,
  predicted_return numeric(18,8) not null,
  predicted_direction text not null,
  baseline_return numeric(18,8),
  confidence_label text not null,
  signal_direction text not null default 'FLAT',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists forecast_evaluations (
  id bigserial primary key,
  prediction_id bigint not null references forecast_predictions(id) on delete cascade,
  actual_return numeric(18,8),
  actual_direction text,
  abs_error numeric(18,8),
  hit boolean,
  evaluated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists watchlists (
  id bigserial primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists watchlist_items (
  id bigserial primary key,
  watchlist_id bigint not null references watchlists(id) on delete cascade,
  ticker_id bigint not null references tickers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (watchlist_id, ticker_id)
);

create table if not exists signal_events (
  id bigserial primary key,
  prediction_id bigint references forecast_predictions(id) on delete cascade,
  ticker_id bigint not null references tickers(id) on delete cascade,
  event_date date not null,
  signal_direction text not null,
  confidence_label text not null,
  is_actionable boolean not null default false,
  summary text,
  created_at timestamptz not null default now()
);
