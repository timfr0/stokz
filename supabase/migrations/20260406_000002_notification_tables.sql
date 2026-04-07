create table if not exists notification_events (
  id bigserial primary key,
  prediction_id bigint references forecast_predictions(id) on delete cascade,
  ticker_id bigint not null references tickers(id) on delete cascade,
  dedupe_key text not null unique,
  channel text,
  event_type text not null default 'signal_alert',
  status text not null default 'pending',
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists notification_deliveries (
  id bigserial primary key,
  notification_event_id bigint not null references notification_events(id) on delete cascade,
  delivery_target text not null,
  delivery_status text not null default 'pending',
  provider_message_id text,
  attempted_at timestamptz not null default now(),
  response_json jsonb not null default '{}'::jsonb
);

alter table notification_events add column if not exists setup_action text not null default 'HOLD';
alter table notification_events add column if not exists is_actionable boolean not null default false;
alter table notification_events add column if not exists setup_label text;
alter table notification_deliveries add column if not exists artifact_source text;
alter table notification_deliveries add column if not exists delivery_context_json jsonb not null default '{}'::jsonb;
