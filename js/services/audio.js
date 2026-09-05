// مؤثرات صوتية مركّبة (بدون ملفات) — Web Audio
let ctx = null;
let enabled = true;

export function setSound(on) { enabled = on; }
export function soundOn() { return enabled; }

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type = 'sine', gain = 0.16, when = 0, glideTo = null) {
  if (!enabled) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap()   { tone(520, 0.06, 'triangle', 0.10); },
  select(){ tone(640, 0.08, 'triangle', 0.12, 0, 720); },
  match() { tone(660, 0.09, 'sine', 0.15); tone(880, 0.12, 'sine', 0.14, 0.04); },
  combo() { tone(880, 0.08, 'triangle', 0.14); tone(1108, 0.10, 'triangle', 0.14, 0.05); },
  error() { tone(180, 0.14, 'sawtooth', 0.10, 0, 140); },
  addrow(){ tone(300, 0.12, 'sine', 0.12, 0, 420); },
  win()   { [523,659,784,1047].forEach((f,i)=>tone(f, 0.22, 'triangle', 0.16, i*0.09)); },
  lose()  { [400,340,280,220].forEach((f,i)=>tone(f, 0.2, 'sine', 0.13, i*0.1)); },
  hint()  { tone(880, 0.1, 'sine', 0.14); tone(1174, 0.14, 'sine', 0.14, 0.07); },
};
