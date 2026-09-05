// Number Match — لعبة مطابقة الأرقام (مدن العالم: كل مدينة = 10 أدوار + ثيم خاص)
//
// القواعد المطبَّقة هنا:
//   1) المطابقة بخطّ النظر (Line-of-sight): يمكن ربط زوج إذا "رأى" كلٌّ منهما الآخر
//      على خطّ مستقيم غير محجوب — نفس الصف، نفس العمود، قطر 45°، أو عبر التيّار
//      المفلَّح بترتيب القراءة (Reading-order stream) الذي يعالج التفاف نهاية الصف.
//   2) انهيار الصفوف الفارغة (Gravity): بعد كل مطابقة تُحذف الصفوف الخالية وتتزحزح
//      الصفوف أسفلها للأعلى فتبقى اللوحة متراصّة وقابلة للتصفية.
//   3) إضافة صفوف (غير محدودة ومجانية) بنسخ الأرقام المتبقية بترتيب القراءة:
//      تُنسخ الأرقام المتبقية كما هي (يسار→يمين، أعلى→أسفل) دون عكس أو خلط،
//      وتُوزَّع في صفوف جديدة أسفل اللوحة فقط — دون ملء فراغات الصفوف الحالية.
//   4) لا خسارة تلقائية: الحالة النهائية الوحيدة هي الفوز بإفراغ اللوحة، وعند
//      عدم وجود حركات يضيف اللاعب صفوفًا ويُكمل (زر الإضافة يعمل دائمًا).
//   5) المساعدة التعليمية في الدور الأول فقط: إبراز الأزواج عند الضغط ورسالة
//      «لا توجد حركات» يظهران حصريًا في المستوى الأول (زر التلميح يبقى متاحًا).
//   6) التسجيل كما في اللعبة المرجعية: 10 لكل زوج + 4 للأزواج البعيدة (مسافة
//      مانهاتن ≥ 5) + 10 لكل صف كامل يُحذف + 150 عند تصفية اللوحة — دون
//      مضاعِفات متتالية أو مرحلة (عداد المتتالية يبقى للعرض فقط).
//   7) توليد لوحة عادلة: توزيع "كوتشينة" متوازن للأرقام 1-9 بحيث يكون لكل رقم
//      شريك (مساوٍ أو مكمّل للعشرة)، مع ضمان وجود حركة أولى صالحة (إعادة توليد).
import { dailySeed } from '../services/storage.js';
import { CITY_LANDMARKS } from '../cities-landmarks.js';
import { t } from '../services/i18n.js';
import { showRewarded, showInterstitial } from '../services/ads.js';
import { toast, confetti, floatScore, resultCard } from '../shared/fx.js';
import { sfx } from '../services/audio.js';
import { haptic } from '../services/haptics.js';

const COLS = 9;
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const SVG_NS = 'http://www.w3.org/2000/svg';

// ---- مدن العالم (كل مدينة = 10 أدوار + ثيم لوني) ----
export const CITIES = [
  { name: 'دبي',          flag: '🇦🇪', a: '#F7B33B', b: '#4FA3E8' },
  { name: 'نيويورك',      flag: '🇺🇸', a: '#4FA3E8', b: '#6B7C93' },
  { name: 'شنغهاي',       flag: '🇨🇳', a: '#E5484D', b: '#F7B33B' },
  { name: 'لندن',         flag: '🇬🇧', a: '#C8414A', b: '#2C3E66' },
  { name: 'الدار البيضاء', flag: '🇲🇦', a: '#2EC4A8', b: '#E8A93B' },
  { name: 'طوكيو',        flag: '🇯🇵', a: '#EC4899', b: '#E5484D' },
  { name: 'باريس',        flag: '🇫🇷', a: '#EC4899', b: '#4FA3E8' },
  { name: 'القاهرة',      flag: '🇪🇬', a: '#E8A93B', b: '#D9A05B' },
  { name: 'روما',         flag: '🇮🇹', a: '#C96B4A', b: '#E8A93B' },
  { name: 'إسطنبول',      flag: '🇹🇷', a: '#2EC4A8', b: '#E5484D' },
  { name: 'ريو دي جانيرو', flag: '🇧🇷', a: '#1F9D6B', b: '#F7C948' },
  { name: 'سيدني',        flag: '🇦🇺', a: '#2E86C1', b: '#F2705A' },
  { name: 'موسكو',        flag: '🇷🇺', a: '#D64550', b: '#4FA3E8' },
  { name: 'برلين',        flag: '🇩🇪', a: '#E8A33B', b: '#2B2B2B' },
  { name: 'مدريد',        flag: '🇪🇸', a: '#E5484D', b: '#F7B33B' },
  { name: 'أمستردام',     flag: '🇳🇱', a: '#E8892B', b: '#2EC4A8' },
  { name: 'سنغافورة',     flag: '🇸🇬', a: '#E5484D', b: '#2EC4A8' },
  { name: 'بانكوك',       flag: '🇹🇭', a: '#8B5CF6', b: '#F7B33B' },
  { name: 'مكسيكو سيتي',  flag: '🇲🇽', a: '#1F9D6B', b: '#EC4899' },
  { name: 'فيينا',        flag: '🇦🇹', a: '#E8A93B', b: '#C8414A' },
];

export function cityForLevel(level) {
  const idx = Math.floor((level - 1) / 10) % CITIES.length;
  const round = ((level - 1) % 10) + 1;
  return { city: CITIES[idx], round, index: idx };
}

// ---- أدوات الألوان ----
function hexRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function hexToRgbStr(hex) { const { r, g, b } = hexRgb(hex); return r + ',' + g + ',' + b; }
function darken(hex, amt) {
  const { r, g, b } = hexRgb(hex);
  const f = 1 - amt;
  const to = n => Math.round(n * f).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}
function isLight(hex) {
  const { r, g, b } = hexRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 155;
}
function alpha(hex, a) { const { r, g, b } = hexRgb(hex); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; }

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============================================================================
//  منطق النواة (نقي — قابل للاختبار من دون DOM)
// ============================================================================

/**
 * هل يمكن للخليتين "رؤية" بعضهما على خطّ مستقيم غير محجوب؟
 * يعيد true في أيٍّ من الحالات:
 *   - نفس الصف: كلّ الخلايا بينهما فارغة.
 *   - نفس العمود: كلّ الخلايا بينهما فارغة.
 *   - قطر 45° (|dr| === |dc|): كلّ الخلايا على القطر بينهما فارغة.
 *   - التيّار المفلَّح بترتيب القراءة: كلّ المواضع بين الخليتين في التسلسل
 *     (row-major) فارغة — يلتقط الالتفاف عند نهاية الصف إلى بداية الصف التالي.
 */
export function canConnect(grid, a, b) {
  if (a.r === b.r && a.c === b.c) return false;
  const R = grid.length;

  // 1) نفس الصف — مسار أفقي واضح
  if (a.r === b.r) {
    const lo = Math.min(a.c, b.c), hi = Math.max(a.c, b.c);
    for (let c = lo + 1; c < hi; c++) if (grid[a.r][c] != null) return false;
    return true;
  }

  // 2) نفس العمود — مسار عمودي واضح
  if (a.c === b.c) {
    const lo = Math.min(a.r, b.r), hi = Math.max(a.r, b.r);
    for (let r = lo + 1; r < hi; r++) if (grid[r][a.c] != null) return false;
    return true;
  }

  // 3) قطر 45° — مسار قطري واضح
  const dr = Math.abs(a.r - b.r), dc = Math.abs(a.c - b.c);
  if (dr === dc) {
    const stepR = a.r < b.r ? 1 : -1;
    const stepC = a.c < b.c ? 1 : -1;
    let r = a.r + stepR, c = a.c + stepC;
    while (r !== b.r && c !== b.c) {
      if (r < 0 || r >= R || c < 0 || c >= COLS) return false;
      if (grid[r][c] != null) return false;
      r += stepR; c += stepC;
    }
    return true;
  }

  // 4) التيّار المفلَّح بترتيب القراءة (يغطّي الالتفاف بين الصفوف)
  const idxA = a.r * COLS + a.c, idxB = b.r * COLS + b.c;
  const lo = Math.min(idxA, idxB), hi = Math.max(idxA, idxB);
  for (let k = lo + 1; k < hi; k++) {
    const rr = Math.floor(k / COLS), cc = k % COLS;
    if (grid[rr] && grid[rr][cc] != null) return false;
  }
  return true;
}

/** هل يشكّل الزوج (a,b) مطابقة صالحة؟ = قيمة منطقية + خطّ نظر واضح. */
export function canMatch(grid, a, b) {
  const v1 = grid[a.r] ? grid[a.r][a.c] : null;
  const v2 = grid[b.r] ? grid[b.r][b.c] : null;
  if (v1 == null || v2 == null) return false;
  if (!(v1 === v2 || v1 + v2 === 10)) return false;
  return canConnect(grid, a, b);
}

/** كلّ الخلايا غير الفارغة {r,c}. */
export function allCells(grid) {
  const out = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] != null) out.push({ r, c });
  return out;
}

/** إيجاد أيّ حركة صالحة (تُستخدم للتلميح/الفحص). */
export function findMove(grid) {
  const cells = allCells(grid);
  for (let i = 0; i < cells.length; i++)
    for (let j = i + 1; j < cells.length; j++)
      if (canMatch(grid, cells[i], cells[j])) return [cells[i], cells[j]];
  return null;
}

/** عدد الخلايا غير الفارغة في اللوحة. */
export function remainingCount(grid) { return allCells(grid).length; }

/** حذف الصفوف الخالية بالكامل (الجاذبية) — الصفوف أسفلها تتزحزح للأعلى. */
export function collapseGrid(grid) {
  return grid.filter(row => row.some(v => v != null));
}

/** المسافة (مانهاتن) بين الخليتين — تُستخدم في مكافأة المدى البعيد. */
export function matchDistance(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

/**
 * نقاط المطابقة كما في اللعبة المرجعية: 10 لكل زوج + 4 مكافأة إذا كان الزوج
 * بعيدًا (مسافة مانهاتن ≥ 5 — اتصال عبر خلايا محذوفة). مكافأة الصفوف الكاملة
 * تُحسب في doMatch ومكافأة التصفية النهائية في win.
 */
export function computePoints(distance) {
  return 10 + (distance >= 5 ? 4 : 0);
}

/**
 * بناء "كوتشينة" متوازنة من الأرقام 1-9 بطول زوجي.
 * كلّ زوج يُبنى بحيث يكون كلا الرقمين قابلين للتصفية معًا (متساويان أو مجموعهما 10)،
 * فيكون لكلّ رقم شريك مضمون في المجموعة مما يجعل اللوحة قابلة للحل.
 */
export function buildDeck(total, rng) {
  // اجعل الطول زوجيًا حتى يمكن تصفية اللوحة بالكامل (كل مطابقة تُزيل خليتين)
  const size = Math.max(2, total - (total % 2));
  const deck = [];
  for (let i = 0; i < size; i += 2) {
    const v = DIGITS[Math.floor(rng() * 9)];
    const mate = rng() < 0.5 ? v : 10 - v;
    deck.push(v, mate);
  }
  // خلط عشوائي
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}

/**
 * توليد جولة كاملة: لوحة ممتلئة بالكامل (صفوف × 9). الكوتشينة تُبنى بأزواج
 * مقترنة، وإن كانت مساحات اللوحة فردية تُستكمل الخلية الأخيرة بنسخة من رقم
 * موجود لضمان وجود شريك لكل رقم. يضمن لوحة عادلة ووجود حركة أولى صالحة
 * (إعادة التوليد حتى 300 محاولة). إضافة الصفوف غير محدودة (تُنسخ من اللوحة).
 */
export function genGame(rows, rng) {
  const deckSize = rows * COLS;
  let lastDeck = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    const deck = buildDeck(deckSize, rng);
    // استكمال الخلايا الفردية بنسخ مكررة من أرقام موجودة (تبقى اللوحة قابلة للتصفية)
    while (deck.length < deckSize) deck.push(deck[Math.floor(rng() * deck.length)]);
    lastDeck = deck;
    const grid = [];
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) row.push(k < deck.length ? deck[k++] : null);
      grid.push(row);
    }
    if (findMove(grid)) return { grid };
  }
  // أمان: لو فشلت كل المحاولات (شبه مستحيل مع كوتشينة مقترنة) نعيد آخر لوحة.
  const deck = lastDeck;
  while (deck.length < deckSize) deck.push(deck[Math.floor(rng() * deck.length)]);
  const grid = [];
  let k = 0;
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push(k < deck.length ? deck[k++] : null);
    grid.push(row);
  }
  return { grid };
}

/**
 * إضافة صفوف بنسخ الأرقام المتبقية كما في اللعبة المرجعية: تُنسخ الأرقام
 * الموجودة على اللوحة بنفس ترتيب القراءة (يسار→يمين، أعلى→أسفل) دون عكس أو
 * خلط، وتُوزَّع في صفوف جديدة تُلحق أسفل اللوحة فقط — دون لمس الصفوف الحالية
 * أو ملء فراغاتها. غير محدودة ومجانية. تُعدَّل الشبكة في المكان وتُعاد.
 */
export function copyAdd(grid) {
  const vals = [];
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < COLS; c++)
      if (grid[r][c] != null) vals.push(grid[r][c]);
  if (vals.length === 0) return grid;

  let k = 0;                            // توزيع بنفس الترتيب في صفوف جديدة أسفل اللوحة
  while (k < vals.length) {
    const row = new Array(COLS).fill(null);
    for (let c = 0; c < COLS && k < vals.length; c++) row[c] = vals[k++];
    grid.push(row);
  }
  return grid;
}

// ============================================================================
//  واجهة اللعبة (DOM)
// ============================================================================

export const numberMatchModule = {
  id: 'number-match',
  name: 'Number Match',
  nameAr: 'مطابقة الأرقام',
  desc: 'احذف أزواج الأرقام المتطابقة أو التي مجموعها 10',
  gradient: ['#F2705A', '#F7B33B'],
  sortOrder: 1,
  capabilities: { dailyChallenge: true, hints: true, timer: false, leaderboard: true },
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="8" height="8" rx="2.4"/><rect x="12.5" y="12.5" width="8" height="8" rx="2.4"/></svg>',

  mount(container, ctx) {
    const isDaily = ctx.isDaily ? ctx.isDaily() : false;
    const rng = isDaily ? mulberry32(dailySeed('number-match')) : Math.random;
    let lvl = ctx.level || 1;
    let cityCtx = cityForLevel(lvl);
    const rowsForLevel = () => 3 + Math.min(3, Math.floor((lvl - 1) / 100));

    // ---- حالة الجولة ----
    const initial = genGame(rowsForLevel(), rng);
    let grid = initial.grid;
    let score = 0;
    let best = ctx.bestScore ? ctx.bestScore('number-match') : 0;
    let selected = null;
    let history = [];
    let combo = 0;
    let cellEls = [];
    let entryAnim = true;
    let gameOver = false;
    if (ctx.resetHints) ctx.resetHints();

    const rootEl = document.createElement('div');
    rootEl.className = 'game-screen';

    // بانر المدينة
    const banner = document.createElement('div');
    banner.className = 'city-banner';
    banner.style.padding = '11px 16px';
    banner.style.borderRadius = '14px';
    banner.style.display = 'flex';
    banner.style.alignItems = 'center';
    banner.style.justifyContent = 'center';
    banner.style.gap = '10px';
    banner.style.fontWeight = '700';
    banner.style.marginBottom = '12px';
    banner.style.boxShadow = '0 4px 14px rgba(0,0,0,.14)';
    const bannerIcon = document.createElement('span');
    bannerIcon.className = 'banner-icon';
    const bannerText = document.createElement('span');
    banner.appendChild(bannerIcon);
    banner.appendChild(bannerText);

    // HUD (5 صناديق: نقاط/أفضل/متبقي/متتالية/مرحلة)
    const hud = document.createElement('div');
    hud.className = 'hud';
    const hudScore = document.createElement('div'); hudScore.className = 'box';
    const hudBest = document.createElement('div'); hudBest.className = 'box';
    const hudLeft = document.createElement('div'); hudLeft.className = 'box';
    const hudCombo = document.createElement('div'); hudCombo.className = 'box';
    const hudLevel = document.createElement('div'); hudLevel.className = 'box';
    [hudScore, hudBest, hudLeft, hudCombo, hudLevel].forEach(b => hud.appendChild(b));

    // اللوحة + طبقة الخطوط
    const wrap = document.createElement('div');
    wrap.className = 'board-wrap';
    const board = document.createElement('div');
    board.className = 'board';
    board.style.gridTemplateColumns = 'repeat(9, 1fr)';
    board.style.direction = 'ltr';
    wrap.appendChild(board);
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'link-layer');
    svg.style.overflow = 'visible';
    // تدرّج مائي (بنفسجي → مرجاني) لخطوط الاتصال كما في تصميم connection variants
    const defs = document.createElementNS(SVG_NS, 'defs');
    const lg = document.createElementNS(SVG_NS, 'linearGradient');
    lg.setAttribute('id', 'connGrad');
    lg.setAttribute('x1', '0%'); lg.setAttribute('y1', '0%'); lg.setAttribute('x2', '100%'); lg.setAttribute('y2', '0%');
    const stop1 = document.createElementNS(SVG_NS, 'stop'); stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#8455ef');
    const stop2 = document.createElementNS(SVG_NS, 'stop'); stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#f2705a');
    lg.append(stop1, stop2); defs.appendChild(lg); svg.appendChild(defs);
    wrap.appendChild(svg);

    // شريط الأدوات
    const bar = document.createElement('div');
    bar.className = 'toolbar';
    function mkBtn(label, act, kind, icon) {
      const b = document.createElement('button');
      b.className = 'btn ' + (kind || 'btn-ghost');
      b.innerHTML = '<span class="material-symbols-outlined">' + (icon || '') + '</span><span>' + label + '</span>';
      b.dataset.act = act;
      b.addEventListener('click', () => actions[act]());
      bar.appendChild(b);
      return b;
    }
    const btnUndo = mkBtn(t('nm.undo'), 'undo', 'btn-ghost', 'undo');
    const btnHint = mkBtn(t('nm.hint'), 'hint', 'btn-ghost', 'lightbulb');
    const btnAdd = mkBtn(t('nm.addrows'), 'add', 'btn-ghost', 'add_box');
    const btnNew = mkBtn(t('nm.new'), 'new', 'btn-ghost', 'restart_alt');

    const backdrop = document.createElement('div');
    backdrop.className = 'city-backdrop';
    rootEl.append(backdrop, banner, hud, wrap, bar);
    container.appendChild(rootEl);

    function applyCityTheme() {
      cityCtx = cityForLevel(lvl);
      const c = cityCtx.city;
      rootEl.style.setProperty('--primary', c.a);
      rootEl.style.setProperty('--primary-press', darken(c.a, 0.16));
      rootEl.style.setProperty('--on-primary', isLight(c.a) ? '#2B120A' : '#FFFFFF');
      rootEl.style.setProperty('--cell-selected-border', c.a);
      rootEl.style.setProperty('--cell-selected-shadow-rgb', hexToRgbStr(c.a));
      rootEl.style.setProperty('--accent-info', c.b);
      wrap.style.background = 'var(--surface-container)';
      // بانر بتدرّج التصميم (primary-fixed → secondary-fixed) بدل ألوان المدينة
      banner.style.background = 'linear-gradient(90deg, var(--primary-fixed), var(--secondary-fixed))';
      banner.style.color = 'var(--on-primary-container)';
      const svgStr = CITY_LANDMARKS[cityCtx.index] || '';
      bannerIcon.style.color = 'currentColor';
      bannerIcon.innerHTML = svgStr;
      bannerText.innerHTML = c.flag + ' ' + c.name + ' <span style="opacity:.85">· ' + t('nm.round') + ' ' + cityCtx.round + '/10</span>';
      backdrop.innerHTML = svgStr;
      backdrop.style.color = c.a;
    }

    function cellSize() {
      const w = wrap.clientWidth - 26;
      return Math.max(24, Math.floor((w - (COLS - 1) * 6) / COLS));
    }

    function render() {
      // الجاذبية: احذف الصفوف الفارغة أولًا (تُبقى شبكة لا تحتوي صفوفًا خالية)
      grid = collapseGrid(grid);
      board.innerHTML = '';
      cellEls = [];
      const cs = cellSize();
      board.style.setProperty('--cell-fs', Math.round(cs * 0.52) + 'px');
      grid.forEach((row, r) => {
        const rowEls = [];
        row.forEach((v, c) => {
          const cell = document.createElement('button');
          cell.className = 'cell';
          cell.style.aspectRatio = '1';
          if (entryAnim) { cell.classList.add('enter'); cell.style.animationDelay = ((r * COLS + c) * 20) + 'ms'; }
          if (v == null) {
            cell.classList.add('gone');
            cell.style.pointerEvents = 'none';
          } else {
            cell.textContent = v;
          }
          if (selected && selected.r === r && selected.c === c) cell.classList.add('selected');
          cell.addEventListener('click', () => onTap(r, c));
          board.appendChild(cell);
          rowEls.push(cell);
        });
        cellEls.push(rowEls);
      });
      entryAnim = false;
      drawLinks();
      updateHud();
      updateHintLabel();
    }

    function drawLinks() {
      svg.innerHTML = '';
      if (!selected) return;
      // مساعدة الإبراز (الأزواج + الخطوط) تظهر في الدور الأول فقط
      if (lvl !== 1 || isDaily) return;
      const sc = selected;
      if (!grid[sc.r] || grid[sc.r][sc.c] == null) return;
      const selEl = cellEls[sc.r] && cellEls[sc.r][sc.c];
      if (!selEl) return;
      const srect = svg.getBoundingClientRect();
      const center = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - srect.left, y: r.top + r.height / 2 - srect.top };
      };
      const p1 = center(selEl);
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (r === sc.r && c === sc.c) continue;
          if (grid[r][c] == null) continue;
          if (!canMatch(grid, { r: sc.r, c: sc.c }, { r, c })) continue;
          const el = cellEls[r][c];
          if (!el) continue;
          el.classList.add('matchable');
          const p2 = center(el);
          const line = document.createElementNS(SVG_NS, 'line');
          line.setAttribute('x1', p1.x);
          line.setAttribute('y1', p1.y);
          line.setAttribute('x2', p2.x);
          line.setAttribute('y2', p2.y);
          line.setAttribute('stroke', 'url(#connGrad)');
          svg.appendChild(line);
        }
      }
    }

    function updateHud() {
      hudScore.innerHTML = '<div class="v">' + score + '</div><div class="k">' + t('nm.score') + '</div>';
      hudBest.innerHTML = '<div class="v">' + best + '</div><div class="k">' + t('nm.best') + '</div>';
      hudLeft.innerHTML = '<div class="v">' + remainingCount(grid) + '</div><div class="k">' + t('nm.left') + '</div>';
      hudCombo.innerHTML = '<div class="v">' + combo + '</div><div class="k">' + t('nm.combo') + '</div>';
      hudLevel.innerHTML = '<div class="v">' + cityCtx.round + '/10</div><div class="k">' + cityCtx.city.name + '</div>';
      // زر الإضافة يعمل دائمًا (بلا حدّ ولا رصيد — كما في اللعبة المرجعية)
      btnAdd.textContent = t('nm.addrows');
    }

    function cellCenter(r, c) {
      const rect = wrap.getBoundingClientRect();
      const cs = cellSize();
      return { x: rect.left + 13 + c * (cs + 6) + cs / 2, y: rect.top + 13 + r * (cs + 6) + cs / 2 };
    }

    function onTap(r, c) {
      if (gameOver) return;
      if (grid[r][c] == null) return;
      sfx.tap();
      if (!selected) { selected = { r, c }; haptic.tap(); render(); return; }
      if (selected.r === r && selected.c === c) { selected = null; render(); return; }
      const a = selected, b = { r, c };
      if (canMatch(grid, a, b)) {
        doMatch(a, b);
      } else {
        sfx.error(); haptic.error();
        selected = b;
        render();
      }
    }

    function doMatch(a, b) {
      const dist = matchDistance(a, b);
      // لقطة كاملة للحالة قبل المطابقة (لأجل التراجع مع الجاذبية)
      history.push({
        grid: grid.map(row => row.slice()),
        score, combo, a, b,
      });
      if (history.length > 5) history.shift();

      grid[a.r][a.c] = null; grid[b.r][b.c] = null;
      // مكافأة الصفوف الكاملة المحذوفة بهذه الحركة (+10 لكل صف — كما في المرجع)
      const rowsRemoved = grid.filter(row => row.every(v => v == null)).length;
      combo++;
      const pts = computePoints(dist) + rowsRemoved * 10;
      score += pts;
      if (combo >= 2) { sfx.combo(); haptic.combo(); } else { sfx.match(); haptic.match(); }
      const c1 = cellCenter(a.r, a.c), c2 = cellCenter(b.r, b.c);
      floatScore((c1.x + c2.x) / 2, (c1.y + c2.y) / 2, '+' + pts);
      const cells = board.querySelectorAll('.cell');
      const i1 = a.r * COLS + a.c, i2 = b.r * COLS + b.c;
      if (cells[i1]) cells[i1].classList.add('squash');
      if (cells[i2]) cells[i2].classList.add('squash');
      selected = null;
      setTimeout(() => { grid = collapseGrid(grid); render(); checkState(); }, 170);
    }

    // إضافة صفوف غير محدودة ومجانية: نسخ الأرقام المتبقية بترتيب القراءة
    function addRows() {
      if (gameOver) return;
      if (remainingCount(grid) === 0) { checkState(); return; }
      sfx.addrow();
      combo = 0;
      grid = copyAdd(grid);
      render();
      checkState();
    }

    function checkState() {
      if (gameOver) return;
      // الفوز: اللوحة فارغة تمامًا (لا خسارة تلقائية — الإضافة دائمًا متاحة)
      const rem = remainingCount(grid);
      if (rem === 0) { win(); return; }

      if (!findMove(grid)) {
        // الدور الأول فقط نعلّم اللاعب أنه لا توجد حركات ويمكنه إضافة صفوف.
        // بعد الدور الأول: صمت تام — يكتشف اللاعب ذلك بنفسه.
        if (lvl === 1 && !isDaily) {
          toast('لا توجد حركات — اضغط «إضافة صفوف»');
          btnAdd.style.animation = 'hintPulse 0.8s ease-out 2';
          setTimeout(() => { btnAdd.style.animation = ''; }, 1700);
        }
      }
    }

    function win() {
      gameOver = true;
      score += 150;                     // مكافأة تصفية اللوحة كاملة (+150 كما في المرجع)
      sfx.win(); haptic.win(); confetti(120);
      const isRec = ctx.submitScore('number-match', score);
      ctx.addXp(30);
      const prevCity = cityCtx.city;
      const prevRound = cityCtx.round;
      const reward = ctx.rewardWin();
      lvl = reward.newLevel;
      applyCityTheme();
      best = Math.max(best, score);
      if (isDaily && ctx.completeDaily && ctx.completeDaily()) { toast('🎁 +50 🪙 مكافأة التحدي اليومي'); }
      toast('🪙 +20 فوز');
      if (reward.rankUp) toast('🏆 ترقية! +50');
      const nextCity = cityCtx.city;
      const movedCity = nextCity.name !== prevCity.name;
      resultCard({
        emoji: movedCity ? '🌍' : '🏆',
        title: movedCity ? t('nm.cityDone') : t('nm.win'),
        score: score,
        note: movedCity
          ? (isRec ? '🎉 رقم قياسي! ' : '') + 'أكملت ' + prevCity.name + ' — انتقلت إلى ' + nextCity.name + '!'
          : (isRec ? '🎉 رقم قياسي! ' : '') + 'أكملت الدور ' + prevRound + ' من 10 في ' + prevCity.name,
        buttons: [
          { label: t('nm.nextRound'), onClick: () => { showInterstitial().then(() => restart()); } },
          { label: t('nm.backLobby'), kind: 'btn-ghost', onClick: ctx.goBack },
        ],
      });
    }

    function restart() {
      applyCityTheme();
      const g = genGame(rowsForLevel(), rng);
      grid = g.grid;
      score = 0; selected = null; history = []; combo = 0; entryAnim = true; gameOver = false;
      if (ctx.resetHints) ctx.resetHints();
      render();
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
      const mv = findMove(grid);
      if (!mv) {
        // الدور الأول فقط نُخبر اللاعب؛ بعده يكتشف بنفسه بصمت
        if (lvl === 1 && !isDaily) toast('لا توجد حركة — اضغط «إضافة صفوف»');
        return;
      }
      if (!ctx.useHint()) return;
      sfx.hint();
      updateHintLabel();
      const cells = board.querySelectorAll('.cell');
      const i1 = mv[0].r * COLS + mv[0].c, i2 = mv[1].r * COLS + mv[1].c;
      if (cells[i1]) cells[i1].classList.add('hint');
      if (cells[i2]) cells[i2].classList.add('hint');
      setTimeout(() => { if (cells[i1]) cells[i1].classList.remove('hint'); if (cells[i2]) cells[i2].classList.remove('hint'); }, 2600);
    }

    function undo() {
      const last = history[history.length - 1];
      if (!last) { toast('لا شيء للتراجع'); return; }
      if (!ctx.useUndo()) return;
      history.pop();
      grid = last.grid;
      score = last.score;
      combo = last.combo;
      selected = null;
      sfx.tap();
      render();
      checkState();
    }

    const actions = { undo, hint: doHint, add: addRows, new: restart };

    applyCityTheme();
    render();

    return { destroy() { rootEl.remove(); } };
  },
};
