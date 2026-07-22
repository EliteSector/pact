import { getState, setUi, me, addVaultItem, removeVaultItem, updateVaultItem, redeemFavor } from '../store.js';
import { bindActions } from '../router.js';
import { esc } from '../util.js';

function vault(state) {
  const uid = me();
  const owed = state.favors.filter(f => f.owner_id === uid && f.status === 'owed');
  const redeemed = state.favors.filter(f => f.owner_id === uid && f.status === 'redeemed');
  const items = state.vaultItems;

  return `
  <div class="tab-header" style="gap:6px">
    <div class="section-title">Favor Vault</div>
    <div class="section-sub">Favors owed to you from breached contracts.</div>
  </div>
  <div class="tab-body">
    ${owed.map(f => `
      <div class="card" style="background:var(--purple);color:var(--cream)">
        <div style="font-size:13px;font-weight:800;text-transform:uppercase;opacity:.85;font-family:var(--font-display)">Owed by ${esc(state.profilesById?.[f.from_user_id]?.name || 'Someone')}</div>
        <div style="font-size:19px;font-weight:800;margin-top:6px;font-family:var(--font-display)">${esc(f.text)}</div>
        <div style="margin-top:10px"><button class="btn btn-secondary btn-sm" data-act="redeem" data-arg="${f.id}">Mark Redeemed</button></div>
      </div>`).join('')}
    ${redeemed.map(f => `
      <div class="card-flat" style="opacity:.6">
        <div style="font-size:13px;font-weight:800;text-transform:uppercase;color:var(--text-muted);font-family:var(--font-display)">Redeemed</div>
        <div style="font-size:17px;font-weight:700;color:var(--ink);margin-top:6px;font-family:var(--font-display)">${esc(f.text)} — from ${esc(state.profilesById?.[f.from_user_id]?.name || 'Someone')}</div>
      </div>`).join('')}
    ${!owed.length ? `
      <div class="empty-state" style="padding:24px 12px">
        <img src="assets/pk/icons/shield-check.png" alt="" style="width:44px;height:44px">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">No favors owed</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--text-muted);max-width:220px">Everyone's behaving. Breached contracts will show up here.</div>
      </div>` : ''}

    <div style="height:2px;background:var(--ink);opacity:.1;margin:6px 0"></div>
    <div style="font-size:18px;font-weight:800;color:var(--ink);font-family:var(--font-display)">Your Favor Catalog</div>
    <div class="row">
      <div style="font-size:13px;color:var(--text-muted);font-family:var(--font-body)">What you're willing to owe or ask for.</div>
      <button class="link-btn" data-act="toggle-info" style="width:20px;height:20px;border-radius:50%;border:2px solid var(--ink);background:var(--cream-card);padding:0;font-weight:800">i</button>
    </div>
    ${state.ui.showVaultDiffInfo ? `
      <div style="background:var(--gold);border:2px solid var(--ink);border-radius:var(--radius-md);padding:12px 14px;display:flex;flex-direction:column;gap:8px">
        <div><b>Low</b> — Low-effort favor. Fewer points at stake.</div>
        <div><b>Med</b> — Moderate favor. Moderate points at stake.</div>
        <div><b>High</b> — Big favor. Higher points at stake.</div>
      </div>` : ''}
    ${!items.length ? `
      <div class="empty-state" style="padding:24px 12px;background:var(--cream-card);border:var(--border-w) solid var(--ink);border-radius:var(--radius-lg)">
        <img src="assets/pk/icons/star.png" alt="" style="width:44px;height:44px">
        <div style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--ink)">No favors in your catalog</div>
        <div style="font-family:var(--font-body);font-size:13px;color:var(--text-muted);max-width:220px">Add favors you're willing to owe so partners know what's at stake.</div>
      </div>` : items.map(fav => `
      <div class="card-flat" style="box-shadow:var(--shadow-hard)">
        <div class="row-between">
          <div style="font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink)">${esc(fav.label)}</div>
          <button class="link-btn" data-act="remove-favor" data-arg="${fav.id}" style="color:var(--red)">Delete</button>
        </div>
        <div class="row" style="gap:8px;margin-top:10px">
          ${['low','med','high'].map(d => `<button class="chip chip-sm ${fav.weight === d ? 'active' : ''}" style="flex:1" data-act="set-weight" data-arg="${fav.id}:${d}">${d.toUpperCase()}</button>`).join('')}
        </div>
      </div>`).join('')}

    ${state.ui.isAddingFavor ? `
      <div class="card-flat">
        <input class="field-input" data-model="newFavorText" data-live value="${esc(state.ui.newFavorText)}" placeholder="e.g. Wash the car">
        <div class="row" style="gap:10px;margin-top:10px">
          <button class="btn btn-secondary btn-sm" style="flex:1" data-act="cancel-add">Cancel</button>
          <button class="btn btn-primary btn-sm" style="flex:1" data-act="confirm-add">${state.ui.editingFavorId ? 'Save' : 'Add Favor'}</button>
        </div>
      </div>` : `<button class="btn btn-secondary btn-lg btn-block" data-act="start-add">+ Create Your Own Favor</button>`}
  </div>`;
}

export const screens = {
  vault: { render: vault, mount: (root) => bindActions(root, {
    redeem: (e, id) => redeemFavor(id),
    'toggle-info': () => setUi(ui => ({ showVaultDiffInfo: !ui.showVaultDiffInfo })),
    'set-weight': (e, arg) => { const [id, w] = arg.split(':'); updateVaultItem(id, { weight: w }); },
    'remove-favor': (e, id) => removeVaultItem(id),
    'start-add': () => setUi({ isAddingFavor: true, newFavorText: '', editingFavorId: null }),
    'cancel-add': () => setUi({ isAddingFavor: false, newFavorText: '', editingFavorId: null }),
    'confirm-add': async () => {
      const ui = getState().ui;
      const text = ui.newFavorText.trim();
      const editingId = ui.editingFavorId;
      setUi({ isAddingFavor: false, newFavorText: '', editingFavorId: null });
      if (!text) return;
      if (editingId) await updateVaultItem(editingId, { label: text });
      else await addVaultItem(text);
    },
  }) },
};
