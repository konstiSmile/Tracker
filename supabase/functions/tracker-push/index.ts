// Tracker – Edge Function „tracker-push“ (4.2). Im Supabase-Dashboard anlegen, „Verify JWT“ AUS.
// Aufrufe:
//   {}                          → Zeitplan (pg_cron alle 15 Min.): sendet, was laut tr_push_due fällig ist
//   {"mode":"key"}              → öffentlicher VAPID-Schlüssel für die App (legt beim ersten Mal ein Schlüsselpaar an)
//   {"mode":"test","code":"…"}  → Test-Mitteilung an alle Geräte dieses Sync-Codes
// Mehrfaches Aufrufen schadet nicht: fällige Mitteilungen werden in der Datenbank als erledigt markiert.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const TEXT: Record<string, { title: string; body: string }> = {
  m: { title: 'Uhrdaten holen', body: 'Kurz den Tracker öffnen und die Daten von der Uhr holen.' },
  c: { title: 'Uhrdaten fehlen noch', body: 'Heute sind noch keine Daten von der Uhr angekommen.' },
  test: { title: 'Tracker', body: 'Test: Mitteilungen funktionieren.' },
};

let keys: { pub: string; priv: string } | null = null;
async function vapid() {
  if (keys) return keys;
  let { data, error } = await db.rpc('tr_push_vapid');
  if (error) throw error;
  if (!data) {
    const k = webpush.generateVAPIDKeys();
    ({ data, error } = await db.rpc('tr_push_vapid_set', { p_pub: k.publicKey, p_priv: k.privateKey }));
    if (error) throw error;
  }
  keys = data;
  webpush.setVapidDetails('https://konstismile.github.io/Tracker/', keys!.pub, keys!.priv);
  return keys!;
}

type Sub = { endpoint: string; p256dh: string; auth: string; kind?: string };
async function send(s: Sub, kind: string) {
  const t = TEXT[kind] || TEXT.test;
  try {
    await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify({ ...t, tag: kind === 'test' ? 'test' : 'health', url: './' }), { TTL: 3 * 3600, urgency: 'high' });
    return 'ok';
  } catch (e) {
    const sc = (e as { statusCode?: number }).statusCode;
    if (sc === 404 || sc === 410) { await db.rpc('tr_push_gone', { p_endpoint: s.endpoint }); return 'abgelaufen'; }
    return 'fehler ' + (sc || (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  let b: { mode?: string; code?: string } = {};
  try { b = await req.json(); } catch (_) { /* leerer Aufruf = Zeitplan */ }
  try {
    const k = await vapid();
    if (b.mode === 'key') return json({ key: k.pub });
    if (b.mode === 'test') {
      const { data, error } = await db.rpc('tr_push_list', { p_code: String(b.code || '') });
      if (error) throw error;
      const r = await Promise.all((data as Sub[]).map((s) => send(s, 'test')));
      return json({ ok: true, n: r.length, r });
    }
    const { data, error } = await db.rpc('tr_push_due');
    if (error) throw error;
    const r = await Promise.all((data as Sub[]).map((s) => send(s, s.kind || 'm')));
    return json({ ok: true, n: r.length, r });
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
