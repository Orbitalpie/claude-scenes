// Regenerates scenes from generators/ into hooks/, then checks every scene
// against the desktop app's limits. Run from anywhere:
//   node build.mjs              every scene
//   node build.mjs blizzard     just one (the folder name under generators/)
// generators/lib holds code shared by the generators, not a scene, so it is skipped.
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = p => fileURLToPath(new URL(p, import.meta.url))
const names = process.argv.length > 2 ? process.argv.slice(2) : readdirSync(here('./generators/')).filter(n => n !== 'lib')
const run = args => execFileSync(process.execPath, args, { stdio: 'inherit' })

for (const name of names) {
  process.stdout.write(`${name}: `)
  run([here(`./generators/${name}/gen-scene.mjs`)])
}
const scenes = readdirSync(here('./hooks/')).filter(f => /^scene-.*\.ts$/.test(f)).map(f => here(`./hooks/${f}`))
try {
  run([here('./.claude/skills/scene-mods/scripts/check-scene.mjs'), ...scenes])
} catch {
  process.exit(1)
}
