// التخزين المحلي + السلسلة اليومية + البذرة اليومية + المراحل والرتب
const PREFIX = 'bg:';

export const store = {
  get(k, d = null) {
    try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); }
    catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch {}
  },
  del(k) {
    try { localStorage.removeItem(PREFIX + k); } catch {}
  },
};

export function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

export function yesterdayKey() {
  const d = new Date(Date.now() - 86400000);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + m + '-' + day;
}

export function dailySeed(gameId) {
  return hash(gameId + '::' + todayKey());
}

function hash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// سلسلة الأيام (Streak)
export function getStreak() {
  return store.get('streak', { count: 0, best: 0, last: null });
}

export function touchStreak() {
  const s = getStreak();
  const t = todayKey();
  const y = yesterdayKey();
  if (s.last === t) return s;
  s.count = (s.last === y) ? s.count + 1 : 1;
  s.best = Math.max(s.best, s.count);
  s.last = t;
  store.set('streak', s);
  return s;
}

// إحصائيات عامة (XP/عملات/أفضل النتائج)
export function getMeta() {
  return store.get('meta', { xp: 0, coins: 0, bestScores: {} });
}

export function addXp(n) {
  const m = getMeta();
  m.xp += n;
  store.set('meta', m);
}

export function bestScore(gameId) {
  const m = getMeta();
  return (m.bestScores && m.bestScores[gameId]) || 0;
}

export function submitScore(gameId, score) {
  const m = getMeta();
  m.bestScores = m.bestScores || {};
  const prev = m.bestScores[gameId] || 0;
  const isRecord = score > prev;
  if (isRecord) m.bestScores[gameId] = score;
  store.set('meta', m);
  return isRecord;
}

// ---- المراحل (تقدم اللاعب لكل لعبة) ----
export function getProgress() {
  return store.get('progress', {});
}

// رقم المرحلة الحالية (1..1000)
export function getLevel(gameId) {
  return (getProgress()[gameId] || 0) + 1;
}

// إتمام مرحلة → التقدم لمرحلة التالية (بحد أقصى 1000)
export function completeLevel(gameId) {
  const p = getProgress();
  p[gameId] = Math.min(999, (p[gameId] || 0) + 1);
  store.set('progress', p);
  return p[gameId] + 1;
}

export function totalCompleted() {
  const p = getProgress();
  return Object.values(p).reduce((s, n) => s + (n || 0), 0);
}

// ---- الرتب ----
const RANKS = [
  { min: 0,   name: 'مبتدئ',        icon: '🌱', color: '#9A8B7A' },
  { min: 10,  name: 'لاعب',         icon: '🎯', color: '#2EC4A8' },
  { min: 30,  name: 'هاوٍ',          icon: '⭐', color: '#4FA3E8' },
  { min: 60,  name: 'محترف',        icon: '💠', color: '#8B5CF6' },
  { min: 100, name: 'خبير',          icon: '🔥', color: '#F2705A' },
  { min: 180, name: 'معلم',          icon: '👑', color: '#F7B33B' },
  { min: 300, name: 'أسطورة',        icon: '🏆', color: '#E8A93B' },
  { min: 500, name: 'غراند ماستر',   icon: '💎', color: '#EC4899' },
];

export function getRank() {
  const total = totalCompleted();
  let rank = RANKS[0];
  for (const r of RANKS) if (total >= r.min) rank = r;
  const next = RANKS[RANKS.indexOf(rank) + 1];
  return { ...rank, total, nextMin: next ? next.min : null, nextName: next ? next.name : null };
}

// ---- العملات (Coins) ----
export function getCoins() {
  return getMeta().coins || 0;
}

export function addCoins(n) {
  const m = getMeta();
  m.coins = (m.coins || 0) + n;
  store.set('meta', m);
  return m.coins;
}

export function spendCoins(n) {
  const m = getMeta();
  if ((m.coins || 0) < n) return false;
  m.coins -= n;
  store.set('meta', m);
  return true;
}
