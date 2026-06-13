-- Telegram notification settings per wallet address
create table if not exists public.telegram_settings (
  wallet_address        text primary key,
  chat_id               text not null,
  display_name          text not null default '',
  notif_tx_executed     boolean not null default true,
  notif_guardrail       boolean not null default true,
  notif_strategy_change boolean not null default true,
  notif_daily_report    boolean not null default false,
  daily_report_hour     smallint not null default 8 check (daily_report_hour >= 0 and daily_report_hour <= 23),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger telegram_settings_updated_at
  before update on public.telegram_settings
  for each row execute procedure public.set_updated_at();
