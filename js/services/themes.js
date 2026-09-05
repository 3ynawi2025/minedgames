// إدارة الثيمات (فاتح/داكن/زمرد/غسق/حلوى)
const KEY = 'bg:theme';
export const THEMES = [
  { id: 'light', name: 'نسيم', sw: '#F2705A' },
  { id: 'dark', name: 'ليل', sw: '#7B9CFF' },
  { id: 'emerald', name: 'زمرد', sw: '#1F9D6B' },
  { id: 'dusk', name: 'غسق', sw: '#B48CFF' },
  { id: 'candy', name: 'حلوى', sw: '#FF6FA5' },
];

export function getTheme() {
  try { return localStorage.getItem(KEY) || 'light'; } catch { return 'light'; }
}

export function setTheme(id) {
  if (id === 'light') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', id);
  try { localStorage.setItem(KEY, id); } catch {}
  document.dispatchEvent(new CustomEvent('bg:theme'));
}

export function applyTheme() {
  setTheme(getTheme());
}
