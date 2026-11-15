// Copies each theme's generated scene into this mod.
// Run after regenerating any scene: node sync.mjs
import { copyFileSync } from 'node:fs'

for (const [from, to] of [
  ['../mars-dusk/hooks/scene.ts', 'hooks/scene-mars.ts'],
  ['../deep-sea/hooks/scene.ts', 'hooks/scene-deep-sea.ts'],
  ['../rainforest/hooks/scene.ts', 'hooks/scene-rainforest.ts'],
]) {
  copyFileSync(new URL(from, import.meta.url), new URL(to, import.meta.url))
  console.log(`${from} -> ${to}`)
}
