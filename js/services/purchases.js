// purchases.js — خدمة الشراء داخل التطبيق (IAP) عبر cordova-plugin-purchase
// يُنفَّذ عبر المكوّن العام window.CdvPurchase (المشروع بلا bundler، لذا لا نستورد bare-specifier).
// ملاحظة: cordova-plugin-purchase v13 يُسجّل نطاقين عامين: window.CdvPurchase (الفعّال) و window.store.
// نستخدم window.CdvPurchase لأن window.store يُترك كنائب كائن فارغ في v13.
import { store, addCoins } from './storage.js';
import { toast } from '../shared/fx.js';
import { t } from './i18n.js';

/* ---- تعريف المنتجات (تُطابق أرقام آبل في App Store Connect) ---- */
export const PRODUCTS = [
  { id: 'com.salemalyahyaee.mined.and.puzzle.game.coins_5000',  qty: 5000,  fallbackPrice: '$0.99', best: false },
  { id: 'com.salemalyahyaee.mined.and.puzzle.game.coins_20000', qty: 20000, fallbackPrice: '$2.99', best: true  },
];
const PRODUCT_BY_ID = PRODUCTS.reduce((m, p) => (m[p.id] = p, m), {});

/* ---- حالة الخدمة ---- */
let Cdv = null;          // نطاق المكوّن العام (CdvPurchase)
let storeRef = null;     // الكائن store (CdvPurchase.store)
let initialized = false; // هل بدأنا/أكملنا التهيئة؟
let ready = false;       // هل المنتجات جاهزة؟
let initStarted = false; // منع تكرار التهيئة
let noNativeLogged = false; // منع تكرار رسالة غياب المنصة
const GRANT_KEY = 'grantedIapTransactions'; // منع منح العملات مرتين لنفس المعاملة

const productUpdatedCbs = []; // استدعاءات عند تحديث أسعار/بيانات المنتجات
const purchasedCbs = [];       // استدعاءات عند منح عملات (qty)

/* ---- الوصول للمكوّن العام (بدون import) ---- */
function getCdv() {
  if (Cdv) return Cdv;
  try {
    if (typeof window === 'undefined' || !window) return null;
    // المفضّل: cordova-plugin-purchase v13 يسجّل window.CdvPurchase (النطاق الفعّال)
    if (window.CdvPurchase && typeof window.CdvPurchase.store === 'object') {
      Cdv = window.CdvPurchase;
      return Cdv;
    }
  } catch (_) { /* تجاهل */ }
  return null;
}

function getStore() {
  if (storeRef) return storeRef;
  const cdv = getCdv();
  if (cdv && cdv.store) {
    storeRef = cdv.store;
    return storeRef;
  }
  // نسخ قديمة: window.store نفسه
  if (window && window.store && typeof window.store.register === 'function') {
    storeRef = window.store;
    return storeRef;
  }
  return null;
}

/* ---- API عام ---- */
export function isAvailable() {
  const s = getStore();
  return !!s && initialized;
}

/** هل توجد منصة أصلية (window.CdvPurchase)؟ نعم حتى لو لم تكتمل تهيئة المتجر بعد. */
export function hasNative() {
  return !!getCdv();
}

export function getProduct(id) { return PRODUCT_BY_ID[id] || null; }
export function getProductList() { return PRODUCTS; }

/** السعر المُعروض: السعر المحلي المُجلب من المتجر، أو السعر الافتراضي. */
export function getPrice(id) {
  const s = getStore();
  if (s && typeof s.get === 'function') {
    try {
      const p = s.get(id);
      if (p && p.pricing && p.pricing.price) return p.pricing.price;
    } catch (_) { /* تجاهل */ }
  }
  const def = PRODUCT_BY_ID[id];
  return def ? def.fallbackPrice : '';
}

export function onProductsUpdated(cb) { if (typeof cb === 'function') productUpdatedCbs.push(cb); }
export function onPurchaseGranted(cb) { if (typeof cb === 'function') purchasedCbs.push(cb); }

/* ---- منح العملات (مرة واحدة لكل معاملة) ---- */
function grantedSet() {
  return new Set(store.get(GRANT_KEY, []));
}
function grantCoins(productId, qty, txId) {
  if (!txId) { addCoins(qty); fireGranted(qty); return; }
  const set = grantedSet();
  if (set.has(txId)) return; // سبق منحه
  set.add(txId);
  try { store.set(GRANT_KEY, Array.from(set)); } catch (_) { /* تجاهل */ }
  addCoins(qty);
  fireGranted(qty);
}
function fireGranted(qty) {
  toast('+ ' + qty + ' ' + t('store.coins') + ' ' + t('store.added'));
  purchasedCbs.forEach(cb => { try { cb(qty); } catch (_) { /* تجاهل */ } });
}

/* ---- معالجة الموافقة على الشراء (consumable بلا تحقق خادم) ---- */
function onApproved(transaction) {
  // منح العملات لكل منتج (المعاملة الاستهلاكية consumable)
  const products = (transaction && transaction.products) || [];
  for (const p of products) {
    const def = PRODUCT_BY_ID[p.id];
    if (!def) continue;
    try { grantCoins(def.id, def.qty, transaction.transactionId); }
    catch (e) { console.warn('[purchases] grant error:', e); }
  }
  // إنهاء المعاملة دائمًا (لا يوجد خادم تحقق → finish مباشرة)
  // منفصل في try حتى لا يمنع أي خطأ في واجهة المستخدم إتمام المعاملة.
  try {
    if (transaction && typeof transaction.finish === 'function') {
      Promise.resolve(transaction.finish()).catch(() => {});
    }
  } catch (e) {
    console.warn('[purchases] finish error:', e);
  }
}

/* ---- تهيئة المتجر (تُستدعى مرة واحدة) ---- */
export function initPurchases() {
  if (initStarted) return;
  initStarted = true;
  if (tryInitStore()) return;
  // قد لا يكون window.CdvPurchase متاحًا بعد فورًا: cordova-plugin-purchase يُنشئ النطاق
  // عبر setTimeout(0) بعد تحميل cordova. نعيد المحاولة حتى يظهر (أو حتى نتأكد غيابه).
  let tries = 0;
  const retry = () => {
    if (tryInitStore()) return;
    if (++tries < 10) setTimeout(retry, 150);
  };
  setTimeout(retry, 150);
}

// تنفيذ التهيئة الفعلية؛ يعيد true إذا وجد منصة أصلية وبدأ التهيئة.
function tryInitStore() {
  const cdv = getCdv();
  const s = getStore();
  if (!cdv || !s || !cdv.ProductType || !cdv.Platform) {
    // لا منصة أصلية (متصفح/ويب) → نبقى بأمان بدون تهيئة
    if (!noNativeLogged) { noNativeLogged = true; console.info('[purchases] لا توجد منصة أصلية — تعطيل الشراء الحقيقي'); }
    return false;
  }

  const CONSUMABLE = cdv.ProductType.CONSUMABLE;
  const APPLE = cdv.Platform.APPLE_APPSTORE;

  // تسجيل المنتجات
  try {
    PRODUCTS.forEach(p => s.register({ id: p.id, type: CONSUMABLE, platform: APPLE }));
  } catch (e) {
    console.warn('[purchases] register error:', e);
    return true; // منصة موجودة؛ لا نعيد المحاولة
  }

  // أحداث المتجر
  try {
    s.when()
      .productUpdated(() => {
        if (!ready) { ready = true; }
        productUpdatedCbs.forEach(cb => { try { cb(); } catch (_) { /* تجاهل */ } });
      })
      .approved(onApproved)
      .error(err => console.warn('[purchases] error:', err));
  } catch (e) {
    console.warn('[purchases] when() error:', e);
  }

  // جاهزية المنتجات
  try { s.ready(() => { ready = true; }); } catch (_) { /* تجاهل */ }

  // تهيئة منصة آبل (غير متزامن؛ لا نمنع المحاولات الأخرى)
  (async () => {
    try {
      await s.initialize([APPLE]);
      initialized = true;
      console.info('[purchases] تمت تهيئة متجر الشراء');
      productUpdatedCbs.forEach(cb => { try { cb(); } catch (_) { /* تجاهل */ } });
    } catch (e) {
      console.warn('[purchases] initialize error:', e);
    }
  })();

  return true;
}

/* ---- شراء مجموعة (يبدأ عملية الشراء) ---- */
export function buyPack(productId) {
  return new Promise((resolve) => {
    const s = getStore();
    if (!s || !initialized || !ready) {
      resolve({ ok: false, reason: 'unavailable' });
      return;
    }
    let product = null;
    try { product = s.get(productId); } catch (_) { /* تجاهل */ }
    if (!product) {
      console.warn('[purchases] product not loaded:', productId);
      resolve({ ok: false, reason: 'not-found' });
      return;
    }
    const offer = typeof product.getOffer === 'function' ? product.getOffer() : null;
    if (!offer || typeof offer.order !== 'function') {
      resolve({ ok: false, reason: 'not-found' });
      return;
    }
    Promise.resolve(offer.order())
      .then((err) => {
        if (err && err.code === cdv().ErrorCode.PAYMENT_CANCELLED) {
          resolve({ ok: false, reason: 'cancelled' });
        } else if (err) {
          resolve({ ok: false, reason: 'failed', error: err });
        } else {
          resolve({ ok: true });
        }
      })
      .catch((e) => resolve({ ok: false, reason: 'failed', error: e }));
  });
}

// مساعد للوصول إلى نطاق CdvPurchase أثناء الشراء
function cdv() { return getCdv() || {}; }
