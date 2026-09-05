// 2048 — لعبة دمج الأرقام (شبكة 4×4): انزلق وادمج الأرقام المتطابقة للوصول إلى 2048
import { t, getLang } from '../services/i18n.js';
import { confetti, resultCard, toast } from '../shared/fx.js';
import { sfx } from '../services/audio.js';
import { haptic } from '../services/haptics.js';
import { showInterstitial } from '../services/ads.js';

// نص ثنائي اللغة (عربي/إنجليزي)
const L = (ar, en) => getLang() === 'en' ? en : ar;

const SIZE = 4;          // شبكة 4×4
const TARGET = 2048;     // هدف الفوز
const SWIPE_THRESHOLD = 28; // الحد الأدنى لانزلاق الإيماء

// ألوان الخلايا (2 فاتح ← 2048 ذهبي متوهج) — معرّفة inline في JS
const TILE_COLORS = {
  2:    { bg: 'linear-gradient(135deg,#FFB4A6,#F2705A)', fg: '#400200', glow: 0 },
  4:    { bg: 'linear-gradient(135deg,#F2705A,#A73928)', fg: '#FFFFFF', glow: 0 },
  8:    { bg: 'linear-gradient(135deg,#FF6FA5,#EC4899)', fg: '#FFFFFF', glow: 0 },
  16:   { bg: 'linear-gradient(135deg,#B48CFF,#8455EF)', fg: '#FFFFFF', glow: 0 },
  32:   { bg: 'linear-gradient(135deg,#8455EF,#6B38D4)', fg: '#FFFFFF', glow: 0 },
  64:   { bg: 'linear-gradient(135deg,#D0BCFF,#5516BE)', fg: '#FFFFFF', glow: 0 },
  128:  { bg: 'linear-gradient(135deg,#7B9CFF,#23005C)', fg: '#FFFFFF', glow: 1 },
  256:  { bg: 'linear-gradient(135deg,#7B9CFF,#23005C)', fg: '#FFFFFF', glow: 1 },
  512:  { bg: 'linear-gradient(135deg,#8B5CF6,#45018A)', fg: '#FFFFFF', glow: 1 },
  1024: { bg: 'linear-gradient(135deg,#9B7BFF,#3A1A6E)', fg: '#FFFFFF', glow: 2 },
  2048: { bg: 'linear-gradient(135deg,#B48CFF,#23005C)', fg: '#FFFFFF', glow: 3 },
};

// ---- منطق النواة (نقي — سهل الاختبار) ----
// انزلاق صف نحو البداية مع دمج كل خلية مرة واحدة فقط لكل حركة
function slideLine(line) {
  const nz = line.filter(v => v !== 0);
  const out = [];
  const mergedIdx = [];
  let gained = 0;
  for (let i = 0; i < nz.length; i++) {
    if (i + 1 < nz.length && nz[i] === nz[i + 1]) {
      const merged = nz[i] * 2;
      mergedIdx.push(out.length);
      out.push(merged);
      gained += merged;
      i++; // تخطَّ الخلية المدمجة (لا تُدمج مرتين)
    } else {
      out.push(nz[i]);
    }
  }
  while (out.length < SIZE) out.push(0);
  const moved = out.some((v, idx) => v !== line[idx]);
  return { line: out, gained, mergedIdx, moved };
}

export const merge2048Module = {
  id: 'merge2048',
  name: '2048 Merge',
  nameAr: 'دمج الأرقام',
  desc: 'ادمج الأرقام المتطابقة وصولًا إلى 2048',
  gradient: ['#F7B33B', '#EC4899'], // تدرّج ذهبي→وردي للأيقونة
  sortOrder: 3,
  capabilities: { dailyChallenge: false, hints: false, timer: false, leaderboard: true },
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2.4"/><rect x="13" y="3" width="8" height="8" rx="2.4"/><rect x="3" y="13" width="8" height="8" rx="2.4"/><rect x="13" y="13" width="8" height="8" rx="2.4"/></svg>',

  mount(container, ctx) {
    let grid = [];
    let score = 0;
    let best = ctx.bestScore ? ctx.bestScore('merge2048') || 0 : 0;
    let wonShown = false;
    let gameOver = false;
    let entryAnim = true;

    const rootEl = document.createElement('div');
    rootEl.className = 'game-screen game-2048';

    // HUD: النتيجة + الأفضل + أفضل خانة
    const hud = document.createElement('div');
    hud.className = 'hud';
    const hudScore = document.createElement('div'); hudScore.className = 'box';
    const hudBest = document.createElement('div'); hudBest.className = 'box';
    const hudTile = document.createElement('div'); hudTile.className = 'box';
    [hudScore, hudBest, hudTile].forEach(b => hud.appendChild(b));

    // اللوحة
    const wrap = document.createElement('div');
    wrap.className = 'board-wrap';
    const board = document.createElement('div');
    board.className = 'board';
    board.dataset.game = '2048';
    board.style.gridTemplateColumns = 'repeat(' + SIZE + ', 1fr)';
    board.style.direction = 'ltr';
    board.style.touchAction = 'none'; // منع تمرير الصفحة أثناء السحب
    wrap.appendChild(board);

    // شريط الأدوات: «جديد» + أسهم الاتجاهات
    const bar = document.createElement('div');
    bar.className = 'toolbar';

    const btnNew = document.createElement('button');
    btnNew.className = 'btn btn-primary';
    btnNew.innerHTML = '<span class="material-symbols-outlined">add_box</span><span>' + t('nm.new') + '</span>';
    btnNew.style.flexBasis = '100%';
    btnNew.addEventListener('click', () => reset());
    bar.appendChild(btnNew);

    const dpad = document.createElement('div');
    dpad.style.cssText = 'display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,52px);gap:8px;justify-content:center;';
    const arrowStyle = 'padding:0;min-height:0;width:52px;height:52px;font-size:22px;border-radius:16px;flex:none;font-family:var(--font-head);';
    function mkArrow(label, dir, col, row) {
      const b = document.createElement('button');
      b.className = 'btn btn-ghost';
      b.style.cssText = arrowStyle;
      b.style.gridColumn = col;
      b.style.gridRow = row;
      b.textContent = label;
      b.setAttribute('aria-label', dir);
      b.addEventListener('click', () => doMove(dir));
      dpad.appendChild(b);
    }
    mkArrow('↑', 'up', 2, 1);
    mkArrow('←', 'left', 1, 2);
    mkArrow('↓', 'down', 2, 2);
    mkArrow('→', 'right', 3, 2);
    bar.appendChild(dpad);

    rootEl.append(hud, wrap, bar);
    container.appendChild(rootEl);

    function cellSize() {
      const w = wrap.clientWidth;
      return Math.max(26, Math.floor((w - 26 - (SIZE - 1) * 6) / SIZE));
    }

    function tileFont(v) {
      const s = cellSize();
      if (v >= 1024) return Math.round(s * 0.32) + 'px';
      if (v >= 128) return Math.round(s * 0.40) + 'px';
      return Math.round(s * 0.52) + 'px';
    }

    function render() {
      board.innerHTML = '';
      const cs = cellSize();
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const cell = document.createElement('div');
          cell.className = 'cell';
          cell.style.aspectRatio = '1';
          if (entryAnim) { cell.classList.add('enter'); cell.style.animationDelay = ((r * SIZE + c) * 24) + 'ms'; }
          const v = grid[r][c];
          if (v === 0) {
            cell.style.background = 'transparent';
            cell.style.borderColor = 'transparent';
            cell.style.boxShadow = 'none';
            cell.style.pointerEvents = 'none';
          } else {
            const col = TILE_COLORS[v] || { bg: '#EDC22E', fg: '#FFFFFF', glow: 3 };
            cell.style.background = col.bg;
            cell.style.color = col.fg;
            cell.style.fontSize = tileFont(v);
            if (col.glow > 0) {
              cell.style.boxShadow = '0 0 ' + (col.glow * 4 + 8) + 'px ' + (col.glow * 2 + 3) + 'px rgba(237,194,46,.' + Math.min(0.85, 0.25 + col.glow * 0.2) + ')';
            }
            cell.textContent = v;
          }
          cell.dataset.idx = (r * SIZE + c);
          board.appendChild(cell);
        }
      }
      entryAnim = false;
      updateHud();
    }

    function updateHud() {
      hudScore.innerHTML = '<div class="v">' + score + '</div><div class="k">' + t('nm.score') + '</div>';
      hudBest.innerHTML = '<div class="v">' + best + '</div><div class="k">' + t('nm.best') + '</div>';
      hudTile.innerHTML = '<div class="v">' + maxTile() + '</div><div class="k">' + L('أفضل خانة', 'Best Tile') + '</div>';
    }

    function maxTile() {
      let m = 0;
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] > m) m = grid[r][c];
      return m;
    }

    function newBoard() {
      const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
      let placed = 0;
      while (placed < 2) {
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        if (g[r][c] === 0) { g[r][c] = Math.random() < 0.9 ? 2 : 4; placed++; }
      }
      return g;
    }

    function spawnTile() {
      const empty = [];
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === 0) empty.push({ r, c });
      if (!empty.length) return null;
      const p = empty[Math.floor(Math.random() * empty.length)];
      grid[p.r][p.c] = Math.random() < 0.9 ? 2 : 4;
      return p;
    }

    function applyMove(dir) {
      let moved = false, gained = 0;
      const mergedCells = [];
      for (let i = 0; i < SIZE; i++) {
        let cells = [];
        if (dir === 'left' || dir === 'right') {
          for (let j = 0; j < SIZE; j++) cells.push({ r: i, c: j });
          if (dir === 'right') cells.reverse();
        } else {
          for (let j = 0; j < SIZE; j++) cells.push({ r: j, c: i });
          if (dir === 'down') cells.reverse();
        }
        const line = cells.map(p => grid[p.r][p.c]);
        const res = slideLine(line);
        if (res.moved) {
          moved = true;
          gained += res.gained;
          cells.forEach((p, idx) => {
            grid[p.r][p.c] = res.line[idx];
            if (res.mergedIdx.includes(idx)) mergedCells.push(p);
          });
        }
      }
      return { moved, gained, mergedCells };
    }

    function doMove(dir) {
      if (gameOver) return;
      const { moved, gained, mergedCells } = applyMove(dir);
      if (!moved) return; // لا حركة حقيقية → لا نقبلها
      score += gained;
      if (gained > 0) { sfx.match(); haptic.match(); } else { sfx.tap(); haptic.tap(); }
      const spawned = spawnTile();
      best = Math.max(best, score);
      render();
      // تحريك بعد إعادة الرسم
      const tiles = board.querySelectorAll('.cell');
      mergedCells.forEach(p => { const el = tiles[p.r * SIZE + p.c]; if (el) el.classList.add('pop'); });
      if (spawned) { const el = tiles[spawned.r * SIZE + spawned.c]; if (el) { el.classList.remove('pop'); el.classList.add('pop'); } }
      checkEnd();
    }

    function hasMoves() {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          const v = grid[r][c];
          if (v === 0) return true;
          if (c + 1 < SIZE && grid[r][c + 1] === v) return true;
          if (r + 1 < SIZE && grid[r + 1][c] === v) return true;
        }
      }
      return false;
    }

    function checkEnd() {
      let reached = false;
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (grid[r][c] === TARGET) reached = true;
      if (reached && !wonShown) { win(); return; }
      if (!hasMoves()) lose();
    }

    function win() {
      wonShown = true;
      sfx.win(); haptic.win(); confetti(120);
      const isRec = ctx.submitScore('merge2048', score);
      ctx.addXp(40);
      const reward = ctx.rewardWin();
      best = Math.max(best, score);
      toast('🪙 +20 فوز');
      if (reward.rankUp) toast('🏆 ترقية! +50');
      resultCard({
        emoji: '🏆',
        title: L('وصلت إلى 2048!', 'You reached 2048!'),
        score: score + ' نقطة',
        note: (isRec ? '🎉 ' + L('رقم قياسي!', 'New record!') + ' ' : '') + L('يمكنك المتابعة لبناء أرقام أكبر', 'Keep going to build even bigger numbers'),
        buttons: [
          { label: L('المتابعة', 'Continue'), onClick: () => { if (!hasMoves()) lose(); } },
          { label: L('لعبة جديدة', 'New Game'), onClick: () => { showInterstitial().then(() => reset()); } },
          { label: t('nm.backLobby'), kind: 'btn-ghost', onClick: ctx.goBack },
        ],
      });
    }

    function lose() {
      gameOver = true;
      sfx.lose(); haptic.lose();
      const isRec = ctx.submitScore('merge2048', score);
      ctx.addXp(10);
      best = Math.max(best, score);
      resultCard({
        emoji: '💪',
        title: L('لا توجد حركات!', 'No moves left!'),
        score: score + ' نقطة',
        note: L('أفضل خانة: ', 'Best tile: ') + maxTile() + (isRec ? ' · 🎉 ' + L('رقم قياسي!', 'New record!') : ''),
        buttons: [
          { label: L('إعادة المحاولة', 'Retry'), onClick: reset },
          { label: t('nm.backLobby'), kind: 'btn-ghost', onClick: ctx.goBack },
        ],
      });
    }

    function reset() {
      grid = newBoard();
      score = 0;
      wonShown = false;
      gameOver = false;
      entryAnim = true;
      if (ctx.resetHints) ctx.resetHints();
      render();
    }

    // ---- الإدخال: سحب باللمس + مفاتيح الأسهم ----
    let touchStart = null;
    function onTouchStart(e) {
      if (gameOver) return;
      const t0 = e.changedTouches[0];
      touchStart = { x: t0.clientX, y: t0.clientY };
    }
    function onTouchEnd(e) {
      if (!touchStart || gameOver) return;
      const t0 = e.changedTouches[0];
      const dx = t0.clientX - touchStart.x;
      const dy = t0.clientY - touchStart.y;
      touchStart = null;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < SWIPE_THRESHOLD) return;
      if (ax > ay) doMove(dx > 0 ? 'right' : 'left');
      else doMove(dy > 0 ? 'down' : 'up');
    }
    board.addEventListener('touchstart', onTouchStart, { passive: true });
    board.addEventListener('touchend', onTouchEnd, { passive: true });

    function onKey(e) {
      let dir = null;
      if (e.key === 'ArrowLeft') dir = 'left';
      else if (e.key === 'ArrowRight') dir = 'right';
      else if (e.key === 'ArrowUp') dir = 'up';
      else if (e.key === 'ArrowDown') dir = 'down';
      if (dir) { e.preventDefault(); doMove(dir); }
    }
    window.addEventListener('keydown', onKey);

    reset();

    return {
      destroy() {
        window.removeEventListener('keydown', onKey);
        board.removeEventListener('touchstart', onTouchStart);
        board.removeEventListener('touchend', onTouchEnd);
        rootEl.remove();
      },
    };
  },
};
