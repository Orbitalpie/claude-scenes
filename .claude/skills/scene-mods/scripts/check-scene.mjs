// Checks generated scenes against the Claude desktop app's limits.
//   node check-scene.mjs hooks/scene-*.ts
// Exits 1 if any scene breaks a limit.
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

// Found by testing the desktop app in November 2026: scenes much over about
// 112 000 characters, or with anything repeating faster than about once a
// second, stop moving. See the scene-mods skill.
const BUDGET = 110000
// A scene whose motion is all in a shader (a hooks/shader-<name>.ts beside it)
// draws one completely still Svg, which the app only has to draw once. Session 6
// (November 2026) lets such a drawing grow to 125 000 characters, a margin under
// the 131 072 the app refuses. Its SVG must hold no animation at all.
const SHADER_BUDGET = 125000
const FASTEST = 1.3

let failed = false
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8')
  const svg = JSON.parse(src.slice(src.indexOf('=') + 1).trim())
  const fast = new Set()
  for (const m of svg.matchAll(/(animation[\w-]*:[^;"}]*)/g)) {
    if (/delay/.test(m[1])) continue
    for (const t of m[1].matchAll(/(\d*\.?\d+)s\b/g)) if (+t[1] > 0 && +t[1] < FASTEST) fast.add(m[1].slice(0, 70))
  }
  // Many steps in one cycle flick fast even when the cycle is long.
  for (const m of svg.matchAll(/animation:[\w-]+ ([\d.]+)s steps\((\d+)\)/g)) {
    if (+m[1] / +m[2] < FASTEST) fast.add(`steps(${m[2]}) over ${m[1]}s`)
  }
  const shader = existsSync(join(dirname(file), basename(file).replace(/^scene-/, 'shader-')))
  const limit = shader ? SHADER_BUDGET : BUDGET
  const moving = shader && /animation[w-]*:|<animate|<set /.test(svg)
  const big = svg.length > limit
  const ok = !big && !moving && fast.size === 0
  if (!ok) failed = true
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${basename(file)}: ${svg.length} of ${limit} characters${shader ? ' (still, shader)' : ''}${big ? ' (too big)' : ''}${moving ? '; moves in the SVG, but a shader scene must be still' : ''}${fast.size ? `; too fast: ${[...fast].join(' | ')}` : ''}`)
}
process.exit(failed ? 1 : 0)
