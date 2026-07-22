import { getState, setUi, go, me, loadReferralCode, redeemInviteCode, removeNetworkConnection, setNetworkBlocked } from '../store.js';
import { bindActions } from '../router.js';
import { esc, avatarSrc } from '../util.js';

function leaderboardRows(state) {
  const uid = me();
  const profile = state.profile || {};
  const rows = [
    { id: uid, name: profile.name || 'You', avatar_id: profile.avatar_id, reliability: profile.reliability ?? 100, points: profile.points ?? 0, isYou: true },
    ...state.network.filter(n => n.status === 'joined' && n.contact_user_id && !n.blocked).map(n => {
      const p = state.profilesById?.[n.contact_user_id] || {};
      return { id: n.id, connId: n.id, name: p.name || n.contact_name, avatar_id: p.avatar_id, reliability: p.reliability ?? 0, points: p.points ?? 0, isYou: false };
    }),
  ];
  const sort = state.ui.leaderboardSort;
  rows.sort((a, b) => sort === 'points' ? b.points - a.points : b.reliability - a.reliability);
  return rows;
}

function network(state) {
  const rows = leaderboardRows(state);
  const blocked = state.network.filter(n => n.blocked);
  const sort = state.ui.leaderboardSort;
  return `
  <div class="tab-header" style="gap:10px">
    <div>
      <div class="section-title">The Rankings</div>
      <div class="section-sub">Reliability, ranked. No participation trophies.</div>
    </div>
    <div class="row" style="gap:8px">
      <button class="chip ${sort === 'reliability' ? 'active' : ''}" style="flex:1;text-align:center" data-act="sort" data-arg="reliability">By Reliability</button>
      <button class="chip ${sort === 'points' ? 'active' : ''}" style="flex:1;text-align:center" data-act="sort" data-arg="points">By Points</button>
    </div>
    <button class="btn btn-primary btn-lg btn-block" data-act="go-invite">+ Invite a Partner</button>
  </div>
  <div class="tab-body">
    ${rows.length <= 1 ? `
      <div class="empty-state">
        <div style="width:56px;height:56px;border-radius:50%;border:var(--border-w) solid var(--ink);background:var(--cream-card);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--text-muted)">?</div>
        <div style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--ink)">No connections yet</div>
        <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted);max-width:240px">Once you make a contract with someone, they'll show up here.</div>
        <button class="btn btn-primary btn-md" data-act="go-invite">+ Add Contact</button>
      </div>` : rows.map((p, i) => `
      <div class="row" style="background:${p.isYou ? 'var(--gold)' : 'var(--cream-card)'};border:${p.isYou ? '3px' : 'var(--border-w)'} solid var(--ink);border-radius:var(--radius-lg);box-shadow:${p.isYou ? 'var(--shadow-hard)' : 'none'};padding:14px 16px;position:relative">
        <div style="width:26px;text-align:center;font-family:var(--font-display);font-weight:800;font-size:16px;color:${i < 3 ? 'var(--ink)' : 'var(--text-muted)'}">${i + 1}</div>
        <img class="avatar avatar-sm" src="${avatarSrc(p.avatar_id)}" alt="">
        <div style="flex:1">
          <div style="font-size:17px;font-weight:700;color:var(--ink);font-family:var(--font-display)">${esc(p.name)}</div>
          <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-body)">${p.points} pts</div>
        </div>
        <div style="font-size:17px;font-weight:800;color:var(--ink);font-family:var(--font-display)">${p.reliability}%</div>
        ${!p.isYou ? `
          <button class="link-btn" data-act="toggle-menu" data-arg="${p.connId}" aria-label="More options" style="padding:0;width:28px">⋯</button>
          ${state.ui.openContactMenuId === p.connId ? `
            <div class="menu-popover" style="top:44px;right:14px">
              <button data-act="block" data-arg="${p.connId}">Block</button>
              <button class="danger" data-act="ask-remove" data-arg="${p.connId}">Remove Contact</button>
            </div>` : ''}
        ` : ''}
      </div>`).join('')}

    ${state.ui.removeContactId ? `
      <div class="modal-overlay">
        <div class="modal-card">
          <div style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--ink)">Remove this contact?</div>
          <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">Any active contracts between you will be canceled and this contact will be removed from your Network. This can't be undone.</div>
          <div class="row" style="gap:10px">
            <button class="btn btn-secondary btn-md" style="flex:1" data-act="cancel-remove">Cancel</button>
            <button class="btn btn-danger btn-md" style="flex:1" data-act="confirm-remove">Remove</button>
          </div>
        </div>
      </div>` : ''}

    ${blocked.length ? `
      <div class="list-gap-sm" style="margin-top:8px">
        <div class="uppercase-label">Blocked</div>
        ${blocked.map(b => `
          <div class="row" style="background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-md);padding:10px 14px;opacity:.6">
            <span style="flex:1;font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink)">${esc(b.contact_name || state.profilesById?.[b.contact_user_id]?.name || 'Contact')}</span>
            <button class="link-btn" style="text-decoration:underline" data-act="unblock" data-arg="${b.id}">Unblock</button>
          </div>`).join('')}
      </div>` : ''}

    <div class="card-flat">
      <div class="uppercase-label" style="margin-bottom:8px">Have a referral code?</div>
      <div class="row" style="gap:10px">
        <input class="field-input" data-model="newContactEmail" data-live placeholder="e.g. AB12CD" value="${esc(state.ui.newContactEmail)}" style="text-transform:uppercase">
        <button class="btn btn-primary btn-sm" data-act="redeem-code">Link</button>
      </div>
      ${state.ui.redeemError ? `<span class="field-error">${esc(state.ui.redeemError)}</span>` : ''}
    </div>
  </div>`;
}

function invite(state) {
  const code = state.ui.referralCode || '…';
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-network">← Back</button>
    <div style="font-family:var(--font-display);font-weight:800;font-size:26px;color:var(--ink)">Invite a Partner</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">Pact works better with someone to keep you honest. Share your code — when they enter it, you're linked for real.</div>
    <div class="card" style="border-style:dashed;align-items:center;display:flex;flex-direction:column;gap:10px">
      <div class="uppercase-label">Your Referral Code</div>
      <div style="font-family:var(--font-mono);font-weight:800;font-size:28px;letter-spacing:.06em;color:var(--ink)">${esc(code)}</div>
      <button class="btn btn-primary btn-md btn-block" data-act="copy">${state.ui.inviteCopied ? 'Link Copied!' : 'Copy Invite Link'}</button>
    </div>
    <div class="uppercase-label" style="margin-top:4px">Your Network</div>
    ${state.network.filter(n => n.status === 'joined').length ? `
      <div class="list-gap-sm">
        ${state.network.filter(n => n.status === 'joined').map(n => `
          <div class="row-between" style="background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-md);padding:12px 14px">
            <span style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink)">${esc(state.profilesById?.[n.contact_user_id]?.name || n.contact_name)}</span>
            <span style="display:flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:700;font-size:12px;color:#1a7d33"><span class="status-dot" style="background:#1a7d33"></span>JOINED</span>
          </div>`).join('')}
      </div>` : `
      <div class="empty-state" style="padding:24px 12px;background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-lg)">
        <img src="assets/pk/icons/handshake.png" alt="" style="width:44px;height:44px">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">No connections yet</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--text-muted);max-width:220px">Share your referral code above and they'll show up here.</div>
      </div>`}
  </div>`;
}

export const screens = {
  network: { render: network, mount: (root) => bindActions(root, {
    sort: (e, key) => setUi({ leaderboardSort: key }),
    'go-invite': () => go('invite'),
    'toggle-menu': (e, id) => setUi(ui => ({ openContactMenuId: ui.openContactMenuId === id ? null : id })),
    block: (e, id) => { setNetworkBlocked(id, true); setUi({ openContactMenuId: null }); },
    unblock: (e, id) => setNetworkBlocked(id, false),
    'ask-remove': (e, id) => setUi({ removeContactId: id, openContactMenuId: null }),
    'cancel-remove': () => setUi({ removeContactId: null }),
    'confirm-remove': () => { const id = getState().ui.removeContactId; setUi({ removeContactId: null }); if (id) removeNetworkConnection(id); },
    'redeem-code': async () => {
      const code = getState().ui.newContactEmail.trim();
      if (!code) return;
      try { await redeemInviteCode(code); setUi({ newContactEmail: '', redeemError: null }); }
      catch (e) { setUi({ redeemError: e.message }); }
    },
  }) },
  invite: { render: invite, mount: async (root) => {
    bindActions(root, {
      'go-network': () => go('network'),
      copy: async () => {
        const code = getState().ui.referralCode;
        const url = `${location.origin}/#/redeem/${code}`;
        try { await navigator.clipboard.writeText(url); } catch (e) {}
        setUi({ inviteCopied: true });
      },
    });
    if (!getState().ui.referralCode) {
      const code = await loadReferralCode();
      setUi({ referralCode: code });
    }
  } },
};
