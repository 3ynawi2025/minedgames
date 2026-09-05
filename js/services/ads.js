// ============================================================================
//  ads.js — الغلاف الآمن (MOCK-first) لوحدة الإعلانات AdMob
//  --------------------------------------------------
//  الواجهة المتاحة للمشروع:
//    export function initAds()                // تهيئة AdMob (تُستدعى مرة واحدة)
//    export function showBanner()             // عرض البانر (حقيقي أو وهمي)
//    export function hideBanner()             // إخفاء البانر
//    export function showRewarded()           // Promise<boolean> — إعلان مكافأة
//    export function isMockMode()             // هل نعمل في وضع المحاكاة؟ (للقراءة فقط)
//
//  تصميم دفاعي:
//    - MOCK_MODE = true افتراضيًا. كل شيء يعمل دون الحاجة لأي معرّف إعلاني.
//    - عند عدم وجود منصة Capacitor أصلية (لا window.Capacitor أو منصة web)
//      يتحوّل الوضع تلقائيًا إلى MOCK_MODE.
//    - كل استدعاء لوحدة AdMob محاط بـ try/catch؛ أي فشل يرجع للوضع الوهمي.
//
//  IMPORTANT — معرّفات الوحدات الإعلانية:
//    استبدل القيم أدناه بمعرّفاتك الحقيقية من لوحة تحكّم AdMob:
//      https://console.admob.google.com  >  Ad units
//    بعد الاستبدال، اجعل MOCK_MODE = false (أو اتركه تلقائيًا على الأجهزة الأصلية
//    وسيعمل الفحص الذكي في initAds على تفعيل الإعلانات الحقيقية).
// ============================================================================

// ============ إعدادات (عدّل قبل الاستخدام) ==================================
// الوضع الافتراضي: محاكاة. عند true لا يُستخدم أي إعلان حقيقي.
let MOCK_MODE = true;

// ⚠️ الفترة المجانية: الإعلانات معطّلة مؤقتًا. اجعل القيمة true لإعادة تفعيلها.
const ADS_ENABLED = false;

// هل المنصة Capacitor أصلية؟ (تُحدَّد في initAds)
let IS_NATIVE = false;

// المعرّفات الوهمية — استبدل كلّ حرف REPLACE_ME بمعرّف وحدة AdMob الحقيقي:
//   البانر (Banner)        → 'ca-app-pub-XXXX/banner'
//   المكافأة (Rewarded)    → 'ca-app-pub-XXXX/rewarded'
//   البيني (Interstitial)  → 'ca-app-pub-XXXX/interstitial'
const BANNER_AD_ID       = 'ca-app-pub-6172131457925791/6706045508'; // Banner (iOS)
const REWARDED_AD_ID     = 'ca-app-pub-6172131457925791/7061268729'; // Rewarded (iOS)
const INTERSTITIAL_AD_ID = 'ca-app-pub-REPLACE_ME/interstitial';  // ← استبدل هنا (للإستخدام المستقبلي)

// مرجع المعرّفات (اختياري — لا تستهلكه اللعبة).
const AD_IDS = Object.freeze({
  banner: BANNER_AD_ID,
  rewarded: REWARDED_AD_ID,
  interstitial: INTERSTITIAL_AD_ID,
});

// الكائن الوحيد لوحدة AdMob بعد تحميله (null = غير متاح).
let AdMob = null;

// ---- حالة البانر ----
let mockBannerEl = null;
let realBannerVisible = false;

// ============================================================================
//  دوال داخلية
// ============================================================================

/** هل المنصة هي Capacitor أصلية (iOS/Android)؟ نفحص عبر أكثر من طريقة. */
function detectNativePlatform() {
  try {
    if (typeof window === 'undefined' || !window) return false;
    const cap = window.Capacitor;
    if (!cap) return false;

    // الطريقة المفضّلة (Capacitor >= 3)
    if (typeof cap.isNativePlatform === 'function') {
      try { return !!cap.isNativePlatform(); } catch (_) { /* تجاهل */ }
    }
    if (typeof cap.getPlatform === 'function') {
      try { return cap.getPlatform() !== 'web'; } catch (_) { /* تجاهل */ }
    }
    if (typeof cap.platform === 'string') {
      return cap.platform !== 'web';
    }
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * تحميل الوحدة لاحقًا وبشكل ديناميكي، داخل try/catch.
 * يضمن أن أي فشل في حَلّ المسار (مثل عدم وجود importmap أو bundler) لا يُسقط
 * باقي التطبيق، بل يترك AdMob = null ويعمل الوضع الوهمي.
 */
async function loadPlugin() {
  if (AdMob) return AdMob;
  if (typeof window === 'undefined' || !window) return null; // لا متصفح → لا إعلانات حقيقية

  try {
    const mod = await import('@capacitor-community/admob');
    if (mod && typeof mod.AdMob !== 'undefined') {
      AdMob = mod.AdMob;
      return AdMob;
    }
  } catch (e) {
    // الوحدة غير متاحة أو لم يُربط المسار بعد → نبقى في الوضع الوهمي.
    if (typeof console !== 'undefined') {
      console.warn('[ads] تعذّر تحميل وحدة AdMob — العمل في وضع المحاكاة:', e);
    }
  }
  AdMob = null;
  return null;
}

// ---------------------------------------------------------------------------
//  عنصر البانر الوهمي (Mock Banner)
// ---------------------------------------------------------------------------

/** إنشاء عنصر DOM بمقاس 50px أسفل الشاشة لمحاكاة البانر. */
function showMockBanner() {
  try {
    if (typeof document === 'undefined' || !document.body) return;
    if (!mockBannerEl) {
      mockBannerEl = document.createElement('div');
      mockBannerEl.id = 'bg-mock-banner';
      mockBannerEl.textContent = 'ⓐ Ad · Mock';
      mockBannerEl.setAttribute('aria-hidden', 'true');
      // مقاس 50px أسفل الشاشة، فوق كل المحتوى.
      mockBannerEl.style.cssText =
        'position:fixed;left:0;right:0;bottom:0;height:50px;' +
        'display:flex;align-items:center;justify-content:center;' +
        'background:#1e1e2f;color:#cfd3ff;font:600 12px/1 system-ui,sans-serif;' +
        'letter-spacing:1px;text-align:center;z-index:2147483000;' +
        'border-top:1px solid #2c3153;user-select:none;';
      document.body.appendChild(mockBannerEl);
    }
    mockBannerEl.style.display = 'flex';
  } catch (_) {
    /* تجاهل أي خطأ في DOM */
  }
}

/** إخفاء البانر الوهمي. */
function hideMockBanner() {
  try {
    if (mockBannerEl) mockBannerEl.style.display = 'none';
  } catch (_) { /* تجاهل */ }
}

// ============================================================================
//  الواجهة العامة
// ============================================================================

/**
 * تهيئة AdMob. تُستدعى مرة واحدة عند بدء التطبيق.
 * - خارج المنصات الأصلية → تبقى في MOCK_MODE.
 * - على الأجهزة الأصلية → تحاول تحميل الوحدة واستدعاء initialize؛
 *   أي فشل يُرجع إلى MOCK_MODE كي يستمر اللعب دون انقطاع.
 */
export async function initAds() {
  if (!ADS_ENABLED) { MOCK_MODE = true; return; }
  IS_NATIVE = detectNativePlatform();
  if (!IS_NATIVE) {
    MOCK_MODE = true;
    if (typeof console !== 'undefined') console.info('[ads] منصة غير أصلية — وضع المحاكاة.');
    return;
  }

  const mod = await loadPlugin();
  if (!mod) {
    MOCK_MODE = true;
    return;
  }

  try {
    await mod.initialize({
      initializeForTesting: false,   // اجعل true لتلقّي إعلانات الاختبار أثناء التطوير
      // tagForChildDirectedTreatment: true,  // فعّلها إذا كان التطبيق موجّهًا للأطفال (COPPA)
    });
    MOCK_MODE = false;
    if (typeof console !== 'undefined') console.info('[ads] تم تهيئة AdMob بنجاح.');
  } catch (e) {
    MOCK_MODE = true;
    AdMob = null;
    if (typeof console !== 'undefined') console.warn('[ads] فشل تهيئة AdMob — وضع المحاكاة:', e);
  }
}

/**
 * عرض البانر.
 * - MOCK_MODE → عنصر DOM بسيط (50px أسفل الشاشة).
 * - الوضع الحقيقي → AdMob.showBanner.
 */
export async function showBanner() {
  if (!ADS_ENABLED) return;
  if (MOCK_MODE || !AdMob) {
    showMockBanner();
    return;
  }

  try {
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      position: 'BOTTOM_CENTER',
      adSize: 'ADAPTIVE_BANNER',
      isTesting: false,
      margin: 0,
    });
    realBannerVisible = true;
  } catch (e) {
    realBannerVisible = false;
    if (typeof console !== 'undefined') console.warn('[ads] فشل عرض البانر:', e);
  }
}

/**
 * إخفاء البانر (لا يُدمَّر).
 * - MOCK_MODE → إخفاء العنصر الوهمي.
 * - الوضع الحقيقي → AdMob.hideBanner.
 */
export async function hideBanner() {
  if (MOCK_MODE || !AdMob) {
    hideMockBanner();
    return;
  }

  try {
    await AdMob.hideBanner();
    realBannerVisible = false;
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('[ads] فشل إخفاء البانر:', e);
  }
}

/**
 * عرض إعلان مكافأة (Rewarded) ويعيد Promise<boolean>:
 *   true  → أكمل المستخدم الإعلان واستحق المكافأة.
 *   false → ألغى المستخدم / فشل التحميل أو العرض.
 *
 * ملاحظة جدّ مهمة: على المنصات الأصلية، وعد showRewardVideoAd() لا يُستكمل
 * إلا عندما تتحقّق المكافأة (Reward). إذا أغلق المستخدم الإعلان قبل اكتماله،
 * يُطلق حدث onRewardedVideoAdDismissed لكن الوعد يبقى معلّقًا. لذلك نبني
 * النتيجة من الأحداث (Reward / Dismissed / FailedToShow) مع حماية مهلة زمنية.
 */
export function showRewarded() {
  if (!ADS_ENABLED) return Promise.resolve(true); // مجاني: امنح المكافأة فورًا
  if (MOCK_MODE || !AdMob) {
    // محاكاة إعلان ناجح بعد ~1.5 ثانية.
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1500);
    });
  }
  return showRewardedReal();
}

/**
 * عرض إعلان بيني (Interstitial) عند الانتقالات الطبيعية (إكمال دور/مرحلة).
 * يعيد Promise<boolean> (true عند اكتمال الإعلان أو إغلاقه).
 */
export function showInterstitial() {
  if (!ADS_ENABLED) return Promise.resolve(true);
  if (MOCK_MODE || !AdMob) {
    return new Promise((resolve) => { setTimeout(() => resolve(true), 900); });
  }
  return (async () => {
    try {
      await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID, isTesting: false });
      await AdMob.showInterstitial();
      return true;
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[ads] فشل الإعلان البيني:', e);
      return false;
    }
  })();
}

function showRewardedReal() {
  const plugin = AdMob;
  if (!plugin) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    let handles = [];
    let timer = null;

    const cleanup = () => {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      for (const h of handles) {
        try { h && typeof h.remove === 'function' && h.remove(); } catch (_) {}
      }
      handles = [];
    };

    const settle = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    (async () => {
      try {
        // 1) تحميل الإعلان.
        try {
          await plugin.prepareRewardVideoAd({ adId: REWARDED_AD_ID, isTesting: false });
        } catch (e) {
          settle(false);
          return;
        }

        // 2) الاستماع للأحداث المحدّدة للنتيجة.
        const warn = () => { if (typeof console !== 'undefined') console.warn('[ads] فشل إعلان المكافأة.'); };

        const r = await plugin.addListener('onRewardedVideoAdReward', () => settle(true));
        const d = await plugin.addListener('onRewardedVideoAdDismissed', () => settle(false));
        const f = await plugin.addListener('onRewardedVideoAdFailedToShow', () => { warn(); settle(false); });
        handles = [r, d, f];

        // 3) حماية مهلة زمنية — لا نترك الوعد معلّقًا للأبد.
        timer = setTimeout(() => settle(false), 60000);

        // 4) العرض. لا نعتمد على وعد الإظهار لأنه قد يبقى معلّقًا عند الإلغاء.
        try {
          plugin.showRewardVideoAd().then(
            () => settle(true),   // المكافأة تحقّقت عبر الوعد أيضًا
            () => settle(false)   // فشل الإظهار
          ).catch(warn);
        } catch (e) {
          warn();
          settle(false);
        }
      } catch (e) {
        settle(false);
      }
    })();
  });
}

/** هل نعمل في وضع المحاكاة؟ (قراءة فقط — مفيد لواجهة اللعبة). */
export function isMockMode() {
  return MOCK_MODE;
}

export function isAdsEnabled() {
  return ADS_ENABLED;
}

// تصدير مرجعي للمعرّفات (اختياري).
export const AD_IDS_FINAL = AD_IDS;
