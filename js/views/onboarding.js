import { getState, setUi, go, saveProfile, addVaultItem, removeVaultItem, updateVaultItem } from '../store.js';
import { bindActions } from '../router.js';
import { esc, AVATAR_CHOICES } from '../util.js';
import { subscribeToPush } from '../push.js';
import { PRESET_FAVORS } from '../../data/preset-penalty-favors.js';

const TUTORIAL_SLIDES = [
  { icon: 'assets/pk/icons/handshake.png', bg: 'var(--gold)', title: 'Make a Promise', body: 'Turn any commitment — gym sessions, dishes, a deadline — into a contract with a partner and real stakes.' },
  { icon: 'assets/pk/icons/shield-check.png', bg: 'var(--blue)', title: 'Stay Accountable', body: "Photo proof, a check-in, or your partner's confirmation — you pick how it gets verified." },
  { icon: 'assets/pk/icons/star.png', bg: 'var(--green)', title: 'Win Points. Owe Favors.', body: 'Keep it and your Reliability Score climbs. Miss it, and a favor comes due.' },
];

function onbProfile(state) {
  const avatarId = state.ui.avatarId;
  return `
  <div class="screen-pad-top">
    <div style="font-family:var(--font-display);font-weight:800;font-size:26px;color:var(--ink)">Who's making these promises?</div>
    <label class="field">
      <span class="field-label">Display name</span>
      <input class="field-input" data-model="name" value="${esc(state.ui.name)}" placeholder="e.g. Alex R.">
    </label>
    <div class="uppercase-label">Avatar</div>
    <div class="row" style="gap:12px">
      ${AVATAR_CHOICES.map(a => `
        <div data-act="pick-avatar" data-arg="${a.id}" style="cursor:pointer;border-radius:50%;box-shadow:${a.id === avatarId ? 'var(--shadow-hard)' : 'none'}">
          <img src="${a.src}" alt="" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:${a.id === avatarId ? '3px solid var(--coral)' : '3px solid var(--ink)'}">
        </div>`).join('')}
    </div>
    <button class="btn btn-primary btn-lg btn-block" data-act="next" style="margin-top:8px">Next</button>
  </div>`;
}

function onbVault(state) {
  const vault = state.vaultItems;
  const suggestions = PRESET_FAVORS.other.filter(l => !vault.some(v => v.label === l));
  return `
  <div style="flex:1;min-height:0;display:flex;flex-direction:column">
    <div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;flex-direction:column;gap:14px;padding:calc(24px + var(--sat)) 20px 0">
      <div style="font-family:var(--font-display);font-weight:800;font-size:24px;color:var(--ink)">What favors are you willing to owe?</div>
      <div class="row">
        <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted)">Create a few. You'll be held to these.</div>
        <button class="link-btn" data-act="toggle-info" aria-label="What do Low/Med/High mean?" style="width:20px;height:20px;border-radius:50%;border:2px solid var(--ink);background:var(--cream-card);padding:0;font-weight:800">i</button>
      </div>
      ${state.ui.showDiffInfo ? `
        <div style="background:var(--gold);border:2px solid var(--ink);border-radius:var(--radius-md);padding:12px 14px;display:flex;flex-direction:column;gap:8px">
          <div><b>Low</b> — Low-effort favor. Fewer points at stake.</div>
          <div><b>Med</b> — A real ask, moderate stakes.</div>
          <div><b>High</b> — A big favor. Higher points on success, steeper penalty if breached.</div>
        </div>` : ''}
      <div class="row" style="gap:8px;flex-wrap:wrap">
        ${suggestions.map(l => `<button class="chip chip-sm" data-act="quick-add" data-arg="${esc(l)}"><span style="font-weight:800">+</span> ${esc(l)}</button>`).join('')}
      </div>
      ${vault.map(fav => `
        <div class="card-flat" style="box-shadow:var(--shadow-hard)">
          <div class="row-between" style="position:relative">
            <div style="font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink)">${esc(fav.label)}</div>
            <button class="link-btn" data-act="toggle-fav-menu" data-arg="${fav.id}" aria-label="More options" style="padding:0;width:28px">⋯</button>
            ${state.ui.openFavMenuId === fav.id ? `
              <div class="menu-popover" style="top:28px;right:0">
                <button data-act="edit-favor" data-arg="${fav.id}">Edit</button>
                <button class="danger" data-act="remove-favor" data-arg="${fav.id}">Delete</button>
              </div>` : ''}
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
            <button class="btn btn-primary btn-sm" style="flex:1" data-act="confirm-add">Add Favor</button>
          </div>
        </div>` : `<button class="btn btn-secondary btn-lg btn-block" data-act="start-add">+ Create Your Own Favor</button>`}
    </div>
    <div style="padding:16px 20px calc(20px + var(--sab))">
      <button class="btn btn-primary btn-lg btn-block" data-act="finish">Finish Setup</button>
    </div>
  </div>`;
}

function onbTutorial(state) {
  const step = state.ui.obTutorial.step;
  const slide = TUTORIAL_SLIDES[step - 1];
  return `
  <div class="screen" style="touch-action:pan-y" id="tutorial-swipe">
    <div style="display:flex;justify-content:flex-end;padding:calc(16px + var(--sat)) 20px 0">
      <button class="link-btn" data-act="skip">Skip</button>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;text-align:center;padding:8px 28px 24px;animation:obtSlideIn 260ms var(--ease-snap) both">
      <div class="icon-tile" style="background:${slide.bg}"><img src="${slide.icon}" alt="" style="width:44px;height:44px"></div>
      <div style="font-family:var(--font-display);font-weight:800;font-size:26px;line-height:1.15;color:var(--ink)">${esc(slide.title)}</div>
      <div style="font-family:var(--font-body);font-size:15px;color:var(--text-muted);max-width:280px">${esc(slide.body)}</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:18px;padding:0 24px calc(28px + var(--sab))">
      <div class="row" style="justify-content:center;gap:8px">
        ${TUTORIAL_SLIDES.map((_, i) => `<div data-act="dot" data-arg="${i + 1}" style="width:${step === i + 1 ? '22px' : '8px'};height:8px;border-radius:4px;border:2px solid var(--ink);background:${step === i + 1 ? 'var(--ink)' : 'var(--cream-card)'};cursor:pointer"></div>`).join('')}
      </div>
      <button class="btn btn-primary btn-lg" style="min-width:220px" data-act="next">${step === TUTORIAL_SLIDES.length ? 'Start Keeping Promises' : 'Next'}</button>
    </div>
  </div>`;
}

function notifPermission() {
  return `
  <div class="center-screen">
    <div class="icon-tile" style="background:var(--gold)"><img src="assets/pk/icons/shield-check.png" alt="" style="width:44px;height:44px"></div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:26px;line-height:1.15;color:var(--ink)">Never miss a deadline.</div>
    <div style="font-family:var(--font-body);font-size:15px;color:var(--text-muted);max-width:280px">Turn on notifications so Pact can remind you before a contract is due, and tell you the moment someone proposes one.</div>
    <div style="display:flex;flex-direction:column;gap:12px;width:100%;margin-top:8px">
      <button class="btn btn-primary btn-lg btn-block" data-act="enable">Enable Notifications</button>
      <button class="link-btn" data-act="skip">Not Now</button>
    </div>
  </div>`;
}

let touchX = null;

export const screens = {
  onbProfile: { render: onbProfile, mount: (root, state) => bindActions(root, {
    'pick-avatar': (e, id) => setUi({ avatarId: id }),
    next: async () => {
      await saveProfile({ name: getState().ui.name.trim(), avatar_id: getState().ui.avatarId });
      go('onbVault');
    },
  }) },
  onbVault: { render: onbVault, mount: (root) => bindActions(root, {
    'toggle-info': () => setUi(ui => ({ showDiffInfo: !ui.showDiffInfo })),
    'set-weight': (e, arg) => { const [id, w] = arg.split(':'); updateVaultItem(id, { weight: w }); },
    'toggle-fav-menu': (e, id) => setUi(ui => ({ openFavMenuId: ui.openFavMenuId === id ? null : id })),
    'edit-favor': (e, id) => {
      const fav = getState().vaultItems.find(v => v.id === id);
      setUi({ isAddingFavor: true, editingFavorId: id, newFavorText: fav?.label || '', openFavMenuId: null });
    },
    'remove-favor': (e, id) => { setUi({ openFavMenuId: null }); removeVaultItem(id); },
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
    'quick-add': (e, label) => addVaultItem(label),
    finish: () => go('notifPermission'),
  }) },
  onbTutorial: { render: onbTutorial, mount: (root) => {
    bindActions(root, {
      skip: () => go('onbProfile'),
      dot: (e, arg) => setUi(ui => ({ obTutorial: { step: Number(arg) } })),
      next: () => {
        const step = getState().ui.obTutorial.step;
        if (step >= TUTORIAL_SLIDES.length) go('onbProfile');
        else setUi({ obTutorial: { step: step + 1 } });
      },
    });
    const el = root.querySelector('#tutorial-swipe');
    if (el) {
      el.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; });
      el.addEventListener('touchend', e => {
        if (touchX == null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) < 40) return;
        const step = getState().ui.obTutorial.step;
        if (dx < 0) { step >= TUTORIAL_SLIDES.length ? go('onbProfile') : setUi({ obTutorial: { step: step + 1 } }); }
        else if (step > 1) setUi({ obTutorial: { step: step - 1 } });
      });
    }
  } },
  notifPermission: { render: notifPermission, mount: (root) => bindActions(root, {
    enable: async () => { try { await subscribeToPush(); } catch (e) {} go('dashboard'); },
    skip: () => go('dashboard'),
  }) },
};
