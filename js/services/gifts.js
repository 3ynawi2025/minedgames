// gifts.js — هدايا المدير لجميع اللاعبين (عبر Supabase)
// المدير يرسل هدية (عملات + رسالة) من إعدادات التطبيق؛ اللاعبون يستلمونها عند الفتح.
import { store, addCoins } from './storage.js';

const SUPABASE_URL = 'https://rhibzsbgqtznnuifsydy.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaWJ6c2JncXR6bm51aWZzeWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NTAyMDIsImV4cCI6MjEwMzUyNjIwMn0.ho5315herJXI_X-FANWuIZEojWVYs4P9fLbk52fR8xA';

const HEADERS = {
  'apikey': SUPABASE_ANON,
  'Authorization': 'Bearer ' + SUPABASE_ANON,
};

// تحقق من أحدث هدية نشطة؛ إن لم يسبق استلامها على هذا الجهاز → تُمنح وتُسجَّل.
// يعيد كائن الهدية {id, coins, message, sender} عند المنح، أو null.
export async function checkGift() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/gifts?active=eq.true&order=created_at.desc&limit=1',
      { headers: HEADERS, signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const arr = await res.json();
    const gift = arr && arr[0];
    if (!gift || gift.coins == null) return null;
    const claimed = store.get('giftClaimed', 0);
    if (claimed >= (gift.id || 0)) return null;
    addCoins(gift.coins);
    store.set('giftClaimed', gift.id || 0);
    return { id: gift.id, coins: gift.coins, message: gift.message || 'هدية من sss', sender: gift.sender || 'sss' };
  } catch { return null; }
}

// إنشاء هدية جديدة (يتحقق السيرفر من كلمة سر المدير). يرمي خطأً عند فشل المصادقة.
export async function createGift(adminKey, coins, message) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/create_gift', {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ p_admin_key: adminKey, p_coins: Number(coins), p_message: message || 'هدية من sss' }),
    });
    if (!res.ok) {
      let msg = 'فشل إرسال الهدية';
      try { const e = await res.json(); msg = e.message || msg; } catch {}
      throw new Error(msg);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
