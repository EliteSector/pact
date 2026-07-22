import { getState, setUi, setUiPath, go, me, saveProfile, signOut, changePassword, deleteAccountRemote, markAllNotifsRead, markNotifRead } from '../store.js';
import { bindActions } from '../router.js';
import { esc, avatarSrc, passwordScore, fmtRelativeTime } from '../util.js';
import { subscribeToPush, unsubscribeFromPush } from '../push.js';

const FAQ_ITEMS = [
  { id: 1, q: 'How does a Favor get decided if we disagree?', a: 'Either person can dispute a Kept or Breached ruling from the contract’s detail screen. Your partner has 48 hours to respond before the original ruling stands.' },
  { id: 2, q: 'Can I cancel a contract after it’s active?', a: 'Yes — open the contract and use the ⋯ menu to cancel. Both sides must agree it’s void; no points or favors change hands.' },
  { id: 3, q: 'What happens if I delete my account?', a: 'Your points, Reliability Score, active contracts, and any favors owed to you are permanently erased. This can’t be undone.' },
  { id: 4, q: 'Who can see my Reliability Score?', a: 'Only the partners and Network connections you’ve added can see your score and Rankings position.' },
];

function profile(state) {
  const p = state.profile || {};
  return `
  <div class="screen-pad-top nav-safe-bottom">
    <div class="row" style="gap:14px">
      <img class="avatar avatar-lg" src="${avatarSrc(p.avatar_id)}" alt="">
      <div style="flex:1">
        <div style="font-size:22px;font-weight:800;color:var(--ink);font-family:var(--font-display)">${esc(p.name || 'You')}</div>
        <div style="font-size:13px;color:var(--text-muted);font-family:var(--font-body)">${esc(state.session?.user?.email || '')}</div>
      </div>
    </div>
    <div class="row" style="gap:10px">
      <div style="flex:1;background:var(--gold);border:var(--border-w) solid var(--ink);border-radius:var(--radius-lg);box-shadow:var(--shadow-hard);padding:14px;text-align:center">
        <div style="font-family:var(--font-display);font-weight:800;font-size:11px;text-transform:uppercase;opacity:.7">Points</div>
        <div style="font-family:var(--font-display);font-weight:800;font-size:26px">${p.points ?? 0}</div>
      </div>
      <div style="flex:1;background:var(--blue);border:var(--border-w) solid var(--ink);border-radius:var(--radius-lg);box-shadow:var(--shadow-hard);padding:14px;text-align:center">
        <div style="font-family:var(--font-display);font-weight:800;font-size:11px;text-transform:uppercase;opacity:.7">Reliability</div>
        <div style="font-family:var(--font-display);font-weight:800;font-size:26px">${p.reliability ?? 100}%</div>
      </div>
    </div>
    <div class="card-flat">
      <div class="uppercase-label">Track Record</div>
      <div class="row-between" style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);margin-top:8px"><span>Kept</span><span>${p.kept_count ?? 0}</span></div>
      <div class="row-between" style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink);margin-top:6px"><span>Breached</span><span>${p.breached_count ?? 0}</span></div>
    </div>
    <label class="field"><span class="field-label">Display Name</span>
      <input class="field-input" data-model="name" value="${esc(state.ui.name || p.name || '')}" placeholder="e.g. Alex R."></label>

    <div class="uppercase-label" style="margin-top:4px">Notifications</div>
    <div class="list-gap-sm">
      ${[['push_enabled','Push Notifications'],['reminders_enabled','Deadline Reminders'],['public_score','Public Reliability Score']].map(([key,label]) => `
        <div class="row-between" style="background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-md);padding:12px 14px">
          <span style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink)">${label}</span>
          <button class="toggle-switch ${p[key] ? 'on' : ''}" data-act="toggle" data-arg="${key}"><span class="toggle-switch-knob"></span></button>
        </div>`).join('')}
    </div>

    <div class="uppercase-label" style="margin-top:4px">Account</div>
    <div class="list-gap-sm">
      <button class="row-between" data-act="go-changepw" style="background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-md);padding:12px 14px;cursor:pointer;text-align:left">
        <span style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink)">Password</span>
        <span style="display:flex;align-items:center;gap:6px;font-family:var(--font-body);font-size:13px;color:var(--text-muted)">••••••••
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
        </span>
      </button>
    </div>
    <button class="row-between" data-act="go-help" style="background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-md);padding:12px 14px;cursor:pointer;text-align:left">
      <span style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink)">Help &amp; Support</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="var(--ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>
    </button>
    <div style="display:grid;justify-items:center;margin-top:8px">
      <button class="btn btn-danger btn-lg" data-act="sign-out">Sign Out</button>
    </div>
    <button class="link-btn" style="text-decoration:underline;align-self:center" data-act="go-delete">Delete Account</button>
    <div class="row" style="justify-content:center;gap:12px;margin-top:8px;font-size:12px;color:var(--text-muted)">
      <a href="#" data-act="go-terms">Terms of Service</a><span>&middot;</span><a href="#" data-act="go-privacy">Privacy Policy</a>
    </div>
  </div>`;
}

function changePasswordScreen(state) {
  const cp = state.ui.changePw;
  const score = passwordScore(cp.new);
  const strengthLabel = ['Weak','Weak','Medium','Strong'][score] || '';
  const strengthColor = score <= 1 ? 'var(--red)' : score === 2 ? '#a67c00' : '#1a7d33';
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-profile">← Back</button>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Change Password</div>
    ${cp.saved ? `<div class="row" style="background:var(--green);border:var(--border-w) solid var(--ink);border-radius:var(--radius-md);padding:12px 14px"><span style="font-family:var(--font-display);font-weight:700;font-size:14px">Password updated.</span></div>` : ''}
    <label class="field"><span class="field-label">Current Password</span>
      <input class="field-input ${cp.errors.current ? 'err' : ''}" type="password" data-model="changePw.current" value="${esc(cp.current)}">
      ${cp.errors.current ? `<span class="field-error">${esc(cp.errors.current)}</span>` : ''}</label>
    <label class="field"><span class="field-label">New Password</span>
      <input class="field-input ${cp.errors.new ? 'err' : ''}" type="password" data-model="changePw.new" value="${esc(cp.new)}">
      ${cp.errors.new ? `<span class="field-error">${esc(cp.errors.new)}</span>` : ''}
      ${cp.new ? `<div style="display:flex;gap:4px">${[0,1,2].map(i => `<div style="flex:1;height:5px;border-radius:3px;border:1px solid var(--ink);background:${i < score ? strengthColor : 'var(--cream-card)'}"></div>`).join('')}</div><span style="font-family:var(--font-display);font-weight:700;font-size:12px;color:${strengthColor}">${strengthLabel}</span>` : ''}
      </label>
    <label class="field"><span class="field-label">Confirm New Password</span>
      <input class="field-input ${cp.errors.confirm ? 'err' : ''}" type="password" data-model="changePw.confirm" value="${esc(cp.confirm)}">
      ${cp.errors.confirm ? `<span class="field-error">${esc(cp.errors.confirm)}</span>` : ''}</label>
    <button class="btn btn-primary btn-lg btn-block" data-act="submit">Save New Password</button>
  </div>`;
}

function deleteAccountScreen(state) {
  const p = state.profile || {};
  const da = state.ui.deleteAccount;
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-profile">← Back</button>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Delete Account</div>
    <div class="card" style="background:var(--red)">
      <div style="font-family:var(--font-display);font-weight:800;font-size:14px;color:#fff">This can't be undone. Deleting your account will:</div>
      <div style="font-family:var(--font-body);font-size:13px;color:#fff;display:flex;flex-direction:column;gap:4px;margin-top:8px">
        <span>• Erase your ${p.points ?? 0} points and ${p.reliability ?? 100}% Reliability Score</span>
        <span>• Cancel any active contracts with your partners</span>
        <span>• Forfeit favors owed to you in your Favor Vault</span>
      </div>
    </div>
    <label class="field"><span class="field-label">Type DELETE to confirm</span>
      <input class="field-input ${da.errors.confirmText ? 'err' : ''}" data-model="deleteAccount.confirmText" value="${esc(da.confirmText)}" placeholder="DELETE" style="text-transform:uppercase">
      ${da.errors.confirmText ? `<span class="field-error">${esc(da.errors.confirmText)}</span>` : ''}</label>
    <button class="btn btn-secondary btn-lg btn-block" data-act="go-profile" style="margin-top:8px">Cancel</button>
    <button class="btn btn-danger btn-lg btn-block" data-act="submit">Delete My Account</button>
  </div>`;
}

function accountDeleted() {
  return `
  <div class="center-screen">
    <div class="icon-tile" style="background:var(--cream-card);opacity:.6"><img src="assets/pk/icons/shield-check.png" alt="" style="width:44px;height:44px"></div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Your account has been deleted.</div>
    <div style="font-family:var(--font-body);font-size:15px;color:var(--text-muted);max-width:260px">Your contracts, points, and Reliability Score are gone. We're sorry to see you go.</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="go-splash">Back to Start</button>
  </div>`;
}

function notifCenter(state) {
  const notifs = state.notifications;
  const today = notifs.filter(n => Date.now() - new Date(n.created_at).getTime() < 86400000);
  const earlier = notifs.filter(n => !today.includes(n));
  const iconFor = t => t.includes('breach') ? 'assets/pk/icons/shield-check.png' : t.includes('kept') ? 'assets/pk/icons/star.png' : 'assets/pk/icons/handshake.png';
  const row = n => `
    <button class="card" data-act="open" data-arg="${n.id}" style="display:flex;gap:12px;align-items:flex-start;text-align:left;width:100%;cursor:pointer">
      <img src="${iconFor(n.type)}" alt="" style="width:40px;height:40px;border-radius:10px">
      <div style="flex:1;min-width:0">
        <div class="row-between"><span style="font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--ink)">${esc(n.title)}</span><span style="font-family:var(--font-body);font-size:11px;color:var(--text-muted);white-space:nowrap">${fmtRelativeTime(n.created_at)}</span></div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--text-muted);margin-top:2px">${esc(n.body)}</div>
      </div>
      ${!n.read ? `<span style="width:9px;height:9px;border-radius:50%;background:var(--coral);margin-top:4px"></span>` : ''}
    </button>`;
  return `
  <div class="screen-pad-top" style="flex:1">
    <div class="row-between">
      <button class="back-btn" data-act="go-dashboard">← Back</button>
      ${notifs.some(n => !n.read) ? `<button class="link-btn" style="text-decoration:underline" data-act="mark-all">Mark all read</button>` : ''}
    </div>
    <div class="section-title">Notifications</div>
    ${today.length ? `<div class="list-gap-sm"><div class="uppercase-label">Today</div>${today.map(row).join('')}</div>` : ''}
    ${earlier.length ? `<div class="list-gap-sm"><div class="uppercase-label">Earlier</div>${earlier.map(row).join('')}</div>` : ''}
    ${!notifs.length ? `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style="opacity:.4"><path d="M12 4a5 5 0 00-5 5v3.2c0 .6-.2 1.2-.6 1.7L5 16h14l-1.4-2.1a2.8 2.8 0 01-.6-1.7V9a5 5 0 00-5-5z" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"></path><path d="M9.5 18a2.5 2.5 0 005 0" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"></path></svg>
      <div style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--ink)">You're all caught up</div>
      <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted);max-width:240px">Contract activity, reminders, and favors will show up here.</div>
    </div>` : ''}
  </div>`;
}

function terms() {
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-back">← Back</button>
    <div class="section-title">Terms of Service</div>
    <div style="font-size:12px;color:var(--text-muted)">Last updated July 21, 2026</div>
    <div style="font-size:14px;color:var(--ink);line-height:1.6;display:flex;flex-direction:column;gap:14px">
      <div><strong>1. Your Promise, Your Stakes.</strong> Pact lets you and another person ("your partner") create Contracts describing a commitment, a deadline, and a Favor owed if the Contract is breached. You agree that Favors are informal and unenforceable outside the app — Pact does not collect, hold, or transfer money or goods on your behalf.</div>
      <div><strong>2. Accounts.</strong> You must provide accurate information and are responsible for activity on your account. You must be 13 or older to use Pact.</div>
      <div><strong>3. Reliability Score.</strong> Your Reliability Score is calculated from your Contract history and may be visible to your partners and Network connections.</div>
      <div><strong>4. Disputes.</strong> If you and your partner disagree about whether a Contract was kept, either party may raise a dispute in-app. Pact does not arbitrate disputes and the resolution is left to you and your partner.</div>
      <div><strong>5. Termination.</strong> You may delete your account at any time from Profile Settings. We may suspend accounts that violate these Terms.</div>
      <div><strong>6. Changes.</strong> We may update these Terms from time to time; continued use of Pact means you accept the changes.</div>
    </div>
  </div>`;
}
function privacy() {
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-back">← Back</button>
    <div class="section-title">Privacy Policy</div>
    <div style="font-size:12px;color:var(--text-muted)">Last updated July 21, 2026</div>
    <div style="font-size:14px;color:var(--ink);line-height:1.6;display:flex;flex-direction:column;gap:14px">
      <div><strong>What we collect.</strong> Your name, email, avatar, Contracts, Favors, points, and Reliability Score, and the contacts you add to your Network.</div>
      <div><strong>How we use it.</strong> To run the core app experience — showing your Contracts, notifying you of deadlines and proposals, and calculating your Reliability Score and Rankings.</div>
      <div><strong>What we share.</strong> Your name, avatar, Reliability Score, and points are visible to partners and Network connections you add. We do not sell your data to third parties.</div>
      <div><strong>Your choices.</strong> You can edit your profile, manage notification preferences, remove or block Network contacts, and delete your account at any time from Profile Settings.</div>
      <div><strong>Contact.</strong> Questions about this policy can be sent to privacy@pact.app.</div>
    </div>
  </div>`;
}
function help(state) {
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-profile">← Back</button>
    <div class="section-title">Help &amp; Support</div>
    <div class="uppercase-label">FAQ</div>
    <div class="list-gap-sm">
      ${FAQ_ITEMS.map(f => `
        <div class="card-flat" style="padding:0;overflow:hidden">
          <button data-act="toggle-faq" data-arg="${f.id}" style="width:100%;display:flex;justify-content:space-between;gap:10px;padding:14px;background:none;border:none;cursor:pointer;text-align:left">
            <span style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink)">${esc(f.q)}</span>
            <span style="font-weight:800">${state.ui.faqOpenId === f.id ? '−' : '+'}</span>
          </button>
          ${state.ui.faqOpenId === f.id ? `<div style="padding:0 14px 14px;font-size:13px;color:var(--text-muted);line-height:1.5">${esc(f.a)}</div>` : ''}
        </div>`).join('')}
    </div>
    <div class="uppercase-label" style="margin-top:8px">Still Stuck?</div>
    <div style="font-size:12px;color:var(--text-muted);text-align:center">Email us at support@pact.app</div>
  </div>`;
}

export const screens = {
  profile: { render: profile, mount: (root) => bindActions(root, {
    __bind: (path, val) => {
      setUiPath(path, val);
      if (path === 'name') saveProfile({ name: val.trim() });
    },
    toggle: async (e, key) => {
      const st = getState();
      const next = !st.profile[key];
      await saveProfile({ [key]: next });
      if (key === 'push_enabled') { try { next ? await subscribeToPush() : await unsubscribeFromPush(); } catch (err) {} }
    },
    'go-changepw': () => { setUi({ changePw: { current: '', new: '', confirm: '', errors: {}, saved: false } }); go('changePassword'); },
    'go-help': () => go('help'),
    'sign-out': () => signOut(),
    'go-delete': () => { setUi({ deleteAccount: { password: '', confirmText: '', errors: {} } }); go('deleteAccount'); },
    'go-terms': (e) => go('terms'),
    'go-privacy': (e) => go('privacy'),
  }) },
  changePassword: { render: changePasswordScreen, mount: (root) => bindActions(root, {
    'go-profile': () => go('profile'),
    submit: async () => {
      const cp = getState().ui.changePw;
      const errors = {};
      if (!cp.current) errors.current = 'Enter your current password.';
      if (cp.new.length < 8) errors.new = 'Password must be at least 8 characters.';
      if (cp.confirm !== cp.new) errors.confirm = 'Passwords do not match.';
      if (Object.keys(errors).length) { setUi(ui => ({ changePw: { ...ui.changePw, errors, saved: false } })); return; }
      try {
        await changePassword(cp.current, cp.new);
        setUi({ changePw: { current: '', new: '', confirm: '', errors: {}, saved: true } });
      } catch (e) {
        setUi(ui => ({ changePw: { ...ui.changePw, errors: { current: e.message }, saved: false } }));
      }
    },
  }) },
  deleteAccount: { render: deleteAccountScreen, mount: (root) => bindActions(root, {
    'go-profile': () => go('profile'),
    submit: async () => {
      const da = getState().ui.deleteAccount;
      if (da.confirmText.trim().toUpperCase() !== 'DELETE') { setUi(ui => ({ deleteAccount: { ...ui.deleteAccount, errors: { confirmText: 'Type DELETE to confirm.' } } })); return; }
      try { await deleteAccountRemote(); go('accountDeleted'); }
      catch (e) { setUi(ui => ({ deleteAccount: { ...ui.deleteAccount, errors: { confirmText: e.message } } })); }
    },
  }) },
  accountDeleted: { render: accountDeleted, mount: (root) => bindActions(root, { 'go-splash': () => go('splash') }) },
  notifCenter: { render: notifCenter, mount: (root) => bindActions(root, {
    'go-dashboard': () => go('dashboard'),
    'mark-all': () => markAllNotifsRead(),
    open: async (e, id) => {
      const n = getState().notifications.find(x => x.id === id);
      await markNotifRead(id);
      if (n?.contract_id) go('detail', { activeContractId: n.contract_id });
    },
  }) },
  terms: { render: terms, mount: (root, state) => bindActions(root, { 'go-back': () => go(state.prevScreen === 'terms' ? 'profile' : state.prevScreen || 'profile') }) },
  privacy: { render: privacy, mount: (root, state) => bindActions(root, { 'go-back': () => go(state.prevScreen === 'privacy' ? 'profile' : state.prevScreen || 'profile') }) },
  help: { render: help, mount: (root) => bindActions(root, {
    'go-profile': () => go('profile'),
    'toggle-faq': (e, id) => setUi(ui => ({ faqOpenId: ui.faqOpenId === Number(id) ? null : Number(id) })),
  }) },
};
