// Run: node scripts/generate-icons.js
// Generates simple placeholder icons until you replace with real ones
const fs = require('fs')
const path = require('path')

const dir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(dir, { recursive: true })

function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#22c55e"/>
  <text x="50%" y="55%" font-size="${size * 0.55}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui">🥗</text>
</svg>`
}

fs.writeFileSync(path.join(dir, 'icon-192.svg'), makeSvg(192))
fs.writeFileSync(path.join(dir, 'icon-512.svg'), makeSvg(512))
console.log('SVG icons generated in public/icons/')
console.log('Convert to PNG with: npx sharp-cli --input public/icons/icon-192.svg --output public/icons/icon-192.png')
