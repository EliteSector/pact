export const AVATAR_CHOICES = [
  { id: 'alex', src: 'assets/pk/avatars/alex-r.png' },
  { id: 'diverse-01', src: 'assets/pk/avatars/diverse-01.png' },
  { id: 'diverse-02', src: 'assets/pk/avatars/diverse-02.png' },
  { id: 'diverse-03', src: 'assets/pk/avatars/diverse-03.png' },
];

export function avatarSrc(avatarId) {
  return (AVATAR_CHOICES.find(a => a.id === avatarId) || AVATAR_CHOICES[0]).src;
}

export const CATEGORY_DEFS = [
  { id: 'couple', label: 'Couple' }, { id: 'parentchild', label: 'Parent/Child' },
  { id: 'house', label: 'Roommate' }, { id: 'work', label: 'Coworker' },
  { id: 'bestie', label: 'Bestie' }, { id: 'other', label: 'Other' },
];
export function categoryLabel(id) { return (CATEGORY_DEFS.find(c => c.id === id) || {}).label || id; }

export const DIFF_STAKES = { low: 60, med: 150, high: 260 };

export const STATUS_LABEL = {
  proposed: 'Proposed', countered: 'Countered', active: 'Active', pending_confirm: 'Pending',
  kept: 'Kept', breached: 'Breached', disputed: 'Disputed', canceled: 'Canceled', pending_edit: 'Change Pending',
};
export const STATUS_COLOR = {
  proposed: 'var(--gold)', countered: 'var(--gold)', active: 'var(--gold)', pending_confirm: 'var(--gold)',
  kept: 'var(--green)', breached: 'var(--red)', disputed: 'var(--blue)', canceled: 'var(--text-muted)', pending_edit: 'var(--gold)',
};

export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtTimeUntil(deadlineIso) {
  if (!deadlineIso) return '';
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms <= 0) return 'Past due';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60), d = Math.floor(h / 24);
  return d > 0 ? `${d}d ${h % 24}h` : `${h}h ${totalMin % 60}m`;
}

export function fmtRelativeTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function passwordScore(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12 && /[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw) && /[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  return Math.min(score, 3);
}

export function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export function toDatetimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
