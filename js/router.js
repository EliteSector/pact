import { getState, setState, setUi, setUiPath, subscribe } from './store.js';

const registry = {};
export function registerScreens(map) { Object.assign(registry, map); }

const MAIN_TABS = new Set(['dashboard', 'vault', 'network', 'profile']);
const NAV_DEFS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'vault', label: 'Favor Vault' },
  { key: 'network', label: 'Network' },
  { key: 'profile', label: 'Profile' },
];

function navIcon(key, color) {
  if (key === 'dashboard') return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="19" rx="3" stroke="${color}" stroke-width="2.4"></rect><path d="M8 3h8v3a1 1 0 01-1 1H9a1 1 0 01-1-1V3z" fill="${color}"></path><path d="M8 13l2.5 2.5L16.5 9.5" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
  if (key === 'vault') return `<svg width="23" height="23" viewBox="0 0 24 24" fill="none"><path d="M7 10V7a5 5 0 0110 0v3" stroke="${color}" stroke-width="2.6" stroke-linecap="round"></path><rect x="4.5" y="10" width="15" height="11" rx="3" stroke="${color}" stroke-width="2.6"></rect><circle cx="12" cy="14.5" r="1.8" fill="${color}"></circle><rect x="11.1" y="15.6" width="1.8" height="3" rx="0.6" fill="${color}"></rect></svg>`;
  if (key === 'network') return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="14" width="4.5" height="7" rx="1.2" fill="${color}"></rect><rect x="9.75" y="8" width="4.5" height="13" rx="1.2" fill="${color}"></rect><rect x="16.5" y="11" width="4.5" height="10" rx="1.2" fill="${color}"></rect><circle cx="12" cy="4" r="2" fill="${color}"></circle></svg>`;
  return '';
}

function renderBottomNav(state) {
  const active = state.screen;
  const items = NAV_DEFS.map(n => {
    const isActive = active === n.key;
    const accent = n.key === 'dashboard' ? 'var(--gold)' : n.key === 'vault' ? 'var(--purple)' : n.key === 'network' ? 'var(--blue)' : 'var(--coral)';
    const iconColor = isActive && n.key === 'vault' ? '#fff' : 'var(--ink)';
    const tileStyle = `background:${isActive ? accent : 'var(--cream-card)'}`;
    const inner = n.key === 'profile'
      ? `<img src="${(state.profile?.avatar_id ? 'assets/pk/avatars/' + ({alex:'alex-r','diverse-01':'diverse-01','diverse-02':'diverse-02','diverse-03':'diverse-03'}[state.profile.avatar_id] || 'alex-r') + '.png' : 'assets/pk/avatars/alex-r.png')}" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1.5px solid ${iconColor}">`
      : navIcon(n.key, iconColor);
    return `<button data-act="nav" data-arg="${n.key}" class="${isActive ? 'active' : ''}">
      <div class="bottom-nav-tile ${isActive ? 'active' : ''}" style="${tileStyle}">${inner}</div>
      ${n.label}
    </button>`;
  }).join('');
  return `<div class="bottom-nav">${items}</div>`;
}

export function bindActions(root, actions) {
  root.querySelectorAll('[data-act]').forEach(el => {
    const act = el.getAttribute('data-act');
    const fn = actions[act];
    if (!fn) return;
    el.addEventListener('click', e => fn(e, el.getAttribute('data-arg')));
  });
  root.querySelectorAll('[data-model]').forEach(el => {
    const path = el.getAttribute('data-model');
    const evt = el.getAttribute('data-live') != null ? 'input' : 'change';
    el.addEventListener(evt, e => {
      const val = el.type === 'checkbox' ? el.checked : e.target.value;
      if (actions.__bind) actions.__bind(path, val, e);
      else setUiPath(path, val);
    });
  });
}

function render() {
  const state = getState();
  const root = document.getElementById('app');
  const screen = registry[state.screen];
  if (!screen) {
    root.innerHTML = `<div class="center-screen"><div class="spinner"></div></div>`;
    return;
  }
  const focusInfo = captureFocus(root);
  const showChrome = MAIN_TABS.has(state.screen);
  root.innerHTML = `<div class="screen">${screen.render(state)}</div>${showChrome ? renderBottomNav(state) : ''}`;
  screen.mount?.(root, state);
  root.querySelectorAll('[data-act="nav"]').forEach(el => {
    el.addEventListener('click', () => setState({ screen: el.getAttribute('data-arg'), prevScreen: state.screen }));
  });
  restoreFocus(root, focusInfo);
}

function captureFocus(root) {
  const el = root.querySelector(':focus');
  if (!el || !el.id) return null;
  return { id: el.id, selStart: el.selectionStart, selEnd: el.selectionEnd };
}
function restoreFocus(root, info) {
  if (!info) return;
  const el = root.querySelector('#' + CSS.escape(info.id));
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(info.selStart, info.selEnd); } catch (e) {}
}

export function startRouter() {
  subscribe(render);
  render();
}
