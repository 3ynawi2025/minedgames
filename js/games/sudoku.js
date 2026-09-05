// Sudoku — لعبة سودوكو (مراحل 1..1000 تصعّب تدريجيًا)
import { dailySeed } from '../services/storage.js';
import { toast, confetti, resultCard } from '../shared/fx.js';
import { sfx } from '../services/audio.js';
import { haptic } from '../services/haptics.js';
import { t } from '../services/i18n.js';
import { showInterstitial } from '../services/ads.js';

const N = 9;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isValid(board, r, c, n) {
  for (let i = 0; i < N; i++) {
    if (board[r][i] === n) return false;
    if (board[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
  for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) if (board[i][j] === n) return false;
  return true;
}

function findEmpty(board) {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] === 0) return [r, c];
  return null;
}

function findBestEmpty(board) {
  let best = null, bestCand = 10;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (board[r][c] === 0) {
      let cnt = 0;
      for (let n = 1; n <= N; n++) if (isValid(board, r, c, n)) cnt++;
      if (cnt < bestCand) { bestCand = cnt; best = [r, c]; if (cnt === 0) return [r, c]; }
    }
  }
  return best;
}

function generateSolved(rng) {
  const board = Array.from({ length: N }, () => Array(N).fill(0));
  function fill() {
    const e = findEmpty(board);
    if (!e) return true;
    const [r, c] = e;
    for (const n of shuffle([1,2,3,4,5,6,7,8,9], rng)) {
      if (isValid(board, r, c, n)) {
        board[r][c] = n;
        if (fill()) return true;
        board[r][c] = 0;
      }
    }
    return false;
  }
  fill();
  return board;
}

function countSolutions(puzzle, limit) {
  const board = puzzle.map(r => r.slice());
  let count = 0;
  function bt() {
    if (count >= limit) return;
    const e = findBestEmpty(board);
    if (!e) { count++; return; }
    const [r, c] = e;
    for (let n = 1; n <= N; n++) {
      if (isValid(board, r, c, n)) {
        board[r][c] = n;
        bt();
        board[r][c] = 0;
        if (count >= limit) return;
      }
    }
  }
  bt();
  return count;
}

// عدد الخلايا المحذوفة حسب المرحلة (تصعّب تدريجي)
function removalsForLevel(lvl) {
  return Math.min(58, 38 + Math.floor((lvl - 1) / 25));
}
function diffName(rem) {
  if (rem <= 40) return 'سهل';
  if (rem <= 46) return 'متوسط';
  if (rem <= 52) return 'صعب';
  return 'خبير';
}

function makePuzzle(solved, removals, rng) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const puzzle = solved.map(r => r.slice());
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
    const order = shuffle(cells, rng);
    let removed = 0;
    for (const [r, c] of order) {
      if (removed >= removals) break;
      const [mr, mc] = [N - 1 - r, N - 1 - c];
      const b1 = puzzle[r][c], b2 = puzzle[mr][mc];
      puzzle[r][c] = 0; puzzle[mr][mc] = 0;
      if (countSolutions(puzzle, 2) === 1) { removed += 2; }
      else { puzzle[r][c] = b1; puzzle[mr][mc] = b2; }
    }
    return puzzle;
  }
  return solved.map(r => r.slice());
}

export const sudokuModule = {
  id: 'sudoku',
  name: 'Sudoku',
  nameAr: 'سودوكو',
  desc: 'املأ الشبكة بالأرقام 1-9 دون تكرار',
  gradient: ['#4FA3E8', '#8B5CF6'],
  sortOrder: 2,
  capabilities: { dailyChallenge: true, hints: true, timer: true, leaderboard: true },
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>',

  mount(container, ctx) {
    const isDaily = ctx.isDaily ? ctx.isDaily() : false;
    const rng = isDaily ? mulberry32(dailySeed('sudoku')) : Math.random;
    let lvl = ctx.level || 1;

    const solved = generateSolved(rng);
    let puzzle = makePuzzle(solved, removalsForLevel(lvl), rng);
    const given = puzzle.map(r => r.map(v => v !== 0));
    const board = puzzle.map(r => r.slice());
    const notes = Array.from({ length: N }, () => Array.from({ length: N }, () => new Set()));
    let selected = null;
    let noteMode = false;
    let mistakes = 0;
    let seconds = 0;
    let timerId = null;
    let history = [];
    let gameOver = false;
    if (ctx.resetHints) ctx.resetHints();

    const rootEl = document.createElement('div');
    rootEl.className = 'game-screen';

    // HUD (وقت/أخطاء/مرحلة)
    const hud = document.createElement('div');
    hud.className = 'hud';
    const hudTime = document.createElement('div'); hudTime.className = 'box';
    const hudErr = document.createElement('div'); hudErr.className = 'box';
    const hudLevel = document.createElement('div'); hudLevel.className = 'box';
    [hudTime, hudErr, hudLevel].forEach(b => hud.appendChild(b));

    // اللوحة
    const wrap = document.createElement('div');
    wrap.className = 'board-wrap';
    const grid = document.createElement('div');
    grid.className = 's-grid';
    wrap.appendChild(grid);

    // منتقي أرقام
    const pad = document.createElement('div');
    pad.className = 'numpad';
    pad.style.direction = 'ltr';
    for (let n = 1; n <= 9; n++) {
      const b = document.createElement('button');
      b.textContent = n;
      b.addEventListener('click', () => inputDigit(n));
      pad.appendChild(b);
    }

    // شريط أدوات
    const bar = document.createElement('div');
    bar.className = 'toolbar';
    function mkBtn(label, act, kind, icon) {
      const b = document.createElement('button');
      b.className = 'btn ' + (kind || 'btn-ghost');
      b.innerHTML = '<span class="material-symbols-outlined">' + (icon || '') + '</span><span>' + label + '</span>';
      b.addEventListener('click', () => actions[act]());
      bar.appendChild(b);
      return b;
    }
    const btnNotes = mkBtn(t('sd.pencil'), 'notes', 'btn-ghost', 'edit');
    const btnErase = mkBtn(t('sd.erase'), 'erase', 'btn-ghost', 'ink_eraser');
    const btnUndo = mkBtn(t('nm.undo'), 'undo', 'btn-ghost', 'undo');
    const btnHint = mkBtn(t('nm.hint'), 'hint', 'btn-ghost', 'lightbulb');
    const btnNew = mkBtn(t('nm.new'), 'new', 'btn-ghost', 'restart_alt');

    rootEl.append(hud, wrap, pad, bar);
    container.appendChild(rootEl);

    function startTimer() {
      clearInterval(timerId);
      timerId = setInterval(() => { seconds++; updateHud(); }, 1000);
    }

    function updateHud() {
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      hudTime.innerHTML = '<div class="v">' + m + ':' + s + '</div><div class="k">' + t('sd.time') + '</div>';
      hudErr.innerHTML = '<div class="v">' + mistakes + '/3</div><div class="k">' + t('sd.mistakes') + '</div>';
      hudLevel.innerHTML = '<div class="v">' + lvl + '</div><div class="k">' + t('sd.level') + ' · ' + diffName(removalsForLevel(lvl)) + '</div>';
    }

    function render() {
      grid.innerHTML = '';
      const w = wrap.clientWidth;
      const cs = Math.floor((w - 4) / 9);
      grid.style.setProperty('--cell-fs', Math.round(cs * 0.46) + 'px');
      const sr = selected ? selected.r : -1, sc = selected ? selected.c : -1;
      const selVal = selected ? board[selected.r][selected.c] : 0;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const cell = document.createElement('button');
          cell.className = 'cell';
          cell.style.aspectRatio = '1';
          cell.style.border = '0.5px solid var(--surface-edge)';
          if (c % 3 === 0) cell.style.borderLeft = '2px solid var(--text)';
          if (r % 3 === 0) cell.style.borderTop = '2px solid var(--text)';
          if (c === 8) cell.style.borderRight = '2px solid var(--text)';
          if (r === 8) cell.style.borderBottom = '2px solid var(--text)';

          const v = board[r][c];
          if (v !== 0) {
            cell.textContent = v;
            cell.classList.add(given[r][c] ? 'given' : 'entered');
            if (!given[r][c] && v !== solved[r][c]) cell.classList.add('error');
          } else if (notes[r][c].size) {
            const nd = document.createElement('div');
            nd.className = 'notes';
            for (let n = 1; n <= 9; n++) {
              const sp = document.createElement('span');
              sp.textContent = n;
              if (notes[r][c].has(n)) sp.classList.add('on');
              nd.appendChild(sp);
            }
            cell.appendChild(nd);
          }
          if (r === sr && c === sc) cell.classList.add('selected');
          else if (selVal && v !== 0 && v === selVal) cell.classList.add('hl');
          else if (sr >= 0 && (r === sr || c === sc || (Math.floor(r/3)===Math.floor(sr/3) && Math.floor(c/3)===Math.floor(sc/3)))) cell.classList.add('hl-box');
          cell.addEventListener('click', () => onCellTap(r, c));
          grid.appendChild(cell);
        }
      }
      updateHud();
      updateHintLabel();
    }

    function onCellTap(r, c) {
      if (gameOver) return;
      sfx.tap(); haptic.tap();
      selected = { r, c };
      render();
    }

    function inputDigit(n) {
      if (gameOver || !selected) { if (!selected) toast('اختر خانة أولًا'); return; }
      const { r, c } = selected;
      if (given[r][c]) return;
      if (noteMode) {
        if (board[r][c] === 0) {
          history.push({ r, c, prevDigit: 0, prevNotes: new Set(notes[r][c]) });
          if (notes[r][c].has(n)) notes[r][c].delete(n); else notes[r][c].add(n);
          sfx.tap();
          render();
        }
        return;
      }
      const prevDigit = board[r][c];
      history.push({ r, c, prevDigit, prevNotes: new Set(notes[r][c]) });
      if (history.length > 200) history.shift();
      board[r][c] = n;
      notes[r][c].clear();
      if (n !== solved[r][c]) {
        mistakes++;
        sfx.error(); haptic.error();
        if (mistakes >= 3) { render(); offerContinue(); return; }
      } else {
        sfx.match(); haptic.match();
      }
      render();
      if (isWon()) win();
    }

    function isWon() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] !== solved[r][c]) return false;
      return true;
    }

    // عدّاد التلميحات على الزر: (5→4→...→0) مجاني ثم (100/300 🪙)
    function updateHintLabel() {
      if (!btnHint || !ctx.getHintInfo) return;
      const info = ctx.getHintInfo();
      const label = btnHint.querySelector('span:last-child');
      if (!label) return;
      label.textContent = info.freeLeft > 0
        ? t('nm.hint') + ' (' + info.freeLeft + ')'
        : t('nm.hint') + ' (' + info.price + ' 🪙)';
    }

    function doHint() {
      if (gameOver) return;
      if (!selected) { toast('اختر خانة أولًا'); return; }
      const { r, c } = selected;
      if (given[r][c]) return;
      if (!ctx.useHint()) return;
      sfx.hint();
      updateHintLabel();
      board[r][c] = solved[r][c];
      notes[r][c].clear();
      render();
      if (isWon()) win();
    }

    function erase() {
      if (gameOver || !selected) return;
      const { r, c } = selected;
      if (given[r][c]) return;
      history.push({ r, c, prevDigit: board[r][c], prevNotes: new Set(notes[r][c]) });
      board[r][c] = 0;
      notes[r][c].clear();
      sfx.tap();
      render();
    }

    function undo() {
      if (gameOver) return;
      if (!ctx.useUndo()) return;
      const last = history.pop();
      if (!last) { toast('لا شيء للتراجع'); return; }
      board[last.r][last.c] = last.prevDigit;
      notes[last.r][last.c] = last.prevNotes;
      sfx.tap();
      render();
    }

    function win() {
      gameOver = true;
      clearInterval(timerId);
      sfx.win(); haptic.win(); confetti(120);
      const sc = Math.max(0, 1000 - seconds * 2 - mistakes * 50);
      const isRec = ctx.submitScore('sudoku', sc);
      ctx.addXp(40);
      const reward = ctx.rewardWin();
      lvl = reward.newLevel;
      toast('🪙 +20 فوز');
      if (reward.rankUp) toast('🏆 ترقية! +50');
      resultCard({
        emoji: '🏆',
        title: t('sd.win'),
        score: sc + ' نقطة',
        note: 'أكملت المرحلة ' + (reward.newLevel - 1) + ' (' + diffName(removalsForLevel(reward.newLevel - 1)) + ') — الآن في المرحلة ' + reward.newLevel + (isRec ? ' · رقم قياسي!' : ''),
        buttons: [
          { label: t('sd.next'), onClick: () => { showInterstitial().then(() => startNew()); } },
          { label: t('nm.backLobby'), kind: 'btn-ghost', onClick: ctx.goBack },
        ],
      });
    }

    function offerContinue() {
      sfx.error(); haptic.error();
      resultCard({
        emoji: '💪',
        title: t('sd.lose'),
        note: 'نفدت المحاولات — تابع مقابل 100 🪙 أو أنهِ اللغز',
        buttons: [
          { label: '🔄 متابعة (100 🪙)', onClick: () => { if (ctx.buyContinue(100)) { mistakes = 0; render(); } else ctx.openStore(); } },
          { label: 'إنهاء', kind: 'btn-ghost', onClick: lose },
        ],
      });
    }

    function lose() {
      gameOver = true;
      clearInterval(timerId);
      sfx.lose(); haptic.lose();
      resultCard({
        emoji: '💪',
        title: t('sd.lose'),
        note: 'المرحلة ' + lvl + ' — المحاولة التالية أفضل',
        buttons: [
          { label: 'إعادة المحاولة', onClick: startNew },
          { label: 'رجوع للقائمة', kind: 'btn-ghost', onClick: ctx.goBack },
        ],
      });
    }

    function startNew() {
      const sol = generateSolved(rng);
      const pz = makePuzzle(sol, removalsForLevel(lvl), rng);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        solved[r][c] = sol[r][c];
        puzzle[r][c] = pz[r][c];
        given[r][c] = pz[r][c] !== 0;
        board[r][c] = pz[r][c];
        notes[r][c] = new Set();
      }
      selected = null; mistakes = 0; seconds = 0; history = []; gameOver = false;
      if (ctx.resetHints) ctx.resetHints();
      startTimer();
      render();
    }

    const actions = {
      notes() { noteMode = !noteMode; btnNotes.classList.toggle('btn-soft', noteMode); toast(noteMode ? 'وضع القلم مفعّل' : 'وضع القلم معطّل'); },
      erase, undo, hint: doHint,
      new: startNew,
    };

    startTimer();
    render();

    return { destroy() { clearInterval(timerId); rootEl.remove(); } };
  },
};
