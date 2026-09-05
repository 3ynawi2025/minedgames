// الحفظ السحابي: تصدير/استيراد التقدم عبر رمز (بدون خادم — يعمل بين الأجهزة)
import { store } from './storage.js';

const KEYS = ['meta', 'progress', 'streak', 'settings', 'lastReward', 'started', 'theme', 'lang'];

export function exportProgress() {
  try {
    const data = {};
    for (const k of KEYS) {
      const v = store.get(k);
      if (v != null) data[k] = v;
    }
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch { return ''; }
}

export function importProgress(code) {
  try {
    const data = JSON.parse(decodeURIComponent(atob(String(code).trim())));
    if (typeof data !== 'object' || data == null) return false;
    for (const k of KEYS) {
      if (data[k] != null) store.set(k, data[k]);
    }
    return true;
  } catch { return false; }
}
