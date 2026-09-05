// توليد أيقونات Brain Games (iOS + Android) من SVG
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

// أيقونة كاملة: تدرّج مرجاني→بنفسجي + شعار 4 أشكال (3 مربعات + دائرة)
const FULL = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2705A"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><rect x="182" y="182" width="300" height="300" rx="90" fill="#FFFFFF"/><rect x="542" y="182" width="300" height="300" rx="90" fill="#FFFFFF" opacity="0.9"/><rect x="182" y="542" width="300" height="300" rx="90" fill="#FFFFFF" opacity="0.8"/><circle cx="692" cy="692" r="150" fill="#FFFFFF"/></svg>';

// طبقة أمامية (adaptive): شفافة، الشعار في المنتصف داخل المنطقة الآمنة
const FG = '<svg xmlns="http://www.w3.org/2000/svg" width="432" height="432"><rect x="116" y="116" width="88" height="88" rx="26" fill="#FFFFFF"/><rect x="228" y="116" width="88" height="88" rx="26" fill="#FFFFFF" opacity="0.9"/><rect x="116" y="228" width="88" height="88" rx="26" fill="#FFFFFF" opacity="0.8"/><circle cx="272" cy="272" r="44" fill="#FFFFFF"/></svg>';

const jobs = [];
jobs.push(['ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', FULL, 1024]);

const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  const legacy = Math.round(48 * k);
  const fg = Math.round(108 * k);
  const base = 'android/app/src/main/res/mipmap-' + d + '/';
  jobs.push([base + 'ic_launcher.png', FULL, legacy]);
  jobs.push([base + 'ic_launcher_round.png', FULL, legacy]);
  jobs.push([base + 'ic_launcher_foreground.png', FG, fg]);
}

for (const [p, svg, size] of jobs) {
  const buf = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
  writeFileSync(p, buf);
  console.log('ok  ' + String(size).padStart(4) + 'px  ' + p);
}
console.log('DONE ' + jobs.length + ' icons');
