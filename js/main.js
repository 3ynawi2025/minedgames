// main.js — Bootstrap: تسجيل الألعاب + تهيئة الحالة + تشغيل المحور
import { init, registerModules, toast } from './app.js';
import { mountAdBanner, renderLobby } from './ui.js';
import { numberMatchModule } from './games/number-match.js';
import { sudokuModule } from './games/sudoku.js';
import { merge2048Module } from './games/merge2048.js';
import { initPurchases } from './services/purchases.js';
import { checkGift } from './services/gifts.js';

registerModules([numberMatchModule, sudokuModule, merge2048Module]);
init();
initPurchases();
mountAdBanner();
renderLobby();

// 🎁 هدايا المدير: تحقق من أحدث هدية، وعند وجودها أظهرها وحدّث الرصيد
checkGift().then(gift => {
  if (gift) {
    toast('🎁 ' + gift.message + ' — +' + gift.coins + ' 🪙');
    renderLobby();
  }
});
