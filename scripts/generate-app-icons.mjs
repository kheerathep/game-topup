import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'app-icon.svg')

if (!existsSync(svgPath)) {
  console.error('Missing public/app-icon.svg')
  process.exit(1)
}

const { Resvg } = await import('@resvg/resvg-js')

const svg = readFileSync(svgPath)
const outputs = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [name, size] of outputs) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
  })
  const pngData = resvg.render()
  const outPath = join(root, 'public', name)
  writeFileSync(outPath, pngData.asPng())
  console.log('Wrote', name, `(${size}×${size})`)
}
