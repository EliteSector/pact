// Sends a Web Push notification to every subscription on file for the notification's recipient.
// Invoked by the `notifications_after_insert_push` database webhook (see migrations/0004).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@pact.app';
const APP_URL = (Deno.env.get('APP_URL') || 'https://elitesector.github.io/pact/').replace(/\/$/, '');
const PUSH_WEBHOOK_SECRET = Deno.env.get('PUSH_WEBHOOK_SECRET')!;

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async req => {
  try {
    // Deployed with --no-verify-jwt (the caller is a DB trigger, not a Supabase-issued JWT),
    // so this is the only thing standing between this endpoint and the public internet.
    const auth = req.headers.get('Authorization') || '';
    if (auth !== `Bearer ${PUSH_WEBHOOK_SECRET}`) return new Response('unauthorized', { status: 401 });

    const { record } = await req.json();
    if (!record?.user_id) return new Response('ok', { status: 200 });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .eq('user_id', record.user_id);

    if (error) throw error;
    if (!subs?.length) return new Response('no subscriptions', { status: 200 });

    const payload = JSON.stringify({
      title: record.title,
      body: record.body,
      url: record.contract_id ? `${APP_URL}/#/detail/${record.contract_id}` : `${APP_URL}/#/notifCenter`,
    });

    await Promise.all(subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload,
        );
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('push send failed', sub.id, err);
        }
      }
    }));

    return new Response('sent', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});
