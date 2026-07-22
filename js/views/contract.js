import {
  getState, setState, setUi, go, me, partnerProfile,
  createContract, updateContractEdit, acceptContract, sendCounter, submitProof, confirmKept, markBreached,
  submitDispute, upholdBreach, overturnToKept, cancelContract, approveEdit, rejectEdit, loadHistory, addVaultItem,
} from '../store.js';
import { bindActions } from '../router.js';
import { esc, categoryLabel, CATEGORY_DEFS, DIFF_STAKES, STATUS_LABEL, STATUS_COLOR, fmtTimeUntil, fmtRelativeTime, avatarSrc } from '../util.js';

function activeContract(state) { return state.contracts.find(c => c.id === state.activeContractId); }

// ---------- nc wizard ----------

function ncStep1(state) {
  const nc = state.ui.nc;
  const partners = state.network.filter(n => n.status === 'joined' && n.contact_user_id);
  return `
  <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Who's this between?</div>
  ${!partners.length ? `
    <div class="empty-state" style="padding:24px 12px;background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-lg)">
      <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">No connections yet</div>
      <div style="font-family:var(--font-body);font-size:13px;color:var(--text-muted)">Invite a partner first — contracts need a real linked account on the other end.</div>
      <button class="btn btn-primary btn-md" data-act="go-invite">Invite a Partner</button>
    </div>` : partners.map(p => {
      const prof = state.profilesById?.[p.contact_user_id] || {};
      return `<div class="row" data-act="pick-partner" data-arg="${p.contact_user_id}" style="cursor:pointer;background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-lg);padding:14px 16px;box-shadow:${nc.partnerId === p.contact_user_id ? 'var(--shadow-hard)' : 'none'}">
        <img class="avatar avatar-sm" src="${avatarSrc(prof.avatar_id)}" alt="" style="width:32px;height:32px">
        <div style="font-family:var(--font-display);font-weight:700;font-size:15px;color:var(--ink)">${esc(prof.name || p.contact_name)}</div>
      </div>`;
    }).join('')}
  `;
}

function ncStep2(state) {
  const nc = state.ui.nc;
  const toggles = [
    { key: 'photo', label: 'Photo proof required' }, { key: 'checkin', label: 'Self-report check-in' },
    { key: 'witness', label: 'Partner confirmation required' }, { key: 'location', label: 'Location/check-in required' },
  ];
  return `
  <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Put it in writing.</div>
  <label class="field"><span class="field-label">Title</span>
    <input class="field-input" data-model="nc.title" value="${esc(nc.title)}" placeholder="e.g. Gym 4x This Week"></label>
  <label class="field"><span class="field-label">Details</span>
    <input class="field-input" data-model="nc.details" value="${esc(nc.details)}" placeholder="What exactly are you promising?"></label>
  <div class="row" style="flex-wrap:wrap;gap:8px">
    ${CATEGORY_DEFS.map(c => `<button class="chip ${nc.categoryId === c.id ? 'active' : ''}" data-act="pick-category" data-arg="${c.id}">${esc(c.label)}</button>`).join('')}
  </div>
  <div class="list-gap-sm">
    <span class="field-label">How will this be verified?</span>
    ${toggles.map(t => `<button class="checkrow ${nc.detailWants[t.key] ? 'active' : ''}" data-act="toggle-detail" data-arg="${t.key}">
      <span class="checkrow-box ${nc.detailWants[t.key] ? 'active' : ''}">${nc.detailWants[t.key] ? '✓' : ''}</span>
      <span class="checkrow-label">${t.label}</span></button>`).join('')}
  </div>
  <label class="field"><span class="field-label">How many times / how often?</span>
    <input class="field-input" data-model="nc.detailsCount" value="${esc(nc.detailsCount)}" placeholder="e.g. 4 times this week"></label>
  <label class="field"><span class="field-label">Anything else? (optional)</span>
    <input class="field-input" data-model="nc.detailsNote" value="${esc(nc.detailsNote)}" placeholder="e.g. Minimum 45 minutes per session"></label>
  <label class="field"><span class="field-label">Deadline</span>
    <input class="field-input" type="datetime-local" data-model="nc.deadline" value="${esc(nc.deadline)}"></label>
  `;
}

function ncStep3(state) {
  const nc = state.ui.nc;
  const items = state.vaultItems;
  const penalty = items.find(v => v.id === nc.penaltyId) || items[0];
  const stakeWin = DIFF_STAKES[penalty?.weight] || 150;
  return `
  <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Name your price.</div>
  <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">Penalty favor if this goes badly.</div>
  ${items.map(fav => `
    <div class="radiorow ${nc.penaltyId === fav.id ? 'active' : ''}" data-act="pick-penalty" data-arg="${fav.id}">
      <span class="radio-dot ${nc.penaltyId === fav.id ? 'active' : ''}"><span class="radio-dot-inner ${nc.penaltyId === fav.id ? 'active' : ''}"></span></span>
      <div style="font-family:var(--font-display);font-weight:700;font-size:14px;color:var(--ink)">${esc(fav.label)}</div>
    </div>`).join('')}
  ${state.ui.isAddingFavor ? `
    <div class="card-flat">
      <input class="field-input" data-model="newFavorText" data-live value="${esc(state.ui.newFavorText)}" placeholder="e.g. Wash the car">
      <div class="row" style="gap:10px;margin-top:10px">
        <button class="btn btn-secondary btn-sm" style="flex:1" data-act="cancel-add-favor">Cancel</button>
        <button class="btn btn-primary btn-sm" style="flex:1" data-act="confirm-add-favor">Add Favor</button>
      </div>
    </div>` : `<button class="btn btn-secondary btn-sm btn-block" data-act="start-add-favor">+ Create Your Own Favor</button>`}
  <div class="stakes-ticket">
    <div class="stakes-ticket-heading">Potential Favor (If Breached)</div>
    <div class="stakes-ticket-body">
      <div class="stakes-ticket-favor"><b>Winner's Choice:</b> ${esc(penalty?.label || '')}</div>
      <div class="stakes-ticket-rule"></div>
      <div class="stakes-ticket-points">★ Points at Stake: +${stakeWin}</div>
    </div>
  </div>`;
}

function nc(state) {
  const step = state.ui.nc.step;
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="nc-back">← Back</button>
    <div class="uppercase-label">Step ${step} of 3</div>
    ${step === 1 ? ncStep1(state) : step === 2 ? ncStep2(state) : ncStep3(state)}
    <div style="margin-top:4px">
      ${step === 3 ? `<button class="btn btn-primary btn-lg btn-block" data-act="send">${state.ui.nc.isEditing ? 'Send Change Request' : 'Send Contract'}</button>`
                    : `<button class="btn btn-primary btn-lg btn-block" data-act="nc-next">Next</button>`}
    </div>
  </div>`;
}

function sent(state) {
  const nc = state.ui.nc;
  const c = activeContract(state);
  const heading = nc.isEditing ? 'Change request sent.' : 'Sent. No takebacks.';
  const body = nc.isEditing
    ? `They need to approve your changes to "${esc(nc.title || c?.title || '')}" before they take effect.`
    : `Waiting on a response.`;
  return `
  <div class="center-screen">
    <div style="font-family:var(--font-display);font-weight:800;font-size:30px;color:var(--ink)">${heading}</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">${body}</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="go-dashboard">Back to Dashboard</button>
  </div>`;
}

// ---------- review / counter / webview ----------

function reviewBody(c, state) {
  const uid = me();
  const otherId = c.proposer_id === uid ? c.partner_id : c.proposer_id;
  const other = partnerProfile(otherId);
  return `
  <div>
    <div class="uppercase-label" style="margin-bottom:6px">Contract Details</div>
    <div style="font-size:21px;font-weight:800;color:var(--ink);margin-bottom:8px;font-family:var(--font-display)">${esc(c.title)}</div>
    <span class="tag">${esc(categoryLabel(c.category))}</span>
    <div style="font-size:15px;font-weight:600;color:var(--ink);margin-top:12px;font-family:var(--font-body)">${esc(c.description)}</div>
    ${c.deadline ? `<div style="font-size:13px;font-weight:800;color:var(--text-muted);margin-top:12px;font-family:var(--font-display)">DEADLINE</div>
    <div style="font-size:15px;font-weight:700;color:var(--ink);font-family:var(--font-display)">${new Date(c.deadline).toLocaleString()}</div>` : ''}
  </div>
  <div class="stakes-ticket">
    <div class="stakes-ticket-heading">Potential Favor (If Breached)</div>
    <div class="stakes-ticket-body">
      <div class="stakes-ticket-favor"><b>Winner's Choice:</b> ${esc(c.penalty_favor_text)}</div>
      <div class="stakes-ticket-rule"></div>
      <div class="stakes-ticket-points">★ Points at Stake: +${c.points}</div>
    </div>
  </div>`;
}

function review(state) {
  const c = activeContract(state);
  if (!c) return `<div class="center-screen">Loading…</div>`;
  const other = partnerProfile(c.proposer_id === me() ? c.partner_id : c.proposer_id);
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-dashboard">← Back</button>
    <div>
      <div style="font-size:26px;font-weight:800;line-height:1.15;color:var(--ink);font-family:var(--font-display)">${esc(other.name)} Has Proposed a Contract!</div>
      <div style="font-size:14px;color:var(--text-muted);margin-top:8px;font-family:var(--font-body)">Review the terms below to accept or suggest changes.</div>
    </div>
    ${reviewBody(c, state)}
    <div class="list-gap-sm">
      <button class="btn btn-success btn-lg btn-block" data-act="accept">Accept &amp; Go Live</button>
      <button class="btn btn-secondary btn-lg btn-block" data-act="counter">Propose Changes</button>
    </div>
    <div style="text-align:center;font-family:var(--font-body);font-size:13px;text-decoration:underline;cursor:pointer;color:var(--text-muted)" data-act="webview">Preview as a non-app guest →</div>
  </div>`;
}

function webview(state) {
  const c = activeContract(state);
  if (!c) return `<div class="center-screen">Loading…</div>`;
  const other = partnerProfile(c.proposer_id === me() ? c.partner_id : c.proposer_id);
  return `
  <div style="display:flex;flex-direction:column;height:100%">
    <div style="background:#e8e4da;border-bottom:2px solid var(--ink);padding:calc(10px + var(--sat)) 16px 10px;font-family:var(--font-body);font-size:11px;color:#555;display:flex;align-items:center;gap:6px">
      <span style="width:8px;height:8px;border-radius:50%;background:#fd4603"></span><span style="width:8px;height:8px;border-radius:50%;background:var(--gold)"></span><span style="width:8px;height:8px;border-radius:50%;background:var(--green)"></span>
      <span style="margin-left:8px">secure.pact.app/contract/${c.id.slice(0,8)}</span>
    </div>
    <div class="screen-pad">
      <div style="font-size:24px;font-weight:800;line-height:1.15;color:var(--ink);font-family:var(--font-display)">${esc(other.name)} Has Proposed a Contract!</div>
      <div style="font-size:14px;color:var(--text-muted);font-family:var(--font-body)">New to Pact? Accept this contract to start building your Reliability Score!</div>
      ${reviewBody(c, state)}
      <button class="btn btn-success btn-lg btn-block" data-act="accept">Accept &amp; Go Live</button>
      <button class="btn btn-secondary btn-lg btn-block" data-act="counter">Propose Changes</button>
      <div style="text-align:center;font-family:var(--font-body);font-size:13px;text-decoration:underline;cursor:pointer;color:var(--text-muted)" data-act="review">← Back to in-app view</div>
    </div>
  </div>`;
}

function counter(state) {
  const cw = state.ui.counterWants;
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-review">← Back</button>
    <div style="font-family:var(--font-display);font-weight:800;font-size:26px;color:var(--ink)">Counter it.</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">What do you want to change? Pick anything that applies.</div>
    <div class="list-gap-sm">
      <div>
        <button class="checkrow ${cw.deadline ? 'active' : ''}" data-act="toggle-w" data-arg="deadline">
          <span class="checkrow-box ${cw.deadline ? 'active' : ''}">${cw.deadline ? '✓' : ''}</span><span class="checkrow-label">Change the deadline</span></button>
        ${cw.deadline ? `<div class="card-flat" style="margin-top:8px">
          <div style="font-family:var(--font-display);font-weight:800;font-size:14px">New deadline</div>
          <div class="row" style="flex-wrap:wrap;gap:8px">
            ${['+1 Day','+2 Days','+1 Week','No deadline','Custom'].map(l => `<button class="chip chip-sm ${state.ui.counterDeadline === l ? 'active' : ''}" data-act="pick-deadline" data-arg="${l}">${l}</button>`).join('')}
          </div>
          ${state.ui.counterDeadline === 'Custom' ? `<input class="field-input" data-model="counterDeadlineCustom" value="${esc(state.ui.counterDeadlineCustom)}" placeholder="e.g. Next Wednesday 6pm">` : ''}
        </div>` : ''}
      </div>
      <div>
        <button class="checkrow ${cw.details ? 'active' : ''}" data-act="toggle-w" data-arg="details">
          <span class="checkrow-box ${cw.details ? 'active' : ''}">${cw.details ? '✓' : ''}</span><span class="checkrow-label">Change the requirements</span></button>
        ${cw.details ? `<div class="card-flat" style="margin-top:8px">
          <div style="font-family:var(--font-display);font-weight:800;font-size:14px">Revised requirements</div>
          <input class="field-input" data-model="counterDetails" value="${esc(state.ui.counterDetails)}" placeholder="e.g. Photo proof only required twice">
        </div>` : ''}
      </div>
      <div>
        <button class="checkrow ${cw.stakes ? 'active' : ''}" data-act="toggle-w" data-arg="stakes">
          <span class="checkrow-box ${cw.stakes ? 'active' : ''}">${cw.stakes ? '✓' : ''}</span><span class="checkrow-label">Change the stakes</span></button>
        ${cw.stakes ? `<div class="card-flat" style="margin-top:8px">
          <div style="font-family:var(--font-display);font-weight:800;font-size:14px">New stakes level</div>
          <div class="row">${['Lower','Keep Same','Higher'].map(l => `<button class="chip chip-sm ${state.ui.counterStakes === l ? 'active' : ''}" style="flex:1" data-act="pick-stakes" data-arg="${l}">${l}</button>`).join('')}</div>
        </div>` : ''}
      </div>
      <div>
        <button class="checkrow ${cw.category ? 'active' : ''}" data-act="toggle-w" data-arg="category">
          <span class="checkrow-box ${cw.category ? 'active' : ''}">${cw.category ? '✓' : ''}</span><span class="checkrow-label">Change the category</span></button>
        ${cw.category ? `<div class="card-flat" style="margin-top:8px">
          <div style="font-family:var(--font-display);font-weight:800;font-size:14px">New category</div>
          <div class="row" style="flex-wrap:wrap;gap:8px">${CATEGORY_DEFS.map(c => `<button class="chip chip-sm ${state.ui.counterCategoryId === c.id ? 'active' : ''}" data-act="pick-counter-category" data-arg="${c.id}">${esc(c.label)}</button>`).join('')}</div>
        </div>` : ''}
      </div>
    </div>
    <label class="field"><span class="field-label">Anything else? (optional)</span>
      <input class="field-input" data-model="counterNote" value="${esc(state.ui.counterNote)}" placeholder="One more thing..."></label>
    <button class="btn btn-primary btn-lg btn-block" data-act="send-counter">Send Counter</button>
  </div>`;
}

function counterSent(state) {
  const c = activeContract(state);
  const other = c ? partnerProfile(c.proposer_id === me() ? c.partner_id : c.proposer_id) : { name: 'They' };
  return `
  <div class="center-screen">
    <div style="font-family:var(--font-display);font-weight:800;font-size:28px;color:var(--ink)">Counter sent.</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">Status: Pending Counter. ${esc(other.name)} will decide.</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="go-dashboard">Back to Dashboard</button>
  </div>`;
}

// ---------- detail ----------

function detail(state) {
  const c = activeContract(state);
  if (!c) return `<div class="center-screen">Loading…</div>`;
  const uid = me();
  const otherId = c.proposer_id === uid ? c.partner_id : c.proposer_id;
  const other = partnerProfile(otherId);
  const isProposer = c.proposer_id === uid;
  const pct = c.progress_max ? Math.round((c.progress_value / c.progress_max) * 100) : 0;

  let body = '';
  if (c.status === 'active') {
    body = `
      <div><div class="progress-bar-label">${esc(c.progress_label || '')}</div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div></div>
      ${c.deadline ? `<div style="font-family:var(--font-body);font-size:13px;color:var(--text-muted);background:var(--cream-card);border:2px solid var(--ink);border-radius:var(--radius-md);padding:10px 14px">Time left: ${fmtTimeUntil(c.deadline)}</div>` : ''}
      <button class="btn btn-primary btn-lg btn-block" data-act="submit-proof">Submit Proof</button>`;
  } else if (c.status === 'pending_edit') {
    body = `
      <div><div class="progress-bar-label">${esc(c.progress_label || '')}</div><div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%"></div></div></div>
      <div class="card" style="background:var(--gold)">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">Change requested: "${esc(c.pending_edit_title)}"</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--ink);margin-top:4px">${c.pending_edit_requested_by === uid ? `Waiting on ${esc(other.name)} to approve before this takes effect.` : `Review this and approve or reject it.`}</div>
      </div>
      ${c.pending_edit_requested_by !== uid ? `<button class="btn btn-primary btn-lg btn-block" data-act="review-change">Review Change</button>` : ''}`;
  } else if (c.status === 'pending_confirm') {
    body = isProposer ? `
      <div class="card" style="background:var(--gold)">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">Proof submitted.</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--ink);margin-top:4px">Waiting on ${esc(other.name)} to confirm.</div>
      </div>` : `
      <div class="card" style="background:var(--gold)">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">Proof submitted.</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--ink);margin-top:4px">You be the judge.</div>
      </div>
      <div class="row" style="gap:10px">
        <button class="btn btn-danger btn-lg" style="flex:1" data-act="mark-breached">Mark Breached</button>
        <button class="btn btn-success btn-lg" style="flex:1" data-act="confirm-kept">Confirm Kept</button>
      </div>`;
  } else if (c.status === 'kept') {
    body = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 0">
      <div class="status-stamp status-stamp-kept">KEPT</div>
      <div style="font-family:var(--font-body);font-size:14px;text-align:center;color:var(--ink)">Both sides earned +${c.points} pts.</div>
    </div>`;
  } else if (c.status === 'breached') {
    body = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 0">
      <div class="status-stamp status-stamp-breached">BREACHED</div>
      <div style="font-family:var(--font-body);font-size:14px;text-align:center;color:var(--ink)">${esc(isProposer ? 'You' : other.name)} lose${isProposer ? '' : 's'} points. A promise is a promise.</div>
    </div>
    ${!isProposer ? `<button class="btn btn-favor btn-lg btn-block" data-act="claim">Claim Favor</button>` : ''}
    ${isProposer ? `<button class="link-btn" style="align-self:center;text-decoration:underline" data-act="dispute">Think this is wrong? Dispute this call</button>` : ''}`;
  } else if (c.status === 'disputed') {
    const canJudge = c.disputed_by && c.disputed_by !== uid;
    body = `
      <div class="card" style="background:var(--blue)">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">Dispute under review.</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--ink)">${c.dispute_note ? esc(c.dispute_note) : ''}</div>
      </div>
      ${canJudge ? `<div class="row" style="gap:10px">
        <button class="btn btn-danger btn-lg" style="flex:1" data-act="uphold">Uphold Breach</button>
        <button class="btn btn-success btn-lg" style="flex:1" data-act="overturn">Overturn to Kept</button>
      </div>` : `<div style="font-family:var(--font-body);font-size:13px;color:var(--text-muted);text-align:center">Waiting on ${esc(other.name)} to respond.</div>`}`;
  } else if (c.status === 'canceled') {
    body = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 0">
      <div class="status-stamp status-stamp-canceled">CANCELED</div>
      <div style="font-family:var(--font-body);font-size:14px;text-align:center;color:var(--text-muted)">Both sides agreed to void this contract. No points changed hands.</div>
    </div>`;
  }

  return `
  <div class="screen-pad-top" style="padding-bottom:calc(96px + var(--sab))">
    <button class="back-btn" data-act="go-dashboard">← Back</button>
    <div class="row-between" style="align-items:flex-start">
      <div style="font-size:24px;font-weight:800;color:var(--ink);font-family:var(--font-display)">${esc(c.title)}</div>
      <div class="row" style="gap:8px;flex:0 0 auto">
        <span class="tag">${esc(categoryLabel(c.category))}</span>
        ${c.status === 'active' ? `
          <div style="position:relative">
            <button class="link-btn" data-act="toggle-menu" style="padding:0">⋯</button>
            ${state.ui.detailMenuOpen ? `<div class="menu-popover" style="top:32px;right:0"><button data-act="edit-terms">Edit Terms</button><button class="danger" data-act="cancel">Cancel Contract</button></div>` : ''}
          </div>` : ''}
      </div>
    </div>
    <div class="row"><img class="avatar avatar-sm" src="${avatarSrc(other.avatar_id)}" alt=""><span style="font-size:16px;font-weight:700;color:var(--ink);font-family:var(--font-display)">vs ${esc(other.name)}</span></div>
    <div class="row" style="gap:6px"><span class="status-dot" style="background:${STATUS_COLOR[c.status]}"></span><span style="font-family:var(--font-display);font-weight:800;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--ink)">${STATUS_LABEL[c.status]}</span></div>
    <div style="font-family:var(--font-body);font-size:13px;text-decoration:underline;color:var(--text-muted);cursor:pointer" data-act="history">View negotiation history →</div>
    ${body}
  </div>`;
}

function cancelConfirm(state) {
  const c = activeContract(state);
  if (!c) return '';
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-detail">← Back</button>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Cancel This Contract?</div>
    <div class="card" style="background:var(--red)">
      <div style="font-family:var(--font-display);font-weight:800;font-size:14px;color:#fff">This can't be undone.</div>
      <div style="font-family:var(--font-body);font-size:13px;color:#fff">"${esc(c.title)}" will be voided. No points will be won or lost, and no favor will be owed either way.</div>
    </div>
    <button class="btn btn-secondary btn-lg btn-block" data-act="keep">Keep Contract</button>
    <button class="btn btn-danger btn-lg btn-block" data-act="confirm-cancel">Cancel Contract</button>
  </div>`;
}

function dispute(state) {
  const c = activeContract(state);
  if (!c) return '';
  const other = partnerProfile(c.proposer_id === me() ? c.partner_id : c.proposer_id);
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-detail">← Back</button>
    <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">Dispute This Contract</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">Tell ${esc(other.name)} why you think "${esc(c.title)}" was actually kept. They'll have 48 hours to respond before the ruling stands.</div>
    <label class="field"><span class="field-label">Your explanation</span>
      <textarea class="field-textarea ${state.ui.disputeError ? 'err' : ''}" rows="5" data-model="disputeNote" placeholder="e.g. I sent proof before the deadline, it just didn't upload in time.">${esc(state.ui.disputeNote)}</textarea>
      ${state.ui.disputeError ? `<span class="field-error">${esc(state.ui.disputeError)}</span>` : ''}
    </label>
    <button class="btn btn-primary btn-lg btn-block" data-act="submit">Submit Dispute</button>
  </div>`;
}

function reviewChange(state) {
  const c = activeContract(state);
  if (!c) return '';
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-dashboard">← Back</button>
    <div>
      <div style="font-size:24px;font-weight:800;line-height:1.15;color:var(--ink);font-family:var(--font-display)">A change was requested</div>
      <div style="font-size:14px;color:var(--text-muted);margin-top:8px;font-family:var(--font-body)">Review the proposed change before it takes effect.</div>
    </div>
    <div class="card">
      <div><div style="font-family:var(--font-display);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Current</div>
        <div style="font-family:var(--font-display);font-weight:800;font-size:17px;color:var(--ink);text-decoration:line-through;opacity:.55">${esc(c.title)}</div></div>
      <div style="margin-top:10px"><div style="font-family:var(--font-display);font-weight:700;font-size:11px;text-transform:uppercase;color:var(--text-muted)">Proposed</div>
        <div style="font-family:var(--font-display);font-weight:800;font-size:19px;color:var(--ink)">${esc(c.pending_edit_title)}</div></div>
    </div>
    <button class="btn btn-success btn-lg btn-block" data-act="approve">Approve Change</button>
    <button class="btn btn-secondary btn-lg btn-block" data-act="reject">Reject Change</button>
  </div>`;
}

function history(state) {
  const c = activeContract(state);
  const events = state.contractHistory;
  return `
  <div class="screen-pad-top">
    <button class="back-btn" data-act="go-detail">← Back</button>
    <div><div class="section-title">Negotiation History</div><div class="section-sub">${esc(c?.title || '')}</div></div>
    <div>
      ${events.map((ev, i) => {
        const actor = partnerProfile(ev.actor_id);
        return `
        <div class="row" style="align-items:stretch;gap:14px">
          <div style="display:flex;flex-direction:column;align-items:center;flex:0 0 auto">
            <span style="width:14px;height:14px;border-radius:50%;background:var(--gold);border:2px solid var(--ink)"></span>
            ${i < events.length - 1 ? `<span style="width:2px;flex:1;background:var(--ink);opacity:.15;min-height:24px"></span>` : ''}
          </div>
          <div style="padding-bottom:22px;flex:1">
            <div class="row-between" style="align-items:baseline">
              <span style="font-family:var(--font-display);font-weight:800;font-size:14px;color:var(--ink)">${esc(actor.name)} ${esc(ev.action)}</span>
              <span style="font-family:var(--font-body);font-size:12px;color:var(--text-muted);white-space:nowrap">${fmtRelativeTime(ev.created_at)}</span>
            </div>
            ${ev.payload && Object.keys(ev.payload).length ? `<div style="margin-top:8px;background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-md);padding:12px 14px">
              ${Object.entries(ev.payload).map(([k,v]) => `<div style="font-family:var(--font-body);font-size:13px;color:var(--ink)">${esc(k)}: ${esc(typeof v === 'boolean' ? (v ? 'yes' : 'no') : v)}</div>`).join('')}
            </div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function claimed(state) {
  const c = activeContract(state);
  return `
  <div class="center-screen">
    <div style="font-family:var(--font-display);font-weight:800;font-size:28px;color:var(--ink)">Favor claimed.</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">"Favor Owed: ${esc(c?.penalty_favor_text || '')}" is now in your Favor Vault.</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="go-dashboard">Back to Dashboard</button>
  </div>`;
}

// ---------- actions ----------

function ncActions() {
  return {
    'nc-back': () => { const step = getState().ui.nc.step; if (step > 1) setUi(ui => ({ nc: { ...ui.nc, step: step - 1 } })); else go('dashboard'); },
    'go-invite': () => go('invite'),
    'pick-partner': (e, id) => setUi(ui => ({ nc: { ...ui.nc, partnerId: id } })),
    'pick-category': (e, id) => setUi(ui => ({ nc: { ...ui.nc, categoryId: id } })),
    'toggle-detail': (e, key) => setUi(ui => ({ nc: { ...ui.nc, detailWants: { ...ui.nc.detailWants, [key]: !ui.nc.detailWants[key] } } })),
    'pick-penalty': (e, id) => setUi(ui => ({ nc: { ...ui.nc, penaltyId: id } })),
    'start-add-favor': () => setUi({ isAddingFavor: true, newFavorText: '' }),
    'cancel-add-favor': () => setUi({ isAddingFavor: false, newFavorText: '' }),
    'confirm-add-favor': async () => {
      const text = getState().ui.newFavorText.trim();
      setUi({ isAddingFavor: false, newFavorText: '' });
      if (!text) return;
      await addVaultItem(text);
    },
    'nc-next': () => {
      const st = getState();
      if (st.ui.nc.step === 1 && !st.ui.nc.partnerId) return;
      if (st.ui.nc.step === 2 && !st.ui.nc.title.trim()) return;
      setUi(ui => ({ nc: { ...ui.nc, step: ui.nc.step + 1 } }));
    },
    send: async () => {
      const st = getState();
      const ncState = st.ui.nc;
      setUi({ busy: true });
      try {
        if (ncState.isEditing) {
          await updateContractEdit(st.activeContractId, ncState.title);
        } else {
          const items = st.vaultItems;
          const penalty = items.find(v => v.id === ncState.penaltyId) || items[0];
          const stakeWin = { low: 60, med: 150, high: 260 }[penalty?.weight] || 150;
          const parsedCount = parseInt(ncState.detailsCount, 10);
          const description = [ncState.details, ncState.detailsCount, ncState.detailsNote].filter(Boolean).join(' — ');
          const deadlineIso = ncState.deadline ? new Date(ncState.deadline).toISOString() : null;
          const c = await createContract({
            partnerId: ncState.partnerId, title: ncState.title, categoryId: ncState.categoryId,
            description, deadline: deadlineIso, penaltyText: penalty?.label || '', points: stakeWin,
            progressMax: Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1,
            progressLabel: Number.isFinite(parsedCount) && parsedCount > 0 ? `0/${parsedCount} complete` : '',
          });
          setState({ activeContractId: c.id });
        }
        go('sent');
      } finally { setUi({ busy: false }); }
    },
  };
}

export const screens = {
  nc: { render: nc, mount: (root) => bindActions(root, ncActions()) },
  sent: { render: sent, mount: (root) => bindActions(root, { 'go-dashboard': () => go('dashboard') }) },
  review: { render: review, mount: (root, state) => bindActions(root, {
    'go-dashboard': () => go('dashboard'),
    accept: async () => { await acceptContract(state.activeContractId); go('dashboard'); },
    counter: () => go('counter'),
    webview: () => go('webview'),
  }) },
  webview: { render: webview, mount: (root) => bindActions(root, {
    accept: async (e, s2) => { const st = getState(); await acceptContract(st.activeContractId); go('dashboard'); },
    counter: () => go('counter'),
    review: () => go('review'),
  }) },
  counter: { render: counter, mount: (root) => bindActions(root, {
    'go-review': () => go('review'),
    'toggle-w': (e, key) => setUi(ui => ({ counterWants: { ...ui.counterWants, [key]: !ui.counterWants[key] } })),
    'pick-deadline': (e, l) => setUi({ counterDeadline: l }),
    'pick-stakes': (e, l) => setUi({ counterStakes: l }),
    'pick-counter-category': (e, id) => setUi({ counterCategoryId: id }),
    'send-counter': async () => {
      const st = getState();
      const changes = {};
      if (st.ui.counterWants.deadline) changes.deadline = st.ui.counterDeadline === 'Custom' ? st.ui.counterDeadlineCustom : st.ui.counterDeadline;
      if (st.ui.counterWants.details) changes.details = st.ui.counterDetails;
      if (st.ui.counterWants.stakes) changes.stakes = st.ui.counterStakes;
      if (st.ui.counterWants.category) changes.category = st.ui.counterCategoryId;
      if (st.ui.counterNote) changes.note = st.ui.counterNote;
      await sendCounter(st.activeContractId, changes);
      go('counterSent');
    },
  }) },
  counterSent: { render: counterSent, mount: (root) => bindActions(root, { 'go-dashboard': () => go('dashboard') }) },
  detail: { render: detail, mount: (root, state) => bindActions(root, {
    'go-dashboard': () => go('dashboard'),
    'toggle-menu': () => setUi(ui => ({ detailMenuOpen: !ui.detailMenuOpen })),
    'edit-terms': () => { const c = activeContract(state); setUi(ui => ({ detailMenuOpen: false, nc: { ...ui.nc, step: 2, title: c.title, isEditing: true } })); go('nc'); },
    cancel: () => { setUi({ detailMenuOpen: false }); go('cancelConfirm'); },
    'submit-proof': () => submitProof(state.activeContractId),
    'review-change': () => go('reviewChange'),
    'mark-breached': () => markBreached(state.activeContractId),
    'confirm-kept': () => confirmKept(state.activeContractId),
    claim: () => go('claimed'),
    dispute: () => { setUi({ disputeNote: '', disputeError: null }); go('dispute'); },
    uphold: () => upholdBreach(state.activeContractId),
    overturn: () => overturnToKept(state.activeContractId),
    history: async () => { await loadHistory(state.activeContractId); go('history'); },
  }) },
  cancelConfirm: { render: cancelConfirm, mount: (root, state) => bindActions(root, {
    'go-detail': () => go('detail'),
    keep: () => go('detail'),
    'confirm-cancel': async () => { await cancelContract(state.activeContractId); go('detail'); },
  }) },
  dispute: { render: dispute, mount: (root, state) => bindActions(root, {
    'go-detail': () => go('detail'),
    submit: async () => {
      const note = getState().ui.disputeNote;
      if (!note.trim()) { setUi({ disputeError: "Explain why you're disputing this call." }); return; }
      await submitDispute(state.activeContractId, note);
      go('detail');
    },
  }) },
  reviewChange: { render: reviewChange, mount: (root, state) => bindActions(root, {
    'go-dashboard': () => go('dashboard'),
    approve: async () => { await approveEdit(state.activeContractId); go('dashboard'); },
    reject: async () => { await rejectEdit(state.activeContractId); go('dashboard'); },
  }) },
  history: { render: history, mount: (root) => bindActions(root, { 'go-detail': () => go('detail') }) },
  claimed: { render: claimed, mount: (root) => bindActions(root, { 'go-dashboard': () => go('dashboard') }) },
};
