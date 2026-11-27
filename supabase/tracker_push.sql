-- Tracker – Mitteilungen (Web-Push, 4.2). Nur neue Teile, nichts Bestehendes wird geändert.
-- Ablauf: App meldet ihr Push-Abo (tr_push_sub). Alle 15 Minuten ruft pg_cron die Edge Function „tracker-push“ auf.
-- Die fragt tr_push_due, wer jetzt dran ist (Ortszeit Europe/Berlin), und schickt die Mitteilungen.
-- Morgens (t1, Standard 6:30) und Nachfass (t2, Standard 9:00) – beide nur, wenn heute noch keine Health-Daten da sind.

create table if not exists public.tracker_push (
  endpoint text primary key,
  code_hash text not null,
  p256dh text not null,
  auth text not null,
  t1 time not null default '06:30',
  t2 time not null default '09:00',
  sent_m date,
  sent_c date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tracker_push_code on public.tracker_push (code_hash);
alter table public.tracker_push enable row level security;

-- VAPID-Schlüssel: legt die Edge Function beim ersten Aufruf selbst an (Privatschlüssel verlässt Supabase nie)
create table if not exists public.tracker_push_cfg (
  k text primary key,
  v text not null
);
alter table public.tracker_push_cfg enable row level security;

-- App: Abo speichern/aktualisieren. p_sub = PushSubscription.toJSON() = {endpoint, keys:{p256dh, auth}}
create or replace function public.tr_push_sub(p_code text, p_sub jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h text; ep text := p_sub->>'endpoint'; k1 text := p_sub->'keys'->>'p256dh'; k2 text := p_sub->'keys'->>'auth';
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  if ep is null or ep !~ '^https://' or length(ep) > 1000 or coalesce(length(k1), 0) not between 20 and 200
     or coalesce(length(k2), 0) not between 8 and 100 then raise exception 'bad subscription'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  insert into tracker_push(endpoint, code_hash, p256dh, auth) values (ep, h, k1, k2)
  on conflict (endpoint) do update set code_hash = excluded.code_hash, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now();
  -- höchstens 10 Geräte pro Code (älteste fliegen raus)
  delete from tracker_push where code_hash = h and endpoint not in
    (select endpoint from tracker_push where code_hash = h order by updated_at desc limit 10);
  return jsonb_build_object('ok', true);
end $$;

-- App: Abo löschen (Mitteilungen ausschalten)
create or replace function public.tr_push_unsub(p_code text, p_endpoint text)
returns boolean language plpgsql security definer set search_path = public as $$
declare h text;
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  delete from tracker_push where code_hash = h and endpoint = p_endpoint;
  return found;
end $$;

-- Nur Edge Function (service_role): Schlüssel lesen / einmalig anlegen
create or replace function public.tr_push_vapid()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when count(*) = 2 then jsonb_object_agg(k, v) end from tracker_push_cfg where k in ('pub', 'priv');
$$;
create or replace function public.tr_push_vapid_set(p_pub text, p_priv text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from tracker_push_cfg where k = 'pub') then
    insert into tracker_push_cfg(k, v) values ('pub', p_pub), ('priv', p_priv) on conflict (k) do nothing;
  end if;
  return tr_push_vapid();
end $$;

-- Nur Edge Function: Abos eines Codes (für „Test senden“)
create or replace function public.tr_push_list(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h text;
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  return coalesce((select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth))
    from tracker_push where code_hash = h), '[]'::jsonb);
end $$;

-- Nur Edge Function: abgelaufenes Abo entfernen (Push-Dienst meldet 404/410)
create or replace function public.tr_push_gone(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from tracker_push where endpoint = p_endpoint;
$$;

-- Nur Edge Function: wer ist jetzt dran? Markiert als erledigt (auch wenn wegen vorhandener Daten nichts gesendet wird),
-- damit nie doppelt gesendet wird. Fenster: bis 2 Stunden nach der Uhrzeit (falls ein Aufruf ausfällt).
create or replace function public.tr_push_due()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  loc timestamp := now() at time zone 'Europe/Berlin'; ld date := loc::date; lt time := loc::time;
  mid timestamptz := ld::timestamp at time zone 'Europe/Berlin'; res jsonb := '[]'; x jsonb;
begin
  with m as (update tracker_push set sent_m = ld
             where sent_m is distinct from ld and lt >= t1 and lt < t1 + interval '2 hours'
             returning endpoint, code_hash, p256dh, auth)
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth, 'kind', 'm')), '[]') into x
    from m where not exists (select 1 from tracker_health h where h.code_hash = m.code_hash and h.updated_at >= mid);
  res := res || x;
  with c as (update tracker_push set sent_c = ld
             where sent_c is distinct from ld and lt >= t2 and lt < t2 + interval '2 hours'
             returning endpoint, code_hash, p256dh, auth)
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth, 'kind', 'c')), '[]') into x
    from c where not exists (select 1 from tracker_health h where h.code_hash = c.code_hash and h.updated_at >= mid);
  return res || x;
end $$;

-- Rechte: App (anon) darf nur an- und abmelden. Alles andere nur service_role (Edge Function).
revoke all on function public.tr_push_sub(text, jsonb), public.tr_push_unsub(text, text),
  public.tr_push_vapid(), public.tr_push_vapid_set(text, text), public.tr_push_list(text),
  public.tr_push_gone(text), public.tr_push_due() from public, anon, authenticated;
grant execute on function public.tr_push_sub(text, jsonb), public.tr_push_unsub(text, text) to anon;
grant execute on function public.tr_push_vapid(), public.tr_push_vapid_set(text, text), public.tr_push_list(text),
  public.tr_push_gone(text), public.tr_push_due() to service_role;

-- Zeitplan: alle 15 Minuten die Edge Function anstoßen (sie sendet nur, was fällig ist)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.schedule('tracker-push', '*/15 * * * *', $cron$
  select net.http_post(
    url := 'https://qbdpzamygonpruaafcrt.supabase.co/functions/v1/tracker-push',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb)
$cron$);
