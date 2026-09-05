// تأثيرات مشتركة: توست، قصاصات، نقاط متطايرة، بطاقة نتيجة
function fxRoot(id) {
  let r = document.getElementById(id);
  if (!r) { r = document.createElement('div'); r.id = id; document.body.appendChild(r); }
  return r;
}

export function toast(msg, ms = 2200) {
  const tr = fxRoot('toast-root');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  tr.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

const CONF_COLORS = ['#F2705A','#F7B33B','#2EC4A8','#4FA3E8','#EC4899','#8B5CF6','#FF7BAC'];
/* لوحة ألوان «المدينة» المطابقة للاحتفال */
const CITY_CONF_COLORS = ['#F2705A','#7C4BD6','#2EC4A8','#4FA3E8','#EC4899','#B48CFF','#F7B33B','#FF7BAC'];

export function confetti(count = 90, opts = {}) {
  // وضع المطر القديم (احتياطي صريح)
  if (opts.burst === false) return rainConfetti(count, opts);
  // الافتراضيّ: «فتح المدينة» — دفعات بلون المدينة متدرّجة (تُستدعى عند الفوز فقط)
  stagedCityConfetti(count);
}

/* مطر القصاصات القديم (احتياطي: opts.burst === false) */
function rainConfetti(count, opts) {
  const fr = fxRoot('fx-root');
  const colors = opts.colors || CITY_CONF_COLORS;
  for (let i = 0; i < count; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = (Math.random() * 100) + 'vw';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (2 + Math.random() * 2.4) + 's';
    c.style.animationDelay = (Math.random() * 0.9) + 's';
    c.style.opacity = 0.9;
    fr.appendChild(c);
    setTimeout(() => c.remove(), 5200);
  }
}

/* دفعة قصاصات «فتح المدينة» تنطلق من مركز الشاشة */
function burstConfetti(opts) {
  const fr = fxRoot('fx-root');
  const colors = opts.colors || CITY_CONF_COLORS;
  const n = opts.count || 46;
  const origin = opts.origin || { x: 50, y: 46 };
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti burst';
    const ang = (Math.PI * 2 * i) / n + (Math.random() * 0.5);
    const dx = Math.cos(ang) * (36 + Math.random() * 90);
    const dy = Math.sin(ang) * (26 + Math.random() * 60) - 40; // ميل للأعلى
    c.style.setProperty('--bx', (dx).toFixed(2) + 'vw');
    c.style.setProperty('--by', (dy).toFixed(2) + 'vh');
    c.style.left = origin.x + 'vw';
    c.style.top = origin.y + 'vh';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = (0.9 + Math.random() * 0.7) + 's';
    c.style.animationDelay = ((i % 6) * 0.05) + 's';
    fr.appendChild(c);
    setTimeout(() => c.remove(), 1800);
  }
}

/* تسلسل «فتح المدينة»: دفعات متدرّجة بلون المدينة (يُستدعى عند الفوز فقط) */
function stagedCityConfetti(total = 90) {
  const w1 = Math.round(total * 0.4);
  const w2 = Math.round(total * 0.34);
  const w3 = Math.max(10, total - w1 - w2);
  burstConfetti({ count: w1 });                              // الدفعة المركزية
  setTimeout(() => burstConfetti({ count: w2, origin: { x: 24, y: 44 } }), 340);  // يسار
  setTimeout(() => burstConfetti({ count: w3, origin: { x: 76, y: 44 } }), 620);  // يمين
}

export function floatScore(x, y, text) {
  const fr = fxRoot('fx-root');
  const f = document.createElement('div');
  f.className = 'float-score';
  f.textContent = text;
  f.style.left = x + 'px';
  f.style.top = y + 'px';
  fr.appendChild(f);
  setTimeout(() => f.remove(), 760);
}

export function resultCard(cfg) {
  const or = fxRoot('overlay-root');
  const mask = document.createElement('div');
  mask.className = 'result-overlay';
  const card = document.createElement('div');
  card.className = 'result-card win-card';

  const trophy = document.createElement('div');
  trophy.className = 'result-trophy';
  trophy.textContent = cfg.emoji || '🏆';
  card.appendChild(trophy);

  const h = document.createElement('h1'); h.className = 'result-title'; h.textContent = cfg.title || ''; card.appendChild(h);
  if (cfg.subtitle) { const sub = document.createElement('p'); sub.className = 'result-subtitle'; sub.textContent = cfg.subtitle; card.appendChild(sub); }

  const summary = document.createElement('div'); summary.className = 'result-summary';
  const head = document.createElement('div'); head.className = 'result-summary-head';
  head.innerHTML = '<h2>ملخص الجولة</h2>' + (cfg.reward != null ? '<div class="result-reward"><span class="material-symbols-outlined">monetization_on</span>+' + cfg.reward + '</div>' : '');
  summary.appendChild(head);
  const stats = document.createElement('div'); stats.className = 'result-stats';
  if (cfg.score != null) { const s = document.createElement('div'); s.className = 'result-stat'; s.innerHTML = '<span class="material-symbols-outlined">military_tech</span><span class="lbl">النقاط</span><b>' + cfg.score + '</b>'; stats.appendChild(s); }
  if (cfg.stat2) { const s = document.createElement('div'); s.className = 'result-stat'; s.innerHTML = '<span class="material-symbols-outlined">' + cfg.stat2.icon + '</span><span class="lbl">' + cfg.stat2.label + '</span><b>' + cfg.stat2.value + '</b>'; stats.appendChild(s); }
  summary.appendChild(stats);
  card.appendChild(summary);

  if (cfg.note) { const n = document.createElement('div'); n.className = 'result-note'; n.textContent = cfg.note; card.appendChild(n); }

  const btns = document.createElement('div'); btns.className = 'btns';
  (cfg.buttons || []).forEach((b, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.kind || (i === 0 ? 'btn-primary' : 'btn-ghost'));
    btn.innerHTML = '<span>' + b.label + '</span>' + (b.icon ? '<span class="material-symbols-outlined">' + b.icon + '</span>' : '');
    btn.addEventListener('click', () => { close(); if (b.onClick) b.onClick(); });
    btns.appendChild(btn);
  });
  card.appendChild(btns);
  mask.appendChild(card);
  or.appendChild(mask);

  function close() { mask.remove(); }
  return { close };
}

/* ================================================================
   مُثري data-val / data-game: يمنح CSS تدرّج هوية «Skyline / Energy»
   للعبة 2048 دون تعديل ملفّات الألعاب. يضيف فقط سمات بيانات (لا يغيّر
   السلوك) — آمن تمامًا وبدون أثر على المنطق.
   ================================================================ */
function processGameNodes(root) {
  if (!root || root.nodeType !== 1) return;
  const boards = [];
  if (root.matches && root.matches('.board')) boards.push(root);
  if (root.querySelectorAll) boards.push(...root.querySelectorAll('.board'));
  for (const b of boards) {
    if (!b.dataset.game) {
      const tc = (b.style.gridTemplateColumns || '').replace(/\s+/g, '');
      if (tc.startsWith('repeat(4')) b.dataset.game = '2048';
    }
  }
  const cells = [];
  if (root.matches && root.matches('.cell')) cells.push(root);
  if (root.querySelectorAll) cells.push(...root.querySelectorAll('.cell'));
  for (const cell of cells) {
    if (cell.dataset && cell.dataset.val !== undefined) continue;
    if (!cell.closest || !cell.closest('.board')) continue;   // أرقام اللوحة فقط (ليس سودوكو)
    const txt = (cell.textContent || '').trim();
    if (/^\d+$/.test(txt)) cell.setAttribute('data-val', txt);
  }
}

function installTileEnricher() {
  if (document.__fxEnricher) return;
  document.__fxEnricher = true;
  processGameNodes(document.body);
  try {
    const mo = new MutationObserver(muts => {
      for (const m of muts) for (const n of m.addedNodes) processGameNodes(n);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* تجاهُل: لا يزال التدرّج الأساسي يعمل */ }
}
installTileEnricher();