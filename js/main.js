import { supabase } from './supabase-client.js';
import { setState, getState, go, loadAll, redeemPendingReferral } from './store.js';
import { registerScreens, startRouter } from './router.js';
import { registerServiceWorker } from './push.js';

// Capture a referral deep link (…/#/redeem/CODE) before anything else consumes the
// hash — works whether the tapper is already logged in, mid-onboarding, or hasn't
// signed up yet. Actually redeeming it happens later, once we know who "me()" is.
const redeemMatch = location.hash.match(/^#\/redeem\/([A-Za-z0-9]+)/i);
if (redeemMatch) {
  sessionStorage.setItem('pact_pending_referral', redeemMatch[1].toUpperCase());
  history.replaceState(null, '', location.pathname + location.search);
}

import { screens as authScreens } from './views/auth.js';
import { screens as onboardingScreens } from './views/onboarding.js';
import { screens as dashboardScreens } from './views/dashboard.js';
import { screens as vaultScreens } from './views/vault.js';
import { screens as networkScreens } from './views/network.js';
import { screens as contractScreens } from './views/contract.js';
import { screens as profileScreens } from './views/profile.js';
import { screens as miscScreens } from './views/misc.js';

// This module executing at all means the boot-shell timeout in index.html can stand down.
if (window.__pactBootTimer) { clearTimeout(window.__pactBootTimer); window.__pactBootTimer = null; }

registerScreens({
  ...authScreens, ...onboardingScreens, ...dashboardScreens, ...vaultScreens,
  ...networkScreens, ...contractScreens, ...profileScreens, ...miscScreens,
});

registerServiceWorker().catch(() => {});

// Supabase calls reject on a network error but can hang indefinitely on a stalled
// connection — race them against a timeout so boot always resolves to a screen.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out')), ms)),
  ]);
}

const PRE_APP_SCREENS = new Set(['loading', 'splash', 'auth', 'emailAuth', 'forgotPassword', 'forgotSent', 'confirmEmailSent']);

async function enterApp(session) {
  setState({ screen: 'loading', session });
  const ok = await withTimeout(loadAll(), 12000).then(() => true).catch(() => false);
  if (!ok) { go('networkError'); return; }
  const st = getState();
  if (!st.profile?.name) { go('onbTutorial', { ui: { ...st.ui, obTutorial: { step: 1 } } }); return; }
  await redeemPendingReferral();
  const hashDetail = location.hash.match(/^#\/detail\/([\w-]+)/);
  if (hashDetail && st.contracts.some(c => c.id === hashDetail[1])) {
    go('detail', { activeContractId: hashDetail[1] });
  } else if (location.hash.startsWith('#/notifCenter')) {
    go('notifCenter');
  } else {
    go('dashboard');
  }
}

async function boot() {
  setState({ screen: 'loading' });
  try {
    const { data: { session } } = await withTimeout(supabase.auth.getSession(), 12000);
    if (session) await enterApp(session);
    else go('splash');
  } catch (e) {
    console.error(e);
    go('networkError');
  }
}

supabase.auth.onAuthStateChange((event, session) => {
  setState({ session });
  if (event === 'SIGNED_OUT') { go('splash'); return; }
  // Picks up the session created when a user taps the email confirmation link
  // and lands back on the app (detectSessionInUrl handles the token exchange).
  if (session && PRE_APP_SCREENS.has(getState().screen)) {
    enterApp(session).catch(() => go('networkError'));
  }
});

startRouter();
boot();
