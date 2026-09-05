import sharp from 'sharp';
import { copyFileSync, writeFileSync } from 'node:fs';

const SRC = '/Volumes/Crucial X9/number match/stitch_mobile_game_design_overhaul/brain_games_app_icon/appicon.png';

// iOS: انسخ مباشرة (1024×1024، معتم)
copyFileSync(SRC, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
console.log('iOS icon copied');

// Android: أيقونات كاملة + طبقة أمامية (adaptive)
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  const legacy = Math.round(48 * k);
  const fg = Math.round(108 * k);
  const base = 'android/app/src/main/res/mipmap-' + d + '/';
  // أيقونات كاملة (legacy)
  await sharp(SRC).resize(legacy, legacy).png().toFile(base + 'ic_launcher.png');
  await sharp(SRC).resize(legacy, legacy).png().toFile(base + 'ic_launcher_round.png');
  // طبقة أمامية (icon في المنتصف بنسبة ~66% على خلفية شفافة)
  const iconSize = Math.round(fg * 0.66);
  const icon = await sharp(SRC).resize(iconSize, iconSize).png().toBuffer();
  const canvas = sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  await canvas.composite([{ input: icon, left: Math.round((fg - iconSize) / 2), top: Math.round((fg - iconSize) / 2) }]).png().toFile(base + 'ic_launcher_foreground.png');
}
console.log('Android icons generated');
