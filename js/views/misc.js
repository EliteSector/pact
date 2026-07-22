import { go } from '../store.js';
import { bindActions } from '../router.js';

function loading() {
  return `<div class="center-screen"><div class="spinner"></div><div style="font-family:var(--font-display);font-weight:800;font-size:16px;color:var(--ink)">Loading your contracts…</div></div>`;
}
function networkError() {
  return `
  <div class="center-screen">
    <div class="icon-tile" style="background:var(--red)"><img src="assets/pk/icons/shield-check.png" alt="" style="width:44px;height:44px"></div>
    <div style="font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--ink)">Couldn't connect</div>
    <div style="font-family:var(--font-body);font-size:14px;color:var(--text-muted);max-width:260px">Check your connection and try again. Your contracts are safe — nothing was lost.</div>
    <button class="btn btn-primary btn-lg btn-block" data-act="retry">Try Again</button>
  </div>`;
}

export const screens = {
  loading: { render: loading, mount: () => {} },
  networkError: { render: networkError, mount: (root) => bindActions(root, { retry: () => location.reload() }) },
};
