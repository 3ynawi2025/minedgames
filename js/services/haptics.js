// اهتزاز الجهاز — حقيقي عبر Capacitor + احتياط للمتصفح (استيراد ديناميكي)
let enabled = true;
export function setHaptics(on) { enabled = on; }

function isNative() {
  if (typeof window === 'undefined') return false;
  const cap = window.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return !!cap.isNativePlatform();
  return cap.platform === 'ios' || cap.platform === 'android';
}

function browserVibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {}
}

// قيم سلسلية مطابقة لإنمات @capacitor/haptics (ImpactStyle / NotificationType)
const EFFECTS = {
  tap:   { style: 'LIGHT',   pattern: 8 },
  match: { style: 'LIGHT',   pattern: [10, 20, 10] },
  combo: { style: 'MEDIUM',  pattern: [12, 18, 12, 18, 12] },
  error: { style: 'MEDIUM',  pattern: [30, 30, 60], type: 'ERROR' },
  win:   { style: 'HEAVY',   pattern: [20, 30, 20, 30, 80], type: 'SUCCESS' },
  lose:  { style: 'MEDIUM',  pattern: [40, 40, 120] },
};

async function run(effect) {
  if (!enabled) return;
  if (isNative()) {
    try {
      const Haptics = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (Haptics && Haptics.impact) {
        await Haptics.impact({ style: effect.style });
        if (effect.type) { try { await Haptics.notification({ type: effect.type }); } catch {} }
        return;
      }
    } catch {}
  }
  browserVibrate(effect.pattern);
}

export const haptic = {
  tap()    { run(EFFECTS.tap); },
  match()  { run(EFFECTS.match); },
  combo()  { run(EFFECTS.combo); },
  error()  { run(EFFECTS.error); },
  win()    { run(EFFECTS.win); },
  lose()   { run(EFFECTS.lose); },
};
