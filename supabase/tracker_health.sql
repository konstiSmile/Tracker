-- Tracker – Apple-Health-Daten vom Kurzbefehl „Tracker Health“ (Chat 2.7). Nur neue Teile.
create table if not exists public.tracker_health (
  code_hash text not null,
  d date not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (code_hash, d)
);
create index if not exists tracker_health_upd on public.tracker_health (code_hash, updated_at);
alter table public.tracker_health enable row level security;

-- Kurzbefehl: p_d = heute (Tag des Aufwachens), p_data = {sleep, rhr, hrv, workouts, steps_y}.
-- Leere Werte werden ignoriert, vorhandene Felder ergänzt/ersetzt. steps_y (Schritte von gestern) landet beim Vortag.
create or replace function public.tr_health_put(p_code text, p_d date, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h text; t timestamptz := clock_timestamp(); x jsonb;
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  if p_d is null or p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'bad input'; end if;
  if octet_length(p_data::text) > 200000 then raise exception 'too large'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into x
    from jsonb_each(p_data - 'steps_y') where value not in ('null'::jsonb, '""'::jsonb, '0'::jsonb, '"0"'::jsonb);
  if x <> '{}'::jsonb then
    insert into tracker_health(code_hash, d, data, updated_at) values (h, p_d, x, t)
    on conflict (code_hash, d) do update set data = tracker_health.data || excluded.data, updated_at = t;
  end if;
  if coalesce(p_data->>'steps_y', '') not in ('', '0') then
    insert into tracker_health(code_hash, d, data, updated_at) values (h, p_d - 1, jsonb_build_object('steps', p_data->'steps_y'), t)
    on conflict (code_hash, d) do update set data = tracker_health.data || excluded.data, updated_at = t;
  end if;
  return jsonb_build_object('ok', true, 'u', t);
end $$;

create or replace function public.tr_health_get(p_code text, p_since timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h text;
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  return coalesce((select jsonb_agg(jsonb_build_object('d', d, 'data', data, 'u', updated_at) order by d)
    from tracker_health where code_hash = h and (p_since is null or updated_at > p_since)), '[]'::jsonb);
end $$;

revoke all on function public.tr_health_put(text, date, jsonb), public.tr_health_get(text, timestamptz) from public;
grant execute on function public.tr_health_put(text, date, jsonb), public.tr_health_get(text, timestamptz) to anon;
