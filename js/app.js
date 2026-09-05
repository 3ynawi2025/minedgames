// app.js — محور إدارة الحالة: settings, coins, language, navigation, registerGame
import { registry, registerGame } from './registry.js';
import { store, getStreak, touchStreak, bestScore, submitScore, addXp, todayKey, getLevel, completeLevel, getRank, getCoins, addCoins, spendCoins } from './services/storage.js';
import { THEMES, getTheme, setTheme } from './services/themes.js';
import { setSound } from './services/audio.js';
import { setHaptics } from './services/haptics.js';
import { t, getLang, setLang, applyLang } from './services/i18n.js';
import { toast } from './shared/fx.js';

/* ---- حالة الإعدادات ---- */
export const settings = store.get('settings', { sound: true, haptics: true });
export function save() { store.set('settings', settings); }
export function isDark() { return getTheme() === 'dark' || getTheme() === 'dusk'; }

/* ---- تسجيل الألعاب ---- */
export function registerModules(mods) { mods.forEach(m => registerGame(m)); }
export { registry };

/* ---- العملات: تلميح (متدرّج) + تراجع (مجاني) ---- */
const hintCounts = {}; // gameId -> عدد التلميحات المستخدمة في الجولة الحالية

// أسعار التلميحات المتدرّجة لكل جولة:
//   أول 5 → مجاني، الخمس التالية → 100 عملة، وما بعد 10 → 300 عملة.
export function useHint(gameId) {
  const c = hintCounts[gameId] || 0;
  const price = c < 5 ? 0 : (c < 10 ? 100 : 300);
  if (price > 0 && !spendCoins(price)) {
    toast(t('store.insufficient'));
    return false;
  }
  hintCounts[gameId] = c + 1;
  return true;
}

// يُستدعى عند بدء لوحة/مرحلة/جولة جديدة لإعادة تصفير عدّاد التلميحات لهذه اللعبة.
export function resetHints(gameId) {
  hintCounts[gameId] = 0;
}

// معلومات عدّاد التلميحات (للعرض على الزر): المجاني المتبقي + السعر الحالي.
export function getHintInfo(gameId) {
  const used = hintCounts[gameId] || 0;
  const freeLeft = Math.max(0, 5 - used);
  const price = used < 5 ? 0 : (used < 10 ? 100 : 300);
  return { used, freeLeft, price };
}

export function useUndo() {
  // الفترة المجانية: التراجع مجاني دائمًا
  return true;
}

// مكافأة الفوز (+20) + ترقية الرتبة (+50): تُحتسب عند إتمام مرحلة
export function rewardWin(gameId) {
  const winCoins = 20;
  addCoins(winCoins);
  const rankBefore = getRank();
  const newLevel = completeLevel(gameId);
  const rankAfter = getRank();
  const rankUp = rankAfter.name !== rankBefore.name;
  const rankBonus = rankUp ? 50 : 0;
  if (rankBonus) addCoins(rankBonus);
  return { newLevel, rankUp, winCoins, rankBonus, rankName: rankAfter.name };
}

// شراء «محاولة إضافية» (متابعة عند الفشل) مقابل توكنز
export function buyContinue(cost = 100) {
  if (spendCoins(cost)) return true;
  toast(t('store.insufficient'));
  return false;
}

// التحدي اليومي
export function isDailyCompleted() {
  const d = store.get('daily', { date: null, completed: false });
  return d.date === todayKey() && d.completed === true;
}
export function completeDaily(reward = 50) {
  if (isDailyCompleted()) return false;
  store.set('daily', { date: todayKey(), completed: true });
  addCoins(reward);
  return true;
}

// مكافأة يومية مجانية (+20 توكنز عند أول فتح كل يوم)
export function claimDailyReward() {
  if (store.get('lastReward') !== todayKey()) {
    addCoins(20);
    store.set('lastReward', todayKey());
    return true;
  }
  return false;
}

/* ---- تهيئة الحالة (تُستدعى من bootstrap بعد تسجيل الألعاب) ---- */
export function init() {
  setSound(settings.sound);
  setHaptics(settings.haptics);
  setTheme(getTheme());
  applyLang();
  touchStreak();
  if (store.get('started') !== true) { addCoins(200); store.set('started', true); }
  // التحديث الهوائي (Capgo): إشعار بأن التطبيق جاهز
  // ملاحظة: نصل للمكوّن عبر window.Capacitor.Plugins مباشرة لأن المشروع بلا bundler
  // (استيراد '@capgo/capacitor-updater' كـ bare specifier يفشل داخل WebView).
  (async () => {
    try {
      const CU = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater;
      if (CU && typeof CU.notifyAppReady === 'function') await CU.notifyAppReady();
    } catch {}
  })();
}

/* ---- إعادة تصدير حالة طبقة الواجهة ---- */
export { store, getStreak, bestScore, submitScore, addXp, todayKey, getLevel, completeLevel, getRank, getCoins, addCoins, spendCoins };
export { THEMES, getTheme, setTheme };
export { setSound, setHaptics };
export { t, getLang, setLang, applyLang };
export { toast };
