import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('public/favicon.svg')
const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`)
  console.log(`✅ icon-${size}.png`)
}
console.log('Todos os ícones gerados!')
