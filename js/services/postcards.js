// postcards.js — كتاب البطاقات (المجموعة): تخزين بطاقات المدن المكتملة
//
// عند إتمام مدينة (كل أدوارها العشرة) في لعبة Number Match تُحفظ بطاقة
// {city, flag, landmarkSvg, dateEarned, fact}. تُخزَّن في localStorage تحت المفتاح 'bg:postcards'.
// كل 20 مدينة لها معلومات قصيرة (Arabic) — تُعرض في شبكة كتاب البطاقات.
import { CITIES } from '../games/number-match.js';
import { CITY_LANDMARKS } from '../cities-landmarks.js';
import { getProgress } from './storage.js';

const KEY = 'bg:postcards';

// معلومات قصيرة (سطر واحد) لكل مدينة — مرتبة بنفس ترتيب CITIES
export const CITY_FACTS = [
  'برج خليفة يرتفع فوق الصحراء كأنه من المستقبل.',
  'مدينة ناطحات السحاب التي لا تنام.',
  'برج لؤلؤة الشرق يعانق نهر هوانغبو.',
  'ساعة بيغ بن ترنّ فوق نهر التايمز.',
  'مسجد الحسن الثاني شامخ على المحيط الأطلسي.',
  'برج طوكيو يلفّ المدينة بضوء برتقالي.',
  'برج إيفل أيقونة عاصمة الأنوار.',
  'أهرامات الجيزة شاهدة على عبقرية الفراعنة.',
  'الكولوسيوم يروي عصر المصارعين.',
  'مدينة القارّتين على مضيق البوسفور.',
  'تمثال المسيح المخلص يراقب شواطئ ريو.',
  'دار أوبرا سيدني كأشرعة تملأ الميناء.',
  'قباب ملوّنة وساحات حمراء في قلب موسكو.',
  'بوابة براندنبورغ رمز وحدة ألمانيا.',
  'قصر مدريد الملكي يتنفس تاريخ الملوك.',
  'قنوات ودراجات في مدينة مفتوحة.',
  'حدائق المستقبل وميرليون سنغافورة.',
  'معابد ذهبية وقصور في بانكوك.',
  'أهرامات تيوتيهواكان تخفي حضارة الأزتك.',
  'فيينا عاصمة الموسيقى والقهوة.',
];

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

// كل البطاقات المحفوظة (مرتبة حسب المدينة)
export function getPostcards() {
  return read();
}

// هل المدينة (بفهرسها) حصل عليها اللاعب؟
export function isEarned(index) {
  return getPostcards().some(p => p.index === index);
}

// عدد البطاقات المحصَّلة
export function totalEarned() {
  return getPostcards().length;
}

// حفظ بطاقة مدينة عند إتمامها (لا تُكرَّر)
export function awardPostcard(index) {
  const city = CITIES[index];
  if (!city) return null;
  const list = read();
  if (list.some(p => p.index === index)) return null;
  const pc = {
    index,
    city: city.name,
    flag: city.flag,
    landmarkSvg: CITY_LANDMARKS[index] || '',
    dateEarned: new Date().toISOString().slice(0, 10),
    fact: CITY_FACTS[index] || '',
  };
  list.push(pc);
  write(list);
  return pc;
}

// مزامنة التقدم: يُستدعى بعد كل فوز في Number Match.
// completedCities = عدد المستويات المكتملة للعبة. المدينة (بفهرسها) تكتمل عند
// إتمام كل أدوارها العشرة، أي عندما يكون عدد المستويات المكتملة >= (index+1)*10.
// تُحصَّل أي بطاقة ناقصة وتُعاد القائمة الجديدة (للإشعار).
export function syncPostcards(completedLevels) {
  const n = typeof completedLevels === 'number' ? completedLevels : (getProgress()['number-match'] || 0);
  const earned = [];
  for (let i = 0; i < CITIES.length; i++) {
    if (n >= (i + 1) * 10) {
      const pc = awardPostcard(i);
      if (pc) earned.push(pc);
    }
  }
  return earned;
}

// حساب التقدم الحالي لعدد البطاقات المفتوحة في العالم (0..20)
export function openCount() {
  return getPostcards().length;
}

export default { getPostcards, isEarned, totalEarned, awardPostcard, syncPostcards, openCount, CITY_FACTS };
