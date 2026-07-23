import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Vendored locally (js/vendor/supabase-js.umd.min.js, loaded as a classic script
// before this module) instead of imported from a CDN — that import used to require
// a live fetch to esm.sh on every launch, with nothing caching it for offline/flaky use.
const { createClient } = window.supabase;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
