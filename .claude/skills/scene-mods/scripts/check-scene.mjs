// Checks generated scenes against the Claude desktop app's limits.
//   node check-scene.mjs hooks/scene-*.ts
// Exits 1 if any scene breaks a limit.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'

// Found by testing the desktop app in November 2026: scenes much over about
// 112 000 characters, or with anything repeating faster than about once a
// second, stop moving. See the scene-mods skill.
const BUDGET = 110000
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
  const big = svg.length > BUDGET
  const ok = !big && fast.size === 0
  if (!ok) failed = true
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${basename(file)}: ${svg.length} of ${BUDGET} characters${big ? ' (too big)' : ''}${fast.size ? `; too fast: ${[...fast].join(' | ')}` : ''}`)
}
process.exit(failed ? 1 : 0)
