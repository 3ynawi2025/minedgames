// ui.js — طبقة العرض Claymorphism: اللوبي + المتجر + الإعدادات + غلاف اللعبة
import { settings, save, isDark, registry, useHint, resetHints, getHintInfo, useUndo, buyContinue, claimDailyReward, isDailyCompleted, completeDaily, getCoins, addCoins, getLevel, completeLevel, getRank, getStreak, bestScore, submitScore, addXp, rewardWin, setTheme, getTheme, THEMES, getLang, setLang, t, setSound, setHaptics, toast } from './app.js';
import { numberMatchModule, cityForLevel, CITIES } from './games/number-match.js';
import { initAds, showBanner, isMockMode, isAdsEnabled } from './services/ads.js';
import { exportProgress, importProgress } from './services/cloud.js';
import * as purchases from './services/purchases.js';
import { IC } from './icons.js';
import { CITY_LANDMARKS } from './cities-landmarks.js';
import { getPostcards, syncPostcards } from './services/postcards.js';
import { createGift } from './services/gifts.js';

// تحميل أنماط الأيقونات المخصصة (styles/icons.css) دون تعديل index.html
(() => {
  try {
    if (!document.querySelector('link[data-dsh-icons]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'styles/icons.css';
      l.setAttribute('data-dsh-icons', '1');
      document.head.appendChild(l);
      // design.css يُحقن بعد icons.css ليأخذ الأولوية على كل الأوراق
      const d = document.createElement('link');
      d.rel = 'stylesheet';
      d.href = 'styles/design.css';
      d.setAttribute('data-dsh-design', '1');
      document.head.appendChild(d);
    }
  } catch {}
})();

// أيقونات SVG
const I = {
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2.2"/><circle cx="15" cy="12" r="2.2"/><circle cx="9" cy="18" r="2.2"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2c1 3-1 4.5-2.5 6C7.5 10.5 7 12.5 7 15a5 5 0 0 0 10 0c0-2-.7-3.6-2-5-1-1.2-2-3-3-8z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><circle cx="17.5" cy="17.5" r="3.5"/></svg>',
};

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

function makeCtx(gameId) {
  return {
    goBack: renderLobby,
    bestScore, submitScore, addXp, useHint: () => useHint(gameId), useUndo,
    resetHints: () => resetHints(gameId),
    getHintInfo: () => getHintInfo(gameId),
    coins: getCoins(),
    isDaily: () => false,
    level: getLevel(gameId),
    completeLevel: () => completeLevel(gameId),
    rewardWin: () => {
      const res = rewardWin(gameId);
      if (gameId === 'number-match') {
        // عند إتمام مدينة (كل أدوارها) تُحفظ بطاقة المدينة تلقائيًا
        const earned = syncPostcards(res.newLevel - 1);
        if (earned.length) {
          const last = earned[earned.length - 1];
          toast('🏙️ ' + last.flag + ' ' + last.city + ' — ' + t('wt.postcards') + '!');
        }
      }
      return res;
    },
    openStore,
    buyContinue,
    completeDaily,
  };
}

function stat(icon, value, label) {
  const s = el('div', 'stat');
  const ico = el('div', 'ico', icon); ico.style.color = 'var(--primary-text)';
  const box = el('div', '');
  box.innerHTML = '<div class="val">' + value + '</div><div class="lbl">' + label + '</div>';
  s.append(ico, box);
  return s;
}

function mi(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

// استبدال {key} في نصوص التوطين (اي 18n لديها placeholders حرفية)
function tf(key, vars) { let s = t(key); if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]); return s; }

// Stitch design token palette for the game tiles (brain_match_dubai_home: sky/night, mint/emerald, gold)
const GAME_TILE = {
  'number-match': { bg: '#FDF2F8', blob: 'rgba(79,163,232,.45)', grad: 'linear-gradient(135deg,#4FA3E8,#7B9CFF)', ico: mi('dialpad'), ink: '#fff' },
  'sudoku': { bg: '#F1F7F2', blob: 'rgba(46,196,168,.45)', grad: 'linear-gradient(135deg,#2EC4A8,#1F9D6B)', ico: mi('grid_4x4'), ink: '#fff' },
  'merge2048': { bg: '#FFF8E8', blob: 'rgba(255,186,66,.45)', grad: 'linear-gradient(135deg,#ffba42,#c98c0d)', ico: '<span class="num">2048</span>', ink: '#432b00' },
};

const AR_DAYS = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

function streakCalendar(streak) {
  const card = el('div', 'streak-card');
  const head = el('div', 'streak-head');
  head.innerHTML = '<h3>سلسلة اللعب</h3>';
  head.appendChild(el('div', 'streak-pill', mi('local_fire_department') + ' ' + streak.count));
  card.appendChild(head);
  const days = el('div', 'streak-days');
  const today = new Date();
  const dow = (today.getDay() + 6) % 7;
  const monday = new Date(today); monday.setDate(today.getDate() - dow);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const dist = Math.round((today.getTime() - d.getTime()) / 86400000);
    let cls = 'locked', ico = 'lock';
    if (dist === 0) { cls = 'today'; ico = 'star'; }
    else if (dist > 0 && dist <= streak.count) { cls = 'done'; ico = 'check'; }
    const day = el('div', 'streak-day');
    day.innerHTML = '<div class="day-box ' + cls + '">' + mi(ico) + '</div><span class="day-lbl' + (dist === 0 ? ' active' : '') + '">' + AR_DAYS[d.getDay()] + '</span>';
    days.appendChild(day);
  }
  card.appendChild(days);
  return card;
}

function tab(icon, label, active, onClick) {
  const t = el('div', 'tab' + (active ? ' active' : ''));
  t.innerHTML = '<span class="t-ico">' + mi(icon) + '</span><span class="t-lbl">' + label + '</span>';
  if (onClick) t.addEventListener('click', onClick);
  return t;
}

function openStats() {
  const rank = getRank();
  const or = document.getElementById('overlay-root');
  or.innerHTML = '';
  const mask = el('div', 'sheet-mask');
  const sheet = el('div', 'sheet');
  sheet.innerHTML = '<h3>' + mi('leaderboard') + ' ' + t('stat.rank') + '</h3><div class="sub">' + t('settings.subtitle') + '</div>';
  sheet.appendChild(el('div', 'consume-row', '<span class="cname">' + t('stat.rank') + '</span><span class="ccost" style="color:var(--accent-gold)">' + rank.icon + ' ' + rank.name + '</span>'));
  sheet.appendChild(el('div', 'consume-row', '<span class="cname">' + t('stat.streak') + '</span><span class="ccost">' + mi('local_fire_department') + ' ' + getStreak().count + '</span>'));
  sheet.appendChild(el('div', 'consume-row', '<span class="cname">' + t('games.title') + '</span><span class="ccost">' + registry.length + '</span>'));
  const close = el('button', 'btn btn-primary', t('settings.done'));
  close.style.width = '100%'; close.style.marginTop = '16px';
  close.addEventListener('click', () => mask.remove());
  sheet.appendChild(close);
  mask.appendChild(sheet);
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
  or.appendChild(mask);
}

function gameCard(mod) {
  const tile = GAME_TILE[mod.id] || GAME_TILE['number-match'];
  const c = el('button', 'card game-card');
  c.dataset.game = mod.id;

  // أيقونة البلاطة المتدرجة (كما في brain_match_dubai_home)
  const tileEl = el('div', 'tile');
  tileEl.style.background = tile.bg;
  const blob = el('div', 'blob'); blob.style.background = tile.blob; blob.style.right = '-20px'; blob.style.top = '-20px';
  const big = el('div', 'big-ico', tile.ico);
  big.style.background = tile.grad;
  big.style.color = tile.ink || '#fff';
  tileEl.append(blob, big);
  c.appendChild(tileEl);

  const lvl = getLevel(mod.id);
  let stageLabel = t('games.title') + ' ' + lvl;
  if (mod.id === 'number-match') { const cc = cityForLevel(lvl); stageLabel = cc.city.flag + ' ' + cc.city.name + ' · ' + t('round') + ' ' + cc.round + '/10'; }
  const meta = el('div', 'meta');
  const cardName = mod.nameAr;
  // اسم اللعبة + اسم فئة (اللغة الإنجليزية كما في التصميم)
  const enName = { 'number-match': 'Number Match', 'sudoku': 'Sudoku', 'merge2048': 'Merge Blocks' }[mod.id] || mod.name;
  meta.innerHTML = '<div class="mtop"><h3>' + cardName + '</h3><p>' + enName + '</p></div><div class="play">' + mi('chevron_left') + '</div>';
  c.appendChild(meta);
  c.addEventListener('click', () => renderGame(mod));
  return c;
}

function renderGame(mod, opts = {}) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const screen = el('div', 'game-screen');
  if (mod.id === 'merge2048') screen.classList.add('game-2048'); // ثيم «أفق المدينة» الداكن
  const top = el('div', 'game-top');
  const back = el('button', 'back', '<span style="transform:scaleX(-1);display:inline-block">' + IC.back + '</span>');
  back.addEventListener('click', renderLobby);
  const coinTop = el('button', 'coin-pill', '<span class="coin-ico"></span> ' + getCoins());
  coinTop.addEventListener('click', openStore);
  const title = el('div', 'gtitle');
  const lvlNow = getLevel(mod.id);
  let subHtml;
  if (mod.id === 'number-match') {
    const cc = cityForLevel(lvlNow);
    // وسم الميكانيكا المُدارة كماركة مميزة
    subHtml = IC.globe + ' ' + cc.city.flag + ' ' + cc.city.name + ' · ' + t('round') + ' ' + cc.round + '/10';
  } else {
    subHtml = mod.nameAr;
  }
  title.innerHTML = '<h1>' + t('brand.mechanic') + '</h1><div class="sub" style="display:flex;align-items:center;gap:4px">' + subHtml + '</div>';
  top.append(back, title, coinTop);
  screen.appendChild(top);
  app.appendChild(screen);
  const host = el('div', '');
  screen.appendChild(host);
  const ctx = makeCtx(mod.id);
  if (opts.isDaily) ctx.isDaily = () => true;
  const instance = mod.mount(host, ctx);
  screen._instance = instance;
}

// ============================================================
// بطاقة «جولة العالم» — هوية اللوبي
// ============================================================
function cityHero() {
  const level = getLevel('number-match');
  const cc = cityForLevel(level);
  const i = cc.index;
  const landmark = CITY_LANDMARKS[i] || '';
  const totalCities = CITIES.length;
  const frac = Math.round((cc.round / 10) * 100);

  const hero = el('div', 'city-hero');

  // بطاقة الرحلة (بنيّة brain_match_dubai_home): عنوان + حلقة تقدّم + مشهد + زر متابعة
  const row = el('div', 'hero-row');
  const head = el('div', 'hero-head');
  head.innerHTML = '<h2>رحلة ' + cc.city.name + '</h2><p>' + tf('wt.cityOf', { n: i + 1, total: totalCities }) + '</p>';
  row.appendChild(head);

  // حلقة التقدّم النسبية
  const ring = el('div', 'hero-ring');
  const R = 15.9155;
  const circ = 2 * Math.PI * R;
  const filled = (frac / 100) * circ;
  ring.innerHTML =
    '<svg viewBox="0 0 36 36" class="ring-svg">' +
    '<path class="ring-track" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<path class="ring-fill" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="' + filled.toFixed(2) + ' ' + circ.toFixed(2) + '" stroke-linecap="round" stroke-width="3"/>' +
    '</svg>' +
    '<span class="ring-pct">' + frac + '%</span>';
  row.appendChild(ring);
  hero.appendChild(row);

  // منطقة المشهد (معلم المدينة + تدرّج ملوّن)
  const scene = el('div', 'hero-scene');
  scene.style.setProperty('--hero-a', cc.city.a);
  scene.style.setProperty('--hero-b', cc.city.b);
  scene.appendChild(el('div', 'hero-landmark', landmark));
  hero.appendChild(scene);

  // أزرار المتابعة + كتاب البطاقات
  const actions = el('div', 'hero-actions');
  const go = el('button', 'btn btn-primary hero-go', mi('play_arrow') + ' ' + t('wt.continue'));
  go.addEventListener('click', () => renderGame(numberMatchModule));
  const book = el('button', 'btn btn-ghost hero-book', IC.book + ' ' + t('wt.postcards'));
  book.addEventListener('click', openPostcards);
  actions.append(go, book);
  hero.appendChild(actions);
  return hero;
}

// ============================================================
// كتاب البطاقات (Postcard Book) — شبكة المجموعة
// ============================================================
function openPostcards() {
  const or = document.getElementById('overlay-root');
  or.innerHTML = '';
  const mask = el('div', 'sheet-mask');
  const sheet = el('div', 'sheet pb-sheet');
  const collected = getPostcards();
  const n = collected.length;
  const total = CITIES.length;
  sheet.innerHTML = '<h3>' + IC.book + ' ' + t('pb.title') + '</h3><div class="sub">' + t('pb.subtitle') + '</div>';
  const prog = el('div', 'pb-progress');
  prog.innerHTML = '<div class="pb-glow g1"></div><div class="pb-glow g2"></div><h2>' + tf('pb.progress', { n, total }) + '</h2>';
  const bar = el('div', 'pb-bar');
  const fill = el('div', 'pb-bar-fill');
  fill.style.width = Math.round((n / total) * 100) + '%';
  bar.appendChild(fill);
  prog.appendChild(bar);
  sheet.appendChild(prog);
  sheet.appendChild(el('div', 'pb-howto', t('pb.howto')));
  if (n === 0) sheet.appendChild(el('div', 'pb-empty', '<div class="big">🗺️</div>' + t('pb.empty')));

  const grid = el('div', 'postcard-grid');
  CITIES.forEach((city, i) => {
    const p = collected.find(x => x.index === i);
    const card = el('div', 'postcard-card' + (p ? '' : ' locked'));
    if (p) {
      card.innerHTML =
        '<div class="pc-photo"><img class="pc-img" src="assets/postcards/city-' + String(p.index + 1).padStart(2, '0') + '.png" alt=""><div class="pc-stamp">' + p.flag + '</div></div>' +
        '<div class="pc-city"><span class="flag">' + p.flag + '</span>' + p.city + '</div>' +
        '<div class="pc-fact">' + p.fact + '</div>' +
        '<div class="pc-date">' + tf('pb.earnedOn', { date: p.dateEarned }) + '</div>';
    } else {
      card.innerHTML =
        '<div class="pc-photo"><img class="pc-img" src="assets/postcards/city-' + String(i + 1).padStart(2, '0') + '.png" alt=""><div class="pc-lock-badge">🔒</div></div>' +
        '<div class="pc-city"><span class="flag">' + city.flag + '</span>' + city.name + ' 🔒</div>' +
        '<div class="pc-date">لم تُفتح بعد</div>';
    }
    grid.appendChild(card);
  });
  sheet.appendChild(grid);

  const close = el('button', 'btn btn-primary', t('settings.done'));
  close.style.width = '100%'; close.style.marginTop = '16px';
  close.addEventListener('click', () => mask.remove());
  sheet.appendChild(close);
  mask.appendChild(sheet);
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
  or.appendChild(mask);
}

// ============================================================
// المقدمة السينمائية (Onboarding) — ٣ لقطات، تظهر عند أول تشغيل فقط
// ============================================================
function showOnboarding() {
  try { if (localStorage.getItem('bg:onboarded')) return; } catch {}
  const root = el('div', 'onboard');
  const topbar = el('div', 'onboard-topbar');
  const back = el('button', 'onboard-circle', mi('arrow_back'));
  const help = el('button', 'onboard-circle', mi('help'));
  topbar.append(back, help);

  const main = el('div', 'onboard-main');
  const head = el('div', 'onboard-head');
  const frame = el('div', 'onboard-frame');
  const dots = el('div', 'onboard-dots');
  const card = el('div', 'onboard-card');
  const dest = el('div', 'onboard-dest');
  dest.innerHTML =
    '<div class="ob-dest-ico">' + mi('flight_takeoff') + '</div>' +
    '<div class="ob-dest-txt"><b>الوجهة: دبي</b><span class="ob-dest-sub">' + mi('star') + ' جولة المبتدئين</span></div>';
  const cta = el('button', 'onboard-cta', '<span>' + t('ob.next') + '</span>' + mi('arrow_forward'));
  card.append(dest, cta);

  const skip = el('button', 'onboard-skip', t('ob.skip'));
  const next = cta;
  const frames = [
    { v: 'v1', visual: '<div class="ob-landmark">' + (CITY_LANDMARKS[0] || '') + '</div>', title: t('ob.title1'), sub: t('ob.sub1') },
    { v: 'v2', visual: '<div class="ob-grid"><span>2</span><span>8</span><span>4</span><span>9</span><span>1</span><span>7</span><span>5</span><span>6</span><span>3</span></div>', title: t('ob.title2'), sub: t('ob.sub2') },
    { v: 'v3', visual: '<div class="ob-landmark">' + (CITY_LANDMARKS[6] || '') + '</div>', title: t('ob.title3'), sub: t('ob.sub3') },
  ];
  let idx = 0;

  function renderFrame(i) {
    idx = i;
    const f = frames[i];
    frame.innerHTML = '';
    frame.appendChild(el('div', 'onboard-visual ' + f.v, f.visual));
    head.innerHTML = '';
    head.appendChild(el('h1', 'onboard-title', f.title));
    head.appendChild(el('p', 'onboard-sub', f.sub));
    dots.innerHTML = '';
    frames.forEach((_, k) => dots.appendChild(el('span', 'dot' + (k === i ? ' active' : ''))));
    cta.innerHTML = '<span>' + ((i === frames.length - 1) ? t('ob.start') : t('ob.next')) + '</span>' + mi('arrow_forward');
  }
  function finish() {
    try { localStorage.setItem('bg:onboarded', '1'); } catch {}
    root.remove();
  }
  skip.addEventListener('click', finish);
  next.addEventListener('click', () => { if (idx < frames.length - 1) renderFrame(idx + 1); else finish(); });
  back.addEventListener('click', finish);

  main.append(head, frame, dots, card);
  root.append(topbar, main);
  renderFrame(0);
  document.body.appendChild(root);
}

export function renderLobby() {
  syncPostcards(); // مزامنة بطاقات المدن المكتملة (عند الإقلاع/الاستعادة)
  if (claimDailyReward()) toast('🎁 +20 🪙 مكافأة يومية');
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.style.paddingBottom = '130px';
  const coins = getCoins();
  const streak = getStreak();

  const header = el('div', 'lobby-header');
  const logo = el('div', 'lobby-logo', '<img src="assets/logo.png" alt="Brain Games" style="width:100%;height:100%;object-fit:cover;border-radius:14px">');
  const title = el('div', 'lobby-title', t('app.brand'));
  const coinPill = el('button', 'coin-pill', '<span class="coin-ico"></span> <b>' + coins + '</b>');
  coinPill.addEventListener('click', openStore);
  const gear = el('button', 'icon-btn', IC.settings);
  gear.title = t('settings.title');
  gear.addEventListener('click', openSettings);
  header.append(logo, title, coinPill, gear);
  app.appendChild(header);

  // بطاقة «جولة العالم» — هوية اللوبي (كما في brain_match_dubai_home)
  app.appendChild(cityHero());

  const daily = el('div', 'daily-card');
  const inner = el('div', 'inner');
  inner.appendChild(el('div', 'fire', mi('local_fire_department')));
  inner.appendChild(el('div', '', '<h3>' + t('daily.title') + '!</h3><p>' + (isDailyCompleted() ? '✓ مكتمل اليوم' : 'أكمل اللغز اليومي واربح 50 🪙') + '</p>'));
  const go = el('button', 'go', t('daily.play'));
  go.addEventListener('click', () => renderGame(numberMatchModule, { isDaily: true }));
  inner.appendChild(go);
  daily.appendChild(inner);
  app.appendChild(daily);

  app.appendChild(streakCalendar(streak));

  app.appendChild(el('h2', 'lobby-h2', t('games.featured')));
  const grid = el('div', 'games-grid');
  registry.forEach(mod => grid.appendChild(gameCard(mod)));
  app.appendChild(grid);

  // شريط التنقل العائم (4 تبويبات — كما في design: home نشط)
  const tabbar = el('div', 'tabbar');
  tabbar.appendChild(tab('home', t('tab.home'), true));
  tabbar.appendChild(tab('shopping_bag', t('store.title'), false, openStore));
  tabbar.appendChild(tab('leaderboard', t('tab.stats'), false, openStats));
  tabbar.appendChild(tab('settings', t('tab.settings'), false, openSettings));
  app.appendChild(tabbar);

  // المقدمة السينمائية عند أول تشغيل فقط
  showOnboarding();
}

function openStore() {
  const or = document.getElementById('overlay-root');
  or.innerHTML = '';
  const mask = el('div', 'sheet-mask');
  const sheet = el('div', 'sheet');
  sheet.innerHTML = '<h3>' + mi('storefront') + ' ' + t('store.title') + '</h3><div class="sub">' + getCoins() + ' ' + t('store.coins') + '</div>';
  const grid = el('div', 'store-grid');
  purchases.getProductList().forEach(p => {
    grid.appendChild(packCard(p.qty, purchases.getPrice(p.id), p.best, p.id));
  });
  refreshStorePrices(grid);
  sheet.appendChild(grid);
  sheet.appendChild(el('div', '', '<div style="font-weight:700;margin:18px 0 4px;display:flex;align-items:center;gap:6px">' + mi('shopping_bag') + ' الاستهلاكيات</div>'));
  sheet.appendChild(consumeRow(mi('refresh') + ' محاولة إضافية (خلط الأرقام)', '100'));
  sheet.appendChild(consumeRow(mi('restart_alt') + ' متابعة (سودوكو)', '100'));
  const close = el('button', 'btn btn-primary', t('settings.done'));
  close.style.width = '100%'; close.style.marginTop = '16px';
  close.addEventListener('click', () => mask.remove());
  sheet.appendChild(close);
  mask.appendChild(sheet);
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
  or.appendChild(mask);
}

function packCard(qty, price, best, productId) {
  const c = el('div', 'pack-card' + (best ? ' best' : ''));
  c.dataset.productId = productId || '';
  c.innerHTML = '<div class="qty">' + mi('monetization_on') + ' ' + qty + '</div><div class="price">' + price + '</div>' + (best ? '<div class="tag">' + mi('star') + ' ' + t('store.best') + '</div>' : '');
  c.addEventListener('click', () => handlePackClick(productId, qty));
  return c;
}

// تحديث أسعار البطاقات ببيانات المتجر الحقيقية (يُستدعى عند فتح المتجر وعند تحميل المنتجات)
function refreshStorePrices(grid) {
  if (!grid) return;
  grid.querySelectorAll('.pack-card').forEach(card => {
    const id = card.dataset.productId;
    if (!id) return;
    const price = purchases.getPrice(id);
    if (!price) return;
    const priceNode = card.querySelector('.price');
    if (priceNode) priceNode.textContent = price;
  });
}

// بدء الشراء الحقيقي عبر خدمة IAP
function handlePackClick(productId, qty) {
  if (!productId || !purchases.hasNative()) {
    toast('الشراء متاح داخل التطبيق على الجهاز فقط');
    return;
  }
  if (!purchases.isAvailable()) {
    toast('جارٍ تحميل المنتجات…');
    return;
  }
  purchases.buyPack(productId).then(res => {
    if (res.ok) return; // ستظهر نافذة Apple للشراء تلقائيًا
    if (res.reason === 'cancelled') toast('تم إلغاء عملية الشراء');
    else toast('تعذّر إتمام عملية الشراء');
  }).catch(() => toast('تعذّر إتمام عملية الشراء'));
}

// عند تحميل/تحديث المنتجات أعد عرض الأسعار في المتجر المفتوح
purchases.onProductsUpdated(() => {
  const grid = document.querySelector('.sheet .store-grid');
  if (grid) refreshStorePrices(grid);
});

// عند منح العملات بعد شراء ناجح، حدّث رصيد المتجر واللوبي
purchases.onPurchaseGranted(() => {
  const sheet = document.querySelector('.sheet');
  const sub = sheet && sheet.querySelector('.sub');
  if (sub) sub.textContent = getCoins() + ' ' + t('store.coins');
  renderLobby();
});

function consumeRow(name, cost) {
  const r = el('div', 'consume-row');
  r.innerHTML = '<span class="cname" style="display:flex;align-items:center;gap:6px">' + name + '</span><span class="ccost">' + mi('monetization_on') + ' ' + cost + '</span>';
  return r;
}

function compareVersions(a, b) {
  const norm = (s) => String(s || '').split('.').map(n => parseInt(n, 10) || 0);
  const A = norm(a), B = norm(b);
  const len = Math.max(A.length, B.length);
  for (let i = 0; i < len; i++) {
    const x = A[i] || 0, y = B[i] || 0;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

function openSettings() {
  const or = document.getElementById('overlay-root');
  or.innerHTML = '';
  const mask = el('div', 'sheet-mask');
  const sheet = el('div', 'sheet');
  sheet.innerHTML = '<h3>' + t('settings.title') + '</h3><div class="sub">' + t('settings.subtitle') + '</div>';

  const langRow = el('div', 'consume-row');
  const langBtns = el('div', '', '<button class="btn ' + (getLang() === 'ar' ? 'btn-primary' : 'btn-ghost') + '" data-l="ar">العربية</button> <button class="btn ' + (getLang() === 'en' ? 'btn-primary' : 'btn-ghost') + '" data-l="en">English</button>');
  langRow.innerHTML = '<span class="cname">' + t('settings.language') + '</span>';
  langRow.appendChild(langBtns);
  sheet.appendChild(langRow);
  langBtns.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { setLang(b.dataset.l); renderLobby(); openSettings(); }));

  sheet.appendChild(toggleRow(t('settings.dark'), isDark(), v => { setTheme(v ? 'dark' : 'light'); renderLobby(); openSettings(); }));
  sheet.appendChild(toggleRow(t('settings.sound'), settings.sound, v => { settings.sound = v; setSound(v); save(); }));
  sheet.appendChild(toggleRow(t('settings.haptics'), settings.haptics, v => { settings.haptics = v; setHaptics(v); save(); }));

  const th = el('div', '');
  th.innerHTML = '<div style="font-weight:700;margin:14px 0 8px">' + t('settings.appearance') + '</div>';
  const sw = el('div', ''); sw.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px';
  THEMES.forEach(tm => {
    const b = el('button', '');
    b.style.cssText = 'width:50px;height:50px;border-radius:16px;background:' + tm.sw + ';border:3px solid ' + (getTheme() === tm.id ? 'var(--secondary)' : 'var(--surface-edge)') + ';box-shadow:var(--shadow-cell)';
    b.title = tm.name;
    b.addEventListener('click', () => { setTheme(tm.id); renderLobby(); openSettings(); });
    sw.appendChild(b);
  });
  th.appendChild(sw);
  sheet.appendChild(th);

  // الحفظ السحابي
  const cloudTitle = el('div', '', '<div style="font-weight:700;margin:14px 0 8px">☁️ الحفظ السحابي</div>');
  sheet.appendChild(cloudTitle);
  const exportBtn = el('button', 'btn btn-ghost', '📋 نسخ رمز الحفظ');
  exportBtn.style.width = '100%';
  exportBtn.addEventListener('click', () => {
    const code = exportProgress();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => toast('✅ تم نسخ رمز الحفظ')).catch(() => prompt('انسخ رمز الحفظ:', code));
    } else { prompt('انسخ رمز الحفظ:', code); }
  });
  sheet.appendChild(exportBtn);
  const importBtn = el('button', 'btn btn-ghost', '📥 استعادة من رمز');
  importBtn.style.width = '100%'; importBtn.style.marginTop = '8px';
  importBtn.addEventListener('click', () => {
    const code = prompt('الصق رمز الحفظ:');
    if (code && importProgress(code)) { toast('✅ تمت الاستعادة'); setTimeout(() => location.reload(), 800); }
    else if (code) toast('❌ رمز غير صالح');
  });
  sheet.appendChild(importBtn);

  // 🔄 التحديثات (Capgo OTA)
  sheet.appendChild(el('div', '', '<div style="font-weight:700;margin:14px 0 8px">🔄 التحديثات</div>'));
  let currentVersion = '';
  let nativeVersion = '';
  const statusLabel = el('span', 'cname', 'الإصدار الحالي: جارٍ القراءة...');
  const statusRow = el('div', 'consume-row');
  statusRow.appendChild(statusLabel);
  sheet.appendChild(statusRow);

  // قراءة النسخة المثبتة فعليًا (الحزمة النشطة + نسخة التطبيق الأصلية native)
  (async () => {
    try {
      const CapacitorUpdater = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater;
      if (!CapacitorUpdater) return;
      const cur = await CapacitorUpdater.current();
      nativeVersion = (cur && cur.native) || '';
      const b = cur && cur.bundle;
      currentVersion = (b && b.id !== 'builtin' && b.version) || nativeVersion || '1.0';
      statusLabel.textContent = 'الإصدار الحالي: ' + currentVersion + (nativeVersion ? ' · التطبيق: ' + nativeVersion : '');
    } catch {
      statusLabel.textContent = 'الإصدار الحالي: 1.0';
    }
  })();

  let currentLatest = null;
  let updateBtn = null;
  const checkBtn = el('button', 'btn btn-ghost', '🔍 البحث عن تحديثات');
  checkBtn.style.width = '100%';
  checkBtn.addEventListener('click', async () => {
    checkBtn.textContent = 'جارٍ الفحص...';
    try {
      const CapacitorUpdater = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater;
      if (!CapacitorUpdater) { toast('التحقق من التحديثات متاح على الجهاز فقط'); return; }
      const latest = await CapacitorUpdater.getLatest();
      // استجابة أصلية تصنَّف عبر kind أو توفر رابط تنزيل — غياب الاثنين يعني ويب/غير متاح
      const isNative = !!(latest && (latest.kind != null || latest.url));
      if (!latest || !isNative) { toast('التحقق من التحديثات متاح على الجهاز فقط'); return; }
      if (latest.kind === 'up_to_date') {
        statusLabel.textContent = 'الإصدار الحالي: ' + (latest.version || currentVersion) + ' (أحدث إصدار ✅)';
        toast('أنت على أحدث إصدار ✅');
      } else if (latest.kind === 'blocked') {
        toast('⛔ التحديث محظور: ' + (latest.message || latest.error || 'حزمة التحديث أقدم من نسخة التطبيق المثبتة'));
      } else if (latest.url) {
        currentLatest = latest;
        statusLabel.textContent = 'تحديث متوفر: ' + latest.version;
        if (!updateBtn) {
          updateBtn = el('button', 'btn btn-primary', '⬇️ تحديث الآن');
          updateBtn.style.width = '100%';
          updateBtn.style.marginTop = '8px';
          updateBtn.addEventListener('click', async () => {
            const L = currentLatest;
            if (!L || !L.url) { toast('التحقق من التحديثات متاح على الجهاز فقط'); return; }
            updateBtn.textContent = 'جارٍ التنزيل...';
            try {
              const CU = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater;
              if (!CU) { toast('التحقق من التحديثات متاح على الجهاز فقط'); return; }
              const bundle = await CU.download({ version: L.version, url: L.url });
              const id = bundle && (bundle.id || bundle.version);
              if (!id) throw new Error('تعذر الحصول على معرّف الحزمة');
              await CU.next({ id });
              toast('تم تنزيل التحديث — أعد فتح التطبيق لتفعيله');
            } catch (e) {
              toast(e && e.message ? e.message : 'فشل تنزيل التحديث');
            } finally {
              updateBtn.textContent = '⬇️ تحديث الآن';
            }
          });
          sheet.insertBefore(updateBtn, close);
        }
      } else if (compareVersions(latest.version, currentVersion) <= 0) {
        statusLabel.textContent = 'الإصدار الحالي: ' + currentVersion + ' (أحدث إصدار ✅)';
        toast('أنت على أحدث إصدار ✅');
      } else {
        toast('التحقق من التحديثات متاح على الجهاز فقط');
      }
    } catch (e) {
      toast(e && e.message && !/in web|unavailable|not available/i.test(String(e.message)) ? e.message : 'التحقق من التحديثات متاح على الجهاز فقط');
    } finally {
      checkBtn.textContent = '🔍 البحث عن تحديثات';
    }
  });
  sheet.appendChild(checkBtn);

  // 👨‍💼 لوحة المدير — إرسال هدية عملات لكل اللاعبين
  sheet.appendChild(el('div', '', '<div style="font-weight:700;margin:14px 0 8px">👨‍💼 إعدادات المدير</div>'));
  const adminKey = el('input', '');
  adminKey.type = 'password';
  adminKey.placeholder = 'كلمة سر المدير';
  adminKey.style.cssText = 'width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--surface-edge);background:var(--bg-elevated);margin-bottom:8px;font-family:inherit;box-sizing:border-box';
  const adminCoins = el('input', '');
  adminCoins.type = 'number';
  adminCoins.placeholder = 'عدد العملات (مثال: 500)';
  adminCoins.style.cssText = 'width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--surface-edge);background:var(--bg-elevated);margin-bottom:8px;font-family:inherit;box-sizing:border-box';
  const adminMsg = el('input', '');
  adminMsg.type = 'text';
  adminMsg.value = 'هدية من sss';
  adminMsg.style.cssText = 'width:100%;padding:12px 14px;border-radius:12px;border:1px solid var(--surface-edge);background:var(--bg-elevated);margin-bottom:8px;font-family:inherit;box-sizing:border-box';
  const adminSend = el('button', 'btn btn-ghost', '🎁 إرسال الهدية للجميع');
  adminSend.style.width = '100%';
  adminSend.addEventListener('click', async () => {
    const coins = Number(adminCoins.value);
    if (!adminKey.value) { toast('أدخل كلمة سر المدير'); return; }
    if (!coins || coins < 1) { toast('أدخل عدد عملات صحيح'); return; }
    adminSend.textContent = 'جارٍ الإرسال...';
    try {
      await createGift(adminKey.value, coins, adminMsg.value || 'هدية من sss');
      toast('✅ تم إرسال الهدية (' + coins + ' 🪙) لكل اللاعبين');
      adminCoins.value = '';
    } catch (e) {
      toast('⚠️ ' + (e && e.message ? e.message : 'فشل الإرسال'));
    } finally {
      adminSend.textContent = '🎁 إرسال الهدية للجميع';
    }
  });
  sheet.appendChild(adminKey);
  sheet.appendChild(adminCoins);
  sheet.appendChild(adminMsg);
  sheet.appendChild(adminSend);

  const close = el('button', 'btn btn-primary', t('settings.done'));
  close.style.width = '100%';
  close.addEventListener('click', () => mask.remove());
  sheet.appendChild(close);
  mask.appendChild(sheet);
  mask.addEventListener('click', e => { if (e.target === mask) mask.remove(); });
  or.appendChild(mask);
}

function toggleRow(label, initial, onChange) {
  const row = el('div', 'consume-row');
  const lab = el('span', 'cname', label);
  const sw = el('button', 'switch' + (initial ? ' on' : ''));
  sw.innerHTML = '<span class="knob"></span>';
  let on = initial;
  sw.addEventListener('click', () => { on = !on; sw.classList.toggle('on', on); onChange(on); });
  row.append(lab, sw);
  return row;
}

export function mountAdBanner() {
  if (!isAdsEnabled()) return; // الفترة المجانية: لا إعلانات
  initAds().then(() => {
    if (isMockMode()) {
      // وضع المحاكاة (ويب): بانر placeholder موضوع فوق شريط التنقل
      const adBanner = el('div', 'ad-banner');
      adBanner.id = 'ad-banner';
      adBanner.innerHTML = '📢 ' + t('ad') + ' · Brain Games';
      document.body.appendChild(adBanner);
    } else {
      showBanner(); // بانر AdMob حقيقي على المنصة الأصلية
    }
  }).catch(() => {});
}
