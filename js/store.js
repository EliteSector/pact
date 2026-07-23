import { supabase } from './supabase-client.js';
import { DIFF_STAKES } from './util.js';

const listeners = new Set();

let state = {
  screen: 'splash',
  prevScreen: null,
  booted: false,
  session: null,
  profile: null,
  contracts: [],
  contractHistory: [],
  favors: [],
  vaultItems: [],
  network: [],
  notifications: [],
  activeContractId: null,
  errorMsg: null,

  ui: {
    emailAuth: { mode: 'signup', email: '', password: '', confirm: '', errors: {} },
    forgotEmail: '', forgotError: null,
    name: '', avatarId: 'alex',
    obTutorial: { step: 1 },
    showDiffInfo: false, showVaultDiffInfo: false,
    isAddingFavor: false, newFavorText: '', editingFavorId: null, openFavMenuId: null,
    nc: { step: 1, partnerId: null, title: '', categoryId: 'couple', deadline: '', penaltyId: null,
      detailWants: { photo: false, checkin: false, witness: false, location: false }, detailsCount: '', detailsNote: '', details: '', isEditing: false },
    counterWants: { deadline: false, details: false, stakes: false, category: false },
    counterDeadline: '', counterDeadlineCustom: '', counterDetails: '', counterStakes: '', counterCategoryId: '', counterNote: '',
    isAddingContact: false, newContactName: '', newContactEmail: '', openContactMenuId: null, removeContactId: null,
    faqOpenId: null, inviteCopied: false,
    disputeNote: '', disputeError: null, detailMenuOpen: false,
    changePw: { current: '', new: '', confirm: '', errors: {}, saved: false },
    deleteAccount: { password: '', confirmText: '', errors: {} },
    leaderboardSort: 'reliability',
    busy: false,
  },
};

export function getState() { return state; }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setState(patch) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
  listeners.forEach(fn => fn(state));
}
export function setUi(patch) {
  setState(st => ({ ui: { ...st.ui, ...(typeof patch === 'function' ? patch(st.ui) : patch) } }));
}
export function setUiPath(path, value) {
  const keys = path.split('.');
  setState(st => {
    const ui = structuredClone(st.ui);
    let node = ui;
    for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]];
    node[keys[keys.length - 1]] = value;
    return { ui };
  });
}
export function me() { return state.session?.user?.id || null; }

export function go(screen, extra) {
  setState(st => ({ screen, prevScreen: st.screen, ...(extra || {}) }));
  history.replaceState(null, '', '#/' + screen);
}

// ---------- auth ----------

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return { hasSession: !!data.session };
}
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signOut() {
  await unsubscribeRealtime();
  await supabase.auth.signOut();
  setState({
    screen: 'splash', session: null, profile: null, contracts: [], contractHistory: [],
    favors: [], vaultItems: [], network: [], notifications: [],
  });
}
export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  if (error) throw error;
}
export async function changePassword(currentPassword, newPassword) {
  const email = state.session?.user?.email;
  const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (reauthErr) throw new Error('Current password is incorrect.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
export async function deleteAccountRemote() {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${supabase.supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  await unsubscribeRealtime();
  await supabase.auth.signOut();
}

// ---------- profile ----------

export async function loadProfile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', me()).single();
  if (error) throw error;
  setState({ profile: data });
  return data;
}
export async function saveProfile(patch) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', me()).select().single();
  if (error) throw error;
  setState({ profile: data });
  return data;
}

// ---------- initial load + realtime ----------

let channel = null;

export async function loadAll() {
  const uid = me();
  const [profileRes, contractsRes, favorsRes, vaultRes, networkRes, notifsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).single(),
    supabase.from('contracts').select('*').or(`proposer_id.eq.${uid},partner_id.eq.${uid}`).order('updated_at', { ascending: false }),
    supabase.from('favors').select('*').or(`owner_id.eq.${uid},from_user_id.eq.${uid}`).order('created_at', { ascending: false }),
    supabase.from('vault_items').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
    supabase.from('network_connections').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
    supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
  ]);
  const partnerIds = new Set();
  (contractsRes.data || []).forEach(c => { partnerIds.add(c.proposer_id); partnerIds.add(c.partner_id); });
  (networkRes.data || []).forEach(n => { if (n.contact_user_id) partnerIds.add(n.contact_user_id); });
  partnerIds.delete(uid);
  let profiles = {};
  if (partnerIds.size) {
    const { data } = await supabase.from('profiles').select('id,name,avatar_id,reliability,points').in('id', [...partnerIds]);
    (data || []).forEach(p => { profiles[p.id] = p; });
  }
  setState({
    profile: profileRes.data,
    contracts: contractsRes.data || [],
    favors: favorsRes.data || [],
    vaultItems: vaultRes.data || [],
    network: networkRes.data || [],
    notifications: notifsRes.data || [],
    profilesById: profiles,
  });
  subscribeRealtime(uid);
}

export function subscribeRealtime(uid) {
  if (channel) return;
  channel = supabase.channel('pact-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: `proposer_id=eq.${uid}` }, handleContractChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: `partner_id=eq.${uid}` }, handleContractChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'favors', filter: `owner_id=eq.${uid}` }, handleFavorChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'favors', filter: `from_user_id=eq.${uid}` }, handleFavorChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, handleNotificationChange)
    .subscribe();
}
export async function unsubscribeRealtime() {
  if (channel) { await supabase.removeChannel(channel); channel = null; }
}

async function ensurePartnerProfile(id) {
  if (!id || state.profilesById?.[id]) return;
  const { data } = await supabase.from('profiles').select('id,name,avatar_id,reliability,points').eq('id', id).single();
  if (data) setState(st => ({ profilesById: { ...st.profilesById, [id]: data } }));
}

function handleContractChange(payload) {
  if (payload.eventType === 'DELETE') {
    setState(st => ({ contracts: st.contracts.filter(c => c.id !== payload.old.id) }));
    return;
  }
  const row = payload.new;
  ensurePartnerProfile(row.proposer_id);
  ensurePartnerProfile(row.partner_id);
  setState(st => {
    const exists = st.contracts.some(c => c.id === row.id);
    return { contracts: exists ? st.contracts.map(c => c.id === row.id ? row : c) : [row, ...st.contracts] };
  });
}
function handleFavorChange(payload) {
  if (payload.eventType === 'DELETE') {
    setState(st => ({ favors: st.favors.filter(f => f.id !== payload.old.id) }));
    return;
  }
  const row = payload.new;
  setState(st => {
    const exists = st.favors.some(f => f.id === row.id);
    return { favors: exists ? st.favors.map(f => f.id === row.id ? row : f) : [row, ...st.favors] };
  });
}
function handleNotificationChange(payload) {
  if (payload.eventType === 'DELETE') return;
  const row = payload.new;
  setState(st => {
    const exists = st.notifications.some(n => n.id === row.id);
    return { notifications: exists ? st.notifications.map(n => n.id === row.id ? row : n) : [row, ...st.notifications] };
  });
}

export function partnerProfile(id) {
  if (id === me()) return { id, name: state.profile?.name || '', avatar_id: state.profile?.avatar_id || 'alex' };
  return state.profilesById?.[id] || { id, name: 'Someone', avatar_id: 'alex' };
}

// ---------- vault ----------

export async function addVaultItem(label, weight = 'med') {
  const { data, error } = await supabase.from('vault_items').insert({ user_id: me(), label, weight, source: 'custom' }).select().single();
  if (error) throw error;
  setState(st => ({ vaultItems: [...st.vaultItems, data] }));
}
export async function updateVaultItem(id, patch) {
  const { data, error } = await supabase.from('vault_items').update(patch).eq('id', id).select().single();
  if (error) throw error;
  setState(st => ({ vaultItems: st.vaultItems.map(v => v.id === id ? data : v) }));
}
export async function removeVaultItem(id) {
  const { error } = await supabase.from('vault_items').delete().eq('id', id);
  if (error) throw error;
  setState(st => ({ vaultItems: st.vaultItems.filter(v => v.id !== id) }));
}

// ---------- network / invites ----------

export async function loadReferralCode() {
  const { data } = await supabase.from('invite_codes').select('code').eq('inviter_id', me()).is('redeemed_by', null).limit(1).maybeSingle();
  return data?.code || null;
}
export async function redeemInviteCode(code) {
  const { data: invite, error } = await supabase.from('invite_codes').select('*').eq('code', code.toUpperCase()).is('redeemed_by', null).maybeSingle();
  if (error) throw error;
  if (!invite) throw new Error('That code is invalid or already used.');
  if (invite.inviter_id === me()) throw new Error("That's your own code.");
  await supabase.from('invite_codes').update({ redeemed_by: me(), redeemed_at: new Date().toISOString() }).eq('code', invite.code);
  await addNetworkConnection(invite.inviter_id, null, null, 'joined');
}
// Set by main.js when the app loads on a …/#/redeem/CODE link, before auth/onboarding
// has necessarily finished — redeemed once we know who "me()" actually is.
export async function redeemPendingReferral() {
  const code = sessionStorage.getItem('pact_pending_referral');
  if (!code) return;
  sessionStorage.removeItem('pact_pending_referral');
  try { await redeemInviteCode(code); } catch (e) { console.warn('Referral link redeem failed:', e.message); }
}
export async function addNetworkConnection(contactUserId, name, email, status = 'pending') {
  const { data, error } = await supabase.from('network_connections')
    .insert({ user_id: me(), contact_user_id: contactUserId, contact_name: name, contact_email: email, status })
    .select().single();
  if (error) throw error;
  if (contactUserId) await ensurePartnerProfile(contactUserId);
  setState(st => ({ network: [...st.network, data] }));
  return data;
}
export async function addContactByEmail(name, email) {
  const { data: existing } = await supabase.from('profiles').select('id,name').limit(0); // no-op placeholder to keep shape
  return addNetworkConnection(null, name, email, 'pending');
}
export async function removeNetworkConnection(id) {
  const { error } = await supabase.from('network_connections').delete().eq('id', id);
  if (error) throw error;
  setState(st => ({ network: st.network.filter(n => n.id !== id) }));
}
export async function setNetworkBlocked(id, blocked) {
  const { data, error } = await supabase.from('network_connections').update({ blocked }).eq('id', id).select().single();
  if (error) throw error;
  setState(st => ({ network: st.network.map(n => n.id === id ? data : n) }));
}

// ---------- contracts ----------

async function logHistory(contractId, action, payload = {}) {
  await supabase.from('contract_history').insert({ contract_id: contractId, actor_id: me(), action, payload });
}

export async function createContract(input) {
  const { data, error } = await supabase.from('contracts').insert({
    proposer_id: me(), partner_id: input.partnerId, title: input.title, category: input.categoryId,
    description: input.description, deadline: input.deadline || null, status: 'proposed',
    progress_value: 0, progress_max: input.progressMax || 1, progress_label: input.progressLabel || '',
    penalty_favor_text: input.penaltyText, penalty_vault_item_id: input.penaltyVaultItemId || null, points: input.points,
  }).select().single();
  if (error) throw error;
  await logHistory(data.id, 'proposed', { title: input.title, deadline: input.deadline, points: input.points });
  setState(st => ({ contracts: [data, ...st.contracts] }));
  return data;
}

// input: { title, deadline (ISO string or ''), penaltyVaultItemId } — the *proposed* new values.
// Builds a real per-field diff (contract.pendingEdit = {changes,title,deadline,penaltyId}) so
// Review Change Request / the pending-edit banner can show old->new per field, not just a title.
export async function updateContractEdit(contractId, input) {
  const c = state.contracts.find(x => x.id === contractId);
  const changes = [];
  if (input.title && input.title !== c.title) {
    changes.push({ label: 'Title', from: c.title, to: input.title });
  }
  if (input.deadline && input.deadline !== c.deadline) {
    changes.push({
      label: 'Deadline',
      from: c.deadline ? new Date(c.deadline).toLocaleString() : 'No deadline',
      to: new Date(input.deadline).toLocaleString(),
    });
  }
  let penaltyText = c.penalty_favor_text, points = c.points;
  if (input.penaltyVaultItemId && input.penaltyVaultItemId !== c.penalty_vault_item_id) {
    const item = state.vaultItems.find(v => v.id === input.penaltyVaultItemId);
    if (item) {
      changes.push({ label: 'Stakes', from: c.penalty_favor_text, to: item.label });
      penaltyText = item.label;
      points = DIFF_STAKES[item.weight] || c.points;
    }
  }
  const pendingEdit = {
    changes, title: input.title || c.title, deadline: input.deadline || c.deadline,
    penaltyId: input.penaltyVaultItemId || c.penalty_vault_item_id, penaltyText, points,
  };
  const { data, error } = await supabase.from('contracts')
    .update({ status: 'pending_edit', pending_edit: pendingEdit }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'requested change', { changes: changes.map(c => `${c.label}: ${c.from} -> ${c.to}`).join('; ') });
  patchLocalContract(data);
  return data;
}
export async function approveEdit(contractId) {
  const c = state.contracts.find(x => x.id === contractId);
  const pe = c.pending_edit || {};
  const { data, error } = await supabase.from('contracts').update({
    status: 'active', title: pe.title || c.title, deadline: pe.deadline || c.deadline,
    penalty_favor_text: pe.penaltyText || c.penalty_favor_text, penalty_vault_item_id: pe.penaltyId || c.penalty_vault_item_id,
    points: pe.points || c.points, pending_edit: null,
  }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'approved the change', {});
  patchLocalContract(data);
}
export async function rejectEdit(contractId) {
  const { data, error } = await supabase.from('contracts')
    .update({ status: 'active', pending_edit: null }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'rejected the change', {});
  patchLocalContract(data);
}

export async function acceptContract(contractId) {
  const { data, error } = await supabase.from('contracts').update({ status: 'active' }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'accepted the contract', {});
  patchLocalContract(data);
}
export async function sendCounter(contractId, changes) {
  const patch = { status: 'countered' };
  if (changes.deadline) patch.deadline = changes.deadline;
  if (changes.details) patch.description = changes.details;
  const { data, error } = await supabase.from('contracts').update(patch).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'proposed changes', changes);
  patchLocalContract(data);
}
export async function submitProof(contractId) {
  const { data, error } = await supabase.from('contracts').update({ status: 'pending_confirm' }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'submitted proof', {});
  patchLocalContract(data);
}
export async function confirmKept(contractId) {
  const c = state.contracts.find(x => x.id === contractId);
  const { data, error } = await supabase.from('contracts').update({ status: 'kept' }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'confirmed kept', {});
  patchLocalContract(data);
  await bumpPoints(c.proposer_id, c.points, 2, 'kept');
  await bumpPoints(c.partner_id, c.points, 2, 'kept');
}
export async function markBreached(contractId) {
  const c = state.contracts.find(x => x.id === contractId);
  const stakeLose = Math.round(c.points * 1.3);
  const { data, error } = await supabase.from('contracts').update({ status: 'breached' }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'marked breached', {});
  patchLocalContract(data);
  await bumpPoints(c.proposer_id, -stakeLose, -4, 'breached');
  const { data: favor, error: favErr } = await supabase.from('favors').insert({
    owner_id: c.partner_id, from_user_id: c.proposer_id, text: c.penalty_favor_text,
    status: 'owed', source_contract_id: c.id,
  }).select().single();
  if (!favErr) setState(st => ({ favors: [favor, ...st.favors] }));
}
export async function submitDispute(contractId, note) {
  note = note.trim();
  const { data, error } = await supabase.from('contracts').update({ status: 'disputed', dispute_note: note, disputed_by: me() }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'disputed the call', { note });
  patchLocalContract(data);
}
export async function upholdBreach(contractId) {
  const { data, error } = await supabase.from('contracts').update({ status: 'breached' }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'upheld the breach', {});
  patchLocalContract(data);
}
export async function overturnToKept(contractId) {
  const c = state.contracts.find(x => x.id === contractId);
  const stakeLose = Math.round(c.points * 1.3);
  const { data, error } = await supabase.from('contracts').update({ status: 'kept' }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'overturned to kept', {});
  patchLocalContract(data);
  await bumpPoints(c.proposer_id, c.points + stakeLose, 2, 'kept');
  await bumpPoints(c.partner_id, c.points, 2, 'kept');
}
export async function cancelContract(contractId) {
  const { data, error } = await supabase.from('contracts').update({ status: 'canceled' }).eq('id', contractId).select().single();
  if (error) throw error;
  await logHistory(contractId, 'canceled the contract', {});
  patchLocalContract(data);
}

async function bumpPoints(userId, pointsDelta, reliabilityDelta, outcome) {
  const { data: prof } = await supabase.from('profiles').select('points,reliability,kept_count,breached_count').eq('id', userId).single();
  if (!prof) return;
  const patch = {
    points: Math.max(0, prof.points + pointsDelta),
    reliability: Math.max(0, Math.min(100, prof.reliability + reliabilityDelta)),
  };
  if (outcome === 'kept') patch.kept_count = prof.kept_count + 1;
  if (outcome === 'breached') patch.breached_count = prof.breached_count + 1;
  const { data } = await supabase.from('profiles').update(patch).eq('id', userId).select().single();
  if (userId === me() && data) setState({ profile: data });
}

function patchLocalContract(row) {
  setState(st => ({ contracts: st.contracts.map(c => c.id === row.id ? row : c) }));
}

export async function loadHistory(contractId) {
  const { data, error } = await supabase.from('contract_history').select('*').eq('contract_id', contractId).order('created_at', { ascending: true });
  if (error) throw error;
  const actorIds = new Set((data || []).map(h => h.actor_id));
  for (const id of actorIds) await ensurePartnerProfile(id);
  setState({ contractHistory: data || [] });
}

// ---------- favors ----------

export async function redeemFavor(favorId) {
  const { data, error } = await supabase.from('favors').update({ status: 'redeemed' }).eq('id', favorId).select().single();
  if (error) throw error;
  setState(st => ({ favors: st.favors.map(f => f.id === favorId ? data : f) }));
}

// ---------- notifications ----------

export async function markAllNotifsRead() {
  const ids = state.notifications.filter(n => !n.read).map(n => n.id);
  if (!ids.length) return;
  await supabase.from('notifications').update({ read: true }).in('id', ids);
  setState(st => ({ notifications: st.notifications.map(n => ({ ...n, read: true })) }));
}
export async function markNotifRead(id) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
  setState(st => ({ notifications: st.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));
}
