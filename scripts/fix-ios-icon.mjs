import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const FULL = '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2705A"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#g)"/><rect x="182" y="182" width="300" height="300" rx="90" fill="#FFFFFF"/><rect x="542" y="182" width="300" height="300" rx="90" fill="#FFFFFF"/><rect x="182" y="542" width="300" height="300" rx="90" fill="#FFFFFF"/><circle cx="692" cy="692" r="150" fill="#FFFFFF"/></svg>';
const buf = await sharp(Buffer.from(FULL)).resize(1024, 1024).removeAlpha().png().toBuffer();
writeFileSync('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', buf);
console.log('iOS icon regenerated (opaque)');
