// التوطين ثنائي اللغة (عربي / إنجليزي) — JSON dictionary + إعادة رسم بدون إعادة تحميل
const DICT = {
  'app.subtitle': { ar: 'ألعاب عقل', en: 'Brain Games' },
  'app.brand': { ar: 'ألعاب الذكاء', en: 'Brain Match' },
  'tab.games': { ar: 'الألعاب', en: 'Games' },
  'tab.home': { ar: 'الرئيسية', en: 'Home' },
  'tab.stats': { ar: 'الإحصائيات', en: 'Stats' },
  'tab.settings': { ar: 'الإعدادات', en: 'Settings' },
  'tab.challenges': { ar: 'تحديات', en: 'Challenges' },
  'tab.settings': { ar: 'الإعدادات', en: 'Settings' },
  'stat.rank': { ar: 'الرتبة', en: 'Rank' },
  'stat.streak': { ar: 'سلسلة أيام', en: 'Streak' },
  'stat.games': { ar: 'ألعاب', en: 'Games' },
  'games.title': { ar: 'الألعاب', en: 'Games' },
  'games.subtitle': { ar: 'اختر لعبة للعب', en: 'Choose a game to play' },
  'games.featured': { ar: 'ألعاب مميزة', en: 'Featured Games' },
  'settings.title': { ar: 'الإعدادات', en: 'Settings' },
  'settings.subtitle': { ar: 'خصّص تجربتك', en: 'Customize your experience' },
  'settings.appearance': { ar: 'المظهر', en: 'Appearance' },
  'settings.language': { ar: 'اللغة', en: 'Language' },
  'settings.sound': { ar: 'الصوت', en: 'Sound' },
  'settings.haptics': { ar: 'الاهتزاز', en: 'Haptics' },
  'settings.dark': { ar: 'الوضع الداكن', en: 'Dark Mode' },
  'settings.done': { ar: 'تم', en: 'Done' },
  'store.title': { ar: 'المتجر', en: 'Store' },
  'store.coins': { ar: 'عملة', en: 'coins' },
  'store.buy500': { ar: '500 عملة', en: '500 Coins' },
  'store.buy1500': { ar: '1500 عملة', en: '1500 Coins' },
  'store.best': { ar: 'الأفضل قيمة', en: 'Best Value' },
  'store.hint': { ar: 'تلميح ذكي', en: 'Smart Hint' },
  'store.undo': { ar: 'تراجع', en: 'Undo' },
  'store.hint.cost': { ar: '100 عملة', en: '100 coins' },
  'store.undo.cost': { ar: '50 عملة', en: '50 coins' },
  'store.purchase': { ar: 'شراء', en: 'Buy' },
  'store.insufficient': { ar: 'عملات غير كافية', en: 'Not enough coins' },
  'store.added': { ar: 'أُضيفت العملات!', en: 'Coins added!' },
  'daily.title': { ar: 'تحدي اليوم', en: 'Daily Challenge' },
  'daily.play': { ar: 'العب', en: 'Play' },
  'ad': { ar: 'إعلان', en: 'Ad' },
  'outofmoves.title': { ar: 'لا توجد حركات!', en: 'Out of Moves!' },
  'outofmoves.watch': { ar: 'شاهد إعلانًا +5 حركات', en: 'Watch Ad for +5 Moves' },
  'outofmoves.later': { ar: 'لاحقًا', en: 'Later' },
  'back': { ar: 'رجوع', en: 'Back' },
  'new': { ar: 'جديد', en: 'New' },
  'hint': { ar: 'تلميح', en: 'Hint' },
  'undo': { ar: 'تراجع', en: 'Undo' },
  'addrows': { ar: 'إضافة صفوف', en: 'Add Rows' },
  'round': { ar: 'الدور', en: 'Round' },
  'of10': { ar: 'من 10', en: 'of 10' },
  'challenge.soon': { ar: 'التحدي اليومي قادم قريبًا', en: 'Daily challenge coming soon' },
  // لعبة مطابقة الأرقام
  'nm.score': { ar: 'النقاط', en: 'Score' },
  'nm.best': { ar: 'الأفضل', en: 'Best' },
  'nm.left': { ar: 'المتبقي', en: 'Left' },
  'nm.round': { ar: 'الدور', en: 'Round' },
  'nm.of10': { ar: 'من 10', en: 'of 10' },
  'nm.addrows': { ar: 'إضافة صفوف', en: 'Add Rows' },
  'nm.hint': { ar: 'تلميح', en: 'Hint' },
  'nm.undo': { ar: 'تراجع', en: 'Undo' },
  'nm.new': { ar: 'جديد', en: 'New' },
  'nm.win': { ar: 'أحسنت!', en: 'Well done!' },
  'nm.lose': { ar: 'قريب جدًا!', en: 'So close!' },
  'nm.cityDone': { ar: 'مدينة مكتملة!', en: 'City Complete!' },
  'nm.nextRound': { ar: 'الدور التالي', en: 'Next Round' },
  'nm.retry': { ar: 'إعادة المحاولة', en: 'Retry' },
  'nm.playAgain': { ar: 'العب مجددًا', en: 'Play Again' },
  'nm.backLobby': { ar: 'رجوع للقائمة', en: 'Back to Menu' },
  'nm.record': { ar: 'رقم قياسي جديد!', en: 'New Record!' },
  'nm.noMoves': { ar: 'لا توجد حركات!', en: 'Out of Moves!' },
  'nm.combo': { ar: 'متتالية', en: 'Combo' },
  'nm.watchAd': { ar: 'شاهد إعلانًا +5 حركات', en: 'Watch Ad for +5 Moves' },
  'nm.giveUp': { ar: 'استسلم', en: 'Give Up' },
  // سودوكو
  'sd.time': { ar: 'الوقت', en: 'Time' },
  'sd.mistakes': { ar: 'أخطاء', en: 'Mistakes' },
  'sd.level': { ar: 'المرحلة', en: 'Level' },
  'sd.pencil': { ar: 'قلم', en: 'Pencil' },
  'sd.erase': { ar: 'مسح', en: 'Erase' },
  'sd.win': { ar: 'أكملت اللغز!', en: 'Puzzle Complete!' },
  'sd.next': { ar: 'المرحلة التالية', en: 'Next Level' },
  'sd.lose': { ar: '3 أخطاء!', en: '3 Mistakes!' },
  // جولة العالم (World Tour) — البطاقة البطلة في اللوبي
  'wt.title': { ar: 'جولة حول العالم', en: 'World Tour' },
  'wt.subtitle': { ar: 'سلسلة المدن — Linked Cities', en: 'Linked Cities' },
  'wt.continue': { ar: 'أكمل الرحلة', en: 'Continue Journey' },
  'wt.postcards': { ar: 'كتاب البطاقات', en: 'Postcard Book' },
  'wt.cityOf': { ar: 'المدينة {n} من {total}', en: 'City {n} of {total}' },
  'wt.roundOf': { ar: 'الدور {r} من 10', en: 'Round {r} of 10' },
  'wt.visit': { ar: 'مرّر وستفتح مدينة جديدة', en: 'Clear it and a new city opens' },
  'brand.mechanic': { ar: 'سلسلة المدن — Linked Cities', en: 'Linked Cities' },
  // كتاب البطاقات (Postcard Book)
  'pb.title': { ar: 'كتاب البطاقات', en: 'Postcard Book' },
  'pb.subtitle': { ar: 'ذكرياتك من رحلة حول العالم', en: 'Your world-tour memories' },
  'pb.progress': { ar: 'البطاقات: {n} من {total}', en: 'Postcards: {n} of {total}' },
  'pb.empty': { ar: 'لم تجمع بطاقات بعد — أكمل مدينة لتفتح بطاقتها', en: 'No postcards yet — complete a city to unlock its card' },
  'pb.locked': { ar: '؟ ؟ ؟', en: '? ? ?' },
  'pb.earnedOn': { ar: 'حصلت عليها في {date}', en: 'Earned on {date}' },
  'pb.howto': { ar: 'أكمل ١٠ أدوار في كل مدينة لتفتح بطاقتها', en: 'Clear 10 rounds in each city to unlock its postcard' },
  'pb.fact': { ar: 'معلومة', en: 'Did you know' },
  // التشغيل السينمائي (المقدمة التمهيدية)
  'ob.title1': { ar: 'رحلتك الأولى إلى دبي', en: 'Your first journey to Dubai' },
  'ob.sub1': { ar: 'ابدأ رحلتك حول العالم من مدينة برج خليفة', en: 'Start your world tour from the city of Burj Khalifa' },
  'ob.title2': { ar: 'امسح 10 جولات من الأرقام', en: 'Clear 10 rounds of numbers' },
  'ob.sub2': { ar: 'طبابق الأزواج المتطابقة أو التي مجموعها ١٠', en: 'Match equal pairs or pairs that add to 10' },
  'ob.title3': { ar: 'اجمع بطاقات المدن حول العالم', en: 'Collect city postcards around the world' },
  'ob.sub3': { ar: 'بعد كل مدينة انطلق إلى مدينة جديدة واجمع بطاقاتها', en: 'Travel to a new city after each one and collect its postcard' },
  'ob.next': { ar: 'التالي', en: 'Next' },
  'ob.skip': { ar: 'تخطّي', en: 'Skip' },
  'ob.start': { ar: 'هيّا بنا', en: "Let's go" },
};

let currentLang = (() => { try { return localStorage.getItem('bg:lang') || 'ar'; } catch { return 'ar'; } })();

export function getLang() { return currentLang; }

export function setLang(lang) {
  currentLang = (lang === 'en') ? 'en' : 'ar';
  try { localStorage.setItem('bg:lang', currentLang); } catch {}
  applyLang();
  document.dispatchEvent(new CustomEvent('bg:lang'));
}

export function applyLang() {
  document.documentElement.setAttribute('lang', currentLang);
  document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
}

export function t(key) {
  const e = DICT[key];
  return e ? (e[currentLang] || e.ar) : key;
}
