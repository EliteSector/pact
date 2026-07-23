import { supabase } from './supabase-client.js';
import { setState, getState, go, loadAll } from './store.js';
import { registerScreens, startRouter } from './router.js';
import { registerServiceWorker } from './push.js';

import { screens as authScreens } from './views/auth.js';
import { screens as onboardingScreens } from './views/onboarding.js';
import { screens as dashboardScreens } from './views/dashboard.js';
import { screens as vaultScreens } from './views/vault.js';
import { screens as networkScreens } from './views/network.js';
import { screens as contractScreens } from './views/contract.js';
import { screens as profileScreens } from './views/profile.js';
import { screens as miscScreens } from './views/misc.js';

registerScreens({
  ...authScreens, ...onboardingScreens, ...dashboardScreens, ...vaultScreens,
  ...networkScreens, ...contractScreens, ...profileScreens, ...miscScreens,
});

registerServiceWorker().catch(() => {});

const PRE_APP_SCREENS = new Set(['loading', 'splash', 'auth', 'emailAuth', 'forgotPassword', 'forgotSent', 'confirmEmailSent']);

async function enterApp(session) {
  setState({ screen: 'loading', session });
  const ok = await loadAll().then(() => true).catch(() => false);
  if (!ok) { go('networkError'); return; }
  const st = getState();
  if (!st.profile?.name) { go('onbTutorial', { ui: { ...st.ui, obTutorial: { step: 1 } } }); return; }
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
    const { data: { session } } = await supabase.auth.getSession();
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
