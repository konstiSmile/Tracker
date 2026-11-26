-- Tracker – Supabase (Sync-Code, Speicherung pro Tag). Nur neue Teile, nichts Bestehendes wird geändert.
create table if not exists public.tracker_days (
  code_hash text not null,
  d date not null,
  data jsonb not null,
  deleted boolean not null default false,
  prev jsonb,
  updated_at timestamptz not null default now(),
  primary key (code_hash, d)
);
create index if not exists tracker_days_upd on public.tracker_days (code_hash, updated_at);
alter table public.tracker_days enable row level security;

create table if not exists public.tracker_meta (
  code_hash text not null,
  k text not null check (k in ('cfg','weeks','hint')),
  data jsonb not null,
  prev jsonb,
  updated_at timestamptz not null default now(),
  primary key (code_hash, k)
);
alter table public.tracker_meta enable row level security;

-- Holen: alles, was seit p_since geändert wurde (ohne p_since: alles)
create or replace function public.tr_pull(p_code text, p_since timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h text;
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  return jsonb_build_object(
    'now', now(),
    'days', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'data', data, 'del', deleted, 'u', updated_at) order by d)
                      from tracker_days where code_hash = h and (p_since is null or updated_at > p_since)), '[]'::jsonb),
    'meta', coalesce((select jsonb_object_agg(k, jsonb_build_object('data', data, 'u', updated_at))
                      from tracker_meta where code_hash = h and (p_since is null or updated_at > p_since)), '{}'::jsonb));
end $$;

-- Senden: p_days = [{d, data, base, del}], p_meta = {cfg:{data,base}, weeks:{data,base}, hint:{data}}
-- base = Stand, den das Gerät zuletzt kannte. Ist der Server neuer -> Konflikt (Serverfassung zurück, nichts überschrieben).
create or replace function public.tr_push(p_code text, p_days jsonb default '[]', p_meta jsonb default '{}', p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  h text; t timestamptz := clock_timestamp();
  x jsonb; mk text; cur record; ex boolean; base timestamptz; isdel boolean; dd date;
  ok jsonb := '[]'; conf jsonb := '[]'; mok jsonb := '{}'; mconf jsonb := '{}';
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  p_days := coalesce(p_days, '[]'); p_meta := coalesce(p_meta, '{}');
  if jsonb_typeof(p_days) <> 'array' or jsonb_typeof(p_meta) <> 'object' then raise exception 'bad input'; end if;
  if octet_length(p_days::text) + octet_length(p_meta::text) > 2000000 then raise exception 'too large'; end if;
  if not p_force and (select count(*) from jsonb_array_elements(p_days) e where coalesce((e->>'del')::boolean, false)) > 3 then
    raise exception 'too many deletes';
  end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');

  for x in select * from jsonb_array_elements(p_days) loop
    dd := (x->>'d')::date;
    isdel := coalesce((x->>'del')::boolean, false);
    if octet_length(coalesce(x->'data','null'::jsonb)::text) > 100000 then raise exception 'day too large'; end if;
    -- leere Tage ohne ausdrückliches Löschen werden ignoriert (Schutz gegen leere App)
    if not isdel and (x->'data' is null or jsonb_typeof(x->'data') <> 'object' or x->'data' = '{}'::jsonb) then continue; end if;
    base := nullif(x->>'base','')::timestamptz;
    select data, deleted, updated_at into cur from tracker_days where code_hash = h and d = dd for update;
    ex := found;
    if ex then
      if (isdel and cur.deleted) or (not isdel and not cur.deleted and cur.data = x->'data') then
        ok := ok || jsonb_build_array(jsonb_build_object('d', dd, 'u', cur.updated_at)); continue;   -- schon gleich
      end if;
      if base is null or cur.updated_at > base then
        conf := conf || jsonb_build_array(jsonb_build_object('d', dd, 'data', cur.data, 'del', cur.deleted, 'u', cur.updated_at)); continue;
      end if;
      update tracker_days set prev = data, data = case when isdel then '{}'::jsonb else x->'data' end,
        deleted = isdel, updated_at = t where code_hash = h and d = dd;
    elsif isdel then
      continue;
    else
      insert into tracker_days(code_hash, d, data, updated_at) values (h, dd, x->'data', t);
    end if;
    ok := ok || jsonb_build_array(jsonb_build_object('d', dd, 'u', t));
  end loop;

  for mk in select key from jsonb_each(p_meta) loop
    if mk not in ('cfg','weeks','hint') then continue; end if;
    x := p_meta->mk;
    if x->'data' is null or jsonb_typeof(x->'data') <> 'object' then continue; end if;
    base := nullif(x->>'base','')::timestamptz;
    select data, updated_at into cur from tracker_meta where code_hash = h and tracker_meta.k = mk for update;
    ex := found;
    if ex then
      if cur.data = x->'data' then mok := mok || jsonb_build_object(mk, cur.updated_at); continue; end if;
      if mk <> 'hint' and (base is null or cur.updated_at > base) then
        mconf := mconf || jsonb_build_object(mk, jsonb_build_object('data', cur.data, 'u', cur.updated_at)); continue;
      end if;
      update tracker_meta set prev = case when mk = 'hint' then null else data end, data = x->'data', updated_at = t
        where code_hash = h and tracker_meta.k = mk;
    else
      insert into tracker_meta(code_hash, k, data, updated_at) values (h, mk, x->'data', t);
    end if;
    mok := mok || jsonb_build_object(mk, t);
  end loop;

  return jsonb_build_object('now', t, 'ok', ok, 'conflicts', conf, 'meta_ok', mok, 'meta_conflicts', mconf);
end $$;

-- Widget: gleiches Format wie bisher doGet?w=1 der Tabelle
create or replace function public.tr_widget(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare h text; c jsonb; w jsonb;
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  select data into c from tracker_meta where code_hash = h and k = 'cfg';
  select data into w from tracker_meta where code_hash = h and k = 'weeks';
  return jsonb_build_object('ok', true, 'w', 1,
    'stand', (select max(updated_at) from tracker_days where code_hash = h),
    'cfg', jsonb_build_object('halfLife', c->'halfLife', 'limit', c->'limit',
       'habits', coalesce((select jsonb_agg(jsonb_build_object('id', e->'id', 'name', e->'name', 'type', e->'type', 'hid', e->'hid'))
                           from jsonb_array_elements(coalesce(c->'habits','[]'::jsonb)) e), '[]'::jsonb)),
    'days', coalesce((select jsonb_object_agg(s.d::text, s.data) from
       (select d, data from tracker_days where code_hash = h and not deleted order by d desc limit 10) s), '{}'::jsonb),
    'weeks', coalesce((select jsonb_object_agg(s.key, jsonb_build_object('done', s.value->'done')) from
       (select key, value from jsonb_each(coalesce(w,'{}'::jsonb)) order by key desc limit 2) s), '{}'::jsonb),
    'hint', (select data from tracker_meta where code_hash = h and k = 'hint'));
end $$;

-- Notfall: einen Tag auf die vorige Fassung zurücksetzen
create or replace function public.tr_undo(p_code text, p_d date)
returns boolean language plpgsql security definer set search_path = public as $$
declare h text;
begin
  if p_code is null or length(p_code) < 16 then raise exception 'code too short'; end if;
  h := encode(sha256(convert_to(p_code,'UTF8')),'hex');
  update tracker_days set data = prev, prev = data, deleted = (prev = '{}'::jsonb), updated_at = clock_timestamp()
    where code_hash = h and d = p_d and prev is not null;
  return found;
end $$;

revoke all on function public.tr_pull(text, timestamptz), public.tr_push(text, jsonb, jsonb, boolean),
  public.tr_widget(text), public.tr_undo(text, date) from public;
grant execute on function public.tr_pull(text, timestamptz), public.tr_push(text, jsonb, jsonb, boolean),
  public.tr_widget(text), public.tr_undo(text, date) to anon;
