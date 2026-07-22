import { getState, setState, setUi, go, signUp, signIn, sendPasswordReset } from '../store.js';
import { bindActions } from '../router.js';
import { esc, isValidEmail, passwordScore } from '../util.js';

function splash() {
  return `
  <div class="center-screen">
    <div class="icon-tile" style="background:var(--gold)"><img src="assets/pk/icons/handshake.png" alt="" style="width:56px;height:56px"></div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:34px;line-height:1.1;color:var(--ink)">Make promises.<br>Earn points.<br>Settle favors.</div>
    <div style="font-family:var(--font-body);font-size:15px;color:var(--text-muted)">Pact turns your word into a contract. Literally.</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="go-auth">Get Started</button>
  </div>`;
}

function auth() {
  return `
  <div class="center-screen">
    <div style="font-family:var(--font-display);font-weight:800;font-size:28px;color:var(--ink)">Sign in or join to keep your word.</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">New or returning — one tap and your Reliability Score follows you everywhere.</div>
    <div style="display:grid;gap:10px;margin-top:8px;width:100%">
      <button class="btn btn-primary btn-lg btn-block" data-act="go-email">Continue with Email</button>
    </div>
    <div style="font-family:var(--font-body);font-size:12px;color:var(--text-muted);text-align:center;margin-top:4px">By creating an account, you agree to our<br>
      <a href="#" data-act="go-terms">Terms of Service</a> and <a href="#" data-act="go-privacy">Privacy Policy</a>.</div>
  </div>`;
}

function emailAuth(state) {
  const ea = state.ui.emailAuth;
  const isSignup = ea.mode === 'signup';
  const score = passwordScore(ea.password);
  const strengthLabel = ['Weak', 'Weak', 'Medium', 'Strong'][score] || '';
  const strengthColor = score <= 1 ? 'var(--red)' : score === 2 ? '#a67c00' : '#1a7d33';
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-auth">← Back</button>
    <div class="pill-toggle">
      <button data-act="mode-signup" class="${isSignup ? 'active' : ''}">Sign Up</button>
      <button data-act="mode-signin" class="${!isSignup ? 'active' : ''}">Sign In</button>
    </div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">${isSignup ? 'Create your account.' : 'Welcome back.'}</div>
    <label class="field">
      <span class="field-label">Email</span>
      <input id="ea-email" class="field-input ${ea.errors.email ? 'err' : ''}" type="email" data-model="emailAuth.email" value="${esc(ea.email)}" placeholder="you@example.com">
      ${ea.errors.email ? `<span class="field-error">${esc(ea.errors.email)}</span>` : ''}
    </label>
    <label class="field">
      <span class="field-label">Password</span>
      <input id="ea-password" class="field-input ${ea.errors.password ? 'err' : ''}" type="password" data-model="emailAuth.password" value="${esc(ea.password)}" placeholder="••••••••">
      ${ea.errors.password ? `<span class="field-error">${esc(ea.errors.password)}</span>` : ''}
      ${isSignup && ea.password ? `
        <div style="display:flex;flex-direction:column;gap:4px;margin-top:2px">
          <div style="display:flex;gap:4px">${[0,1,2].map(i => `<div style="flex:1;height:5px;border-radius:3px;border:1px solid var(--ink);background:${i < score ? strengthColor : 'var(--cream-card)'}"></div>`).join('')}</div>
          <span style="font-family:var(--font-display);font-weight:700;font-size:12px;color:${strengthColor}">${strengthLabel}</span>
        </div>` : ''}
      ${!isSignup ? `<button class="link-btn" style="align-self:flex-end;text-decoration:underline;color:var(--ink)" data-act="go-forgot">Forgot password?</button>` : ''}
    </label>
    ${isSignup ? `
    <label class="field">
      <span class="field-label">Confirm password</span>
      <input id="ea-confirm" class="field-input ${ea.errors.confirm ? 'err' : ''}" type="password" data-model="emailAuth.confirm" value="${esc(ea.confirm)}" placeholder="••••••••">
      ${ea.errors.confirm ? `<span class="field-error">${esc(ea.errors.confirm)}</span>` : ''}
    </label>` : ''}
    <button class="btn btn-primary btn-lg btn-block" data-act="submit" ${state.ui.busy ? 'disabled' : ''}>${isSignup ? 'Create Account' : 'Sign In'}</button>
  </div>`;
}

function forgotPassword(state) {
  const err = state.ui.forgotError;
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-email">← Back</button>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Reset your password.</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">Enter your account email and we'll send you a link to reset it.</div>
    <label class="field">
      <span class="field-label">Email</span>
      <input class="field-input ${err ? 'err' : ''}" type="email" data-model="forgotEmail" value="${esc(state.ui.forgotEmail)}" placeholder="you@example.com">
      ${err ? `<span class="field-error">${esc(err)}</span>` : ''}
    </label>
    <button class="btn btn-primary btn-lg btn-block" data-act="submit" style="margin-top:8px">Send Reset Link</button>
  </div>`;
}

function forgotSent(state) {
  return `
  <div class="center-screen">
    <div class="icon-tile" style="background:var(--blue)"><img src="assets/pk/icons/shield-check.png" alt="" style="width:44px;height:44px"></div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Check your email.</div>
    <div style="font-family:var(--font-body);font-size:15px;color:var(--text-muted);max-width:260px">We sent a password reset link to ${esc(state.ui.forgotEmail)}.</div>
    <button class="btn btn-secondary btn-lg btn-block" data-act="go-email">Back to Sign In</button>
  </div>`;
}

export const screens = {
  splash: { render: splash, mount: (root) => bindActions(root, { 'go-auth': () => go('auth') }) },
  auth: { render: auth, mount: (root) => bindActions(root, {
    'go-auth': () => go('auth'),
    'go-email': () => go('emailAuth'),
    'go-terms': () => go('terms'),
    'go-privacy': () => go('privacy'),
  }) },
  emailAuth: { render: emailAuth, mount: (root, state) => bindActions(root, {
    'go-auth': () => go('auth'),
    'mode-signup': () => setUi(ui => ({ emailAuth: { ...ui.emailAuth, mode: 'signup', errors: {} } })),
    'mode-signin': () => setUi(ui => ({ emailAuth: { ...ui.emailAuth, mode: 'signin', errors: {} } })),
    'go-forgot': () => go('forgotPassword'),
    submit: async () => {
      const ea = getState().ui.emailAuth;
      const errors = {};
      if (!isValidEmail(ea.email)) errors.email = 'Enter a valid email address.';
      if (ea.password.length < 8) errors.password = 'Password must be at least 8 characters.';
      if (ea.mode === 'signup' && ea.confirm !== ea.password) errors.confirm = 'Passwords do not match.';
      if (Object.keys(errors).length) { setUi(ui => ({ emailAuth: { ...ui.emailAuth, errors } })); return; }
      setUi({ busy: true });
      try {
        if (ea.mode === 'signup') { await signUp(ea.email, ea.password); go('onbProfile'); }
        else { await signIn(ea.email, ea.password); }
      } catch (e) {
        setUi(ui => ({ emailAuth: { ...ui.emailAuth, errors: { email: e.message } } }));
      } finally { setUi({ busy: false }); }
    },
  }) },
  forgotPassword: { render: forgotPassword, mount: (root) => bindActions(root, {
    'go-email': () => go('emailAuth'),
    submit: async () => {
      const email = getState().ui.forgotEmail;
      if (!isValidEmail(email)) { setUi({ forgotError: 'Enter a valid email address.' }); return; }
      try { await sendPasswordReset(email); go('forgotSent'); }
      catch (e) { setUi({ forgotError: e.message }); }
    },
  }) },
  forgotSent: { render: forgotSent, mount: (root) => bindActions(root, { 'go-email': () => go('emailAuth') }) },
};
