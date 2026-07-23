import { getState, setState, go, me, partnerProfile } from '../store.js';
import { bindActions } from '../router.js';
import { esc, avatarSrc, categoryLabel, STATUS_LABEL, STATUS_COLOR } from '../util.js';

function pendingReview(state) {
  const uid = me();
  return state.contracts.find(c => (c.status === 'proposed' && c.partner_id === uid) || (c.status === 'countered' && c.proposer_id === uid));
}

function contractCard(c, uid) {
  const partner = c.proposer_id === uid ? c.partner_id : c.proposer_id;
  const p = partnerProfileSafe(partner);
  const pct = c.progress_max ? Math.round((c.progress_value / c.progress_max) * 100) : 0;
  return `
  <div class="card" data-act="open-contract" data-arg="${c.id}" style="cursor:pointer;display:flex;flex-direction:column;gap:12px">
    <div class="row-between" style="align-items:flex-start">
      <div style="font-size:22px;font-weight:800;color:var(--ink);font-family:var(--font-display)">${esc(c.title)}</div>
      <span class="tag">${esc(categoryLabel(c.category))}</span>
    </div>
    <div class="row">
      <img class="avatar avatar-sm" src="${avatarSrc(p.avatar_id)}" alt="">
      <span style="font-size:17px;font-weight:700;color:var(--ink);font-family:var(--font-display)">${esc(p.name || 'Someone')}</span>
    </div>
    ${c.status === 'active' || c.status === 'pending_confirm' || c.status === 'pending_edit' ? `
      <div>
        <div class="progress-bar-label">${esc(c.progress_label || '')}</div>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
      </div>` : ''}
    <div class="row" style="gap:10px;margin-top:4px">
      <span style="display:inline-flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:800;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink)">
        <span class="status-dot" style="background:${STATUS_COLOR[c.status]}"></span>${STATUS_LABEL[c.status]}
      </span>
      ${c.status === 'breached' ? `<span style="font-family:var(--font-display);font-weight:800;font-size:13px;color:var(--purple)">Claim Favor →</span>` : ''}
    </div>
  </div>`;
}

function partnerProfileSafe(id) {
  try { return partnerProfile(id); } catch (e) { return { name: 'Someone', avatar_id: 'alex' }; }
}

function dashboard(state) {
  const uid = me();
  const profile = state.profile || {};
  const banner = pendingReview(state);
  const rest = state.contracts.filter(c => c.id !== banner?.id && c.status !== 'proposed' && !(c.status === 'countered' && c.proposer_id !== uid));
  const unread = state.notifications.filter(n => !n.read).length;
  const isEmpty = rest.length === 0 && !banner;

  return `
  <div class="tab-header">
    <div class="row-between">
      <div class="row">
        <img class="avatar avatar-sm" src="${avatarSrc(profile.avatar_id)}" alt="">
        <span style="font-size:19px;font-weight:800;color:var(--ink);font-family:var(--font-display)">${esc(profile.name || 'You')}</span>
      </div>
      <div class="row" style="gap:8px">
        <div class="score-badge"><img src="assets/pk/icons/shield-check.png" alt="">${profile.reliability ?? 100}%</div>
        <button data-act="open-notifs" aria-label="Notifications" style="width:36px;height:36px;border-radius:50%;border:var(--border-w) solid var(--ink);background:var(--cream-card);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;position:relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 4a5 5 0 00-5 5v3.2c0 .6-.2 1.2-.6 1.7L5 16h14l-1.4-2.1a2.8 2.8 0 01-.6-1.7V9a5 5 0 00-5-5z" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"></path><path d="M9.5 18a2.5 2.5 0 005 0" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"></path></svg>
          ${unread ? `<span style="position:absolute;top:-2px;right:-2px;min-width:16px;height:16px;padding:0 3px;border-radius:999px;background:var(--coral);border:2px solid var(--ink);font-family:var(--font-display);font-weight:800;font-size:9px;color:#fff;display:flex;align-items:center;justify-content:center">${unread}</span>` : ''}
        </button>
      </div>
    </div>
    ${!isEmpty ? `<button class="btn btn-primary btn-lg btn-block" data-act="new-contract">+ Create New Contract</button>` : ''}
    <div class="section-title">My Contracts</div>
  </div>
  <div class="tab-body">
    ${banner ? `
      <div class="card" style="background:var(--gold);cursor:pointer" data-act="review">
        <div style="font-family:var(--font-display);font-weight:800;font-size:13px;text-transform:uppercase">Incoming Proposal</div>
        <div style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--ink);margin-top:4px">${esc(partnerProfileSafe(banner.proposer_id === uid ? banner.partner_id : banner.proposer_id).name)} proposed: "${esc(banner.title)}"</div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:14px;text-decoration:underline;margin-top:4px">Review terms →</div>
      </div>` : ''}
    ${isEmpty ? `
      <div class="empty-state">
        <img src="assets/pk/icons/handshake.png" alt="" style="width:56px;height:56px">
        <div style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--ink)">No contracts yet</div>
        <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted);max-width:240px">Make a promise, put some points on it, and it'll show up here.</div>
        <button class="btn btn-primary btn-lg btn-block" style="margin-top:8px" data-act="new-contract">+ Create New Contract</button>
      </div>` : rest.map(c => contractCard(c, uid)).join('')}
  </div>`;
}

export const screens = {
  dashboard: { render: dashboard, mount: (root, state) => bindActions(root, {
    'open-notifs': () => go('notifCenter'),
    'new-contract': () => setState(st => ({ screen: 'nc', ui: { ...st.ui, nc: { step: 1, partnerId: null, title: '', categoryId: 'couple', deadline: '', penaltyId: st.vaultItems[0]?.id || null, detailWants: { photo: false, checkin: false, witness: false, location: false }, detailsCount: '', detailsNote: '', details: '', isEditing: false } } })),
    review: () => { const c = pendingReview(state); if (c) go('review', { activeContractId: c.id }); },
    'open-contract': (e, id) => go('detail', { activeContractId: id }),
  }) },
};
