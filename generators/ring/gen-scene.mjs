// Generates the Ring Nebula backdrop for the scenes mod: hooks/scene-ring.ts, one
// completely still SVG, and hooks/shader-ring.ts, the GPU shader that plays
// all its motion over it.
// Run from the repo root: node generators/ring/gen-scene.mjs (or node build.mjs for all).
// An optional path argument writes the SVG somewhere else instead (no shader).
//
// See philosophy.md. The Ring Nebula (M57), traced from the 2013 Hubble image
// (NASA, ESA and the Hubble Heritage (STScI/AURA)-ESA/Hubble Collaboration)
// into brush strokes by ../lib/trace.mjs, hangs in the upper left of a black
// star field. In the desktop app (November 2026) any change in the SVG near
// its ~8,800 strokes froze the scene, so the SVG holds nothing animated at
// all. The shader (../lib/shader.mjs) adds twinkling stars on every side, cross
// stars, a cross on the white dwarf, a comet and shooting stars. On the phone
// or under Reduce Motion the still SVG shows alone.
import { writeFileSync } from 'node:fs'
import { loadPixels, trace } from '../lib/trace.mjs'
import { starField } from '../lib/stars.mjs'
import { starShader } from '../lib/shader.mjs'

const out = process.argv[2] ?? new URL('../../hooks/scene-ring.ts', import.meta.url)
const W = 2000
const H = 1000

let seed = 1
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const rr = (a, b) => a + rand() * (b - a)
const i0 = n => Math.round(n)
const r1 = n => Math.round(n * 10) / 10
const r2 = n => Math.round(n * 100) / 100

// ---------- The photo, traced into brush strokes (see ../lib/trace.mjs) ----------
// Session 6: the grid is 450 photo pixels wide (1.37 scene units each) and the
// filaments are written as continuous lines of relative steps that follow the
// photo's grain (fil.chain), in half-pixel units (res 2), each colour's lines
// ordered to keep the moves short. That packs about 2.3 times as much drawing
// into each character, so the drawing now fills about 124,000 characters of
// the app's 131,072 limit for one Svg (a still drawing under a shader).
const { UNDER, FIL, SPARK, count, counts, lines, PW, PH, unit } = trace(loadPixels(new URL('./ring-pixels.bin.gz', import.meta.url)), {
  res: 2,
  order: 'nearest',
  blurs: [2, 4, 9],
  under: [
    { step: 13, len: 9, r: 4, minL: 0.03, k: 12, width: 19, opacity: 0.16 },
    { step: 9, len: 6, r: 3, minL: 0.05, k: 16, width: 10, opacity: 0.2 },
  ],
  fil: {
    step: 0.76, len: [2.4, 4.8], detailGain: 6, lumGain: 0.85, bias: 0.12, minWide: 0.07, sat: 1.85,
    dim: { k: 18, width: 1.2, opacity: 0.5 },
    bright: { k: 22, width: 1.3, opacity: 0.8 },
    chain: { gap: 4.5, maxLen: 12, turn: 0.9, colour: 90, minStep: 1.35, smooth: 1 },
  },
  spark: { minL: 0.45, minDetail: 0.1, width: 2.2 },
})

// The ring's place: the picture's centre at NEB, S scene units per photo pixel.
const NEB = [475, 330]
const S = 615 / PW
const X0 = NEB[0] - (PW * S) / 2
const Y0 = NEB[1] - (PH * S) / 2
// The white dwarf, in photo pixels (the faint star at the ring's heart).
const WD = [0.5 * PW, 0.48 * PH]
const WX = X0 + WD[0] * S
const WY = Y0 + WD[1] * S

// ---------- Still stars (see ../lib/stars.mjs) ----------
// The shader adds the twinkling stars and the big cross stars over these.
seed = 20261120
const BOX = [X0 - 20, Y0 - 20, X0 + PW * S + 20, Y0 + PH * S + 20]
const STARS = starField({
  rand,
  box: BOX,
  // The ring and its glow, an ellipse wider than it is tall (measured on a
  // render): no stars behind it.
  behind: (x, y) => ((x - 472) / 280) ** 2 + ((y - 325) / 215) ** 2 < 1,
  moves: () => false,
  relocate: () => [rr(1300, 1940), rr(30, 970)],
  small: 380,
  medium: 80,
  big: 0,
})

// ---------- Faint far galaxies, away from the ring ----------
seed = 404
let GALAXIES = ''
;[[1660, 560, 22, 35], [1330, 95, 14, -20], [1890, 260, 18, 60], [1180, 420, 10, -10]].forEach(([x, y, r, a]) => {
  GALAXIES += `<g transform="translate(${x} ${y}) rotate(${a}) scale(1 ${r2(rr(0.3, 0.5))})"><circle r="${r}" fill="url(#gx)"/><circle r="${r1(r * 0.25)}" fill="url(#gc)"/></g>`
})
// A tiny edge-on spiral just right of the ring's square, like IC 1296 near M57:
// a thin bright disc with a small bulge and a dark dust lane along it. Still.
const EG = [i0(BOX[2] + 70), i0(NEB[1] - 150)]
const EDGE_ON = `<g transform="translate(${EG[0]} ${EG[1]}) rotate(-28)" opacity=".75"><ellipse rx="40" ry="9" fill="url(#eg)"/><ellipse rx="26" ry="2.4" fill="#e8e2f4" opacity=".22"/><ellipse rx="7" ry="5" fill="url(#gc)"/><path d="M-30 1.1Q0 2.2 30 1.1" stroke="#000" stroke-opacity=".55" stroke-width="1.3" fill="none"/></g>`

// ---------- The white dwarf: a small still point with a soft halo ----------
const DWARF = `<g transform="translate(${i0(WX)} ${i0(WY)})"><circle r="22" fill="url(#wd)"/><circle r="2.2" fill="#eef6ff"/></g>`

// ---------- The still drawing ----------
const DEFS = `<radialGradient id="gx"><stop offset="0" stop-color="#c8c4e8" stop-opacity=".22"/><stop offset=".5" stop-color="#9890c0" stop-opacity=".08"/><stop offset="1" stop-color="#9890c0" stop-opacity="0"/></radialGradient>
<radialGradient id="gc"><stop offset="0" stop-color="#f4ead8" stop-opacity=".55"/><stop offset="1" stop-color="#f4ead8" stop-opacity="0"/></radialGradient>
<radialGradient id="eg"><stop offset="0" stop-color="#d8d4ec" stop-opacity=".3"/><stop offset=".6" stop-color="#a8a4d0" stop-opacity=".1"/><stop offset="1" stop-color="#a8a4d0" stop-opacity="0"/></radialGradient>
<radialGradient id="neb"><stop offset="0" stop-color="#5fc8e0" stop-opacity=".05"/><stop offset=".55" stop-color="#c8553d" stop-opacity=".06"/><stop offset="1" stop-color="#c8553d" stop-opacity="0"/></radialGradient>
<radialGradient id="wd"><stop offset="0" stop-color="#f0f8ff" stop-opacity=".7"/><stop offset=".2" stop-color="#cfe6ff" stop-opacity=".3"/><stop offset="1" stop-color="#9ed4ff" stop-opacity="0"/></radialGradient>
`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${DEFS}</defs>
<rect width="${W}" height="${H}"/>
${STARS.SMALL}${GALAXIES}${EDGE_ON}${STARS.MEDIUM}
<g opacity=".8">
<ellipse cx="${NEB[0]}" cy="${NEB[1]}" rx="340" ry="290" fill="url(#neb)"/>
<g transform="translate(${r1(X0)} ${r1(Y0)}) scale(${+(S * unit).toFixed(4)})">${UNDER}</g>
<g transform="translate(${r1(X0)} ${r1(Y0)}) scale(${+(S * unit).toFixed(4)})">${FIL}${SPARK}</g>
${DWARF}
</g>
</svg>`

// ---------- The motion, as a GPU shader ----------
const SHADER = starShader({
  title: 'the Ring Nebula: stars, comet and shooting stars',
  // No spread star over the ring; one that lands there moves below it.
  avoid: { cx: 472, cy: 325, rx: 290, ry: 225 },
  moveTo: [650, 980],
  // A few more small stars in the dark band hugging the ring: 15 round its
  // lower half, 4 up each side and 4 over the top.
  around: [
    { count: 15, a0: 10, a1: 170 },
    { count: 4, a0: 175, a1: 250 },
    { count: 4, a0: 250, a1: 290 },
    { count: 4, a0: 290, a1: 355 },
  ],
  placed: [
    [560, 880, 55, [1, 0.9, 0.6]], // larger, slightly yellow, near the bottom left
    [1500, 80, 58, [0.86, 0.92, 1]], // larger, very faintly blue, near the top of the right half
    [1720, 500, 36, [1, 0.92, 0.7]], // medium, yellowish, halfway down the right-hand side
  ],
  // The white dwarf at the ring's heart.
  core: { x: i0(WX), y: i0(WY), reach: 34, rgb: [0.88, 0.94, 1], strength: 0.9 },
  // One slow crossing of the upper right every four minutes.
  comet: { from: [1880, 60], to: [1180, 250], cycle: 241, start: 91 },
  // Now and then a shooting star on the right side of the sky.
  shooting: [
    { from: [1420, 110], dir: [1, 0.42], cycle: 197, start: 150 },
    { from: [1860, 190], dir: [-1, 0.5], cycle: 263, start: 40 },
  ],
})

// A still drawing under a shader may be bigger than an animated scene (see check-scene.mjs).
const BUDGET = 125000
if (svg.length > BUDGET) throw new Error(`scene too long: ${svg.length} of ${BUDGET}`)
writeFileSync(out, `// Generated by generators/ring/gen-scene.mjs: the Ring Nebula backdrop (still; hooks/shader-ring.ts plays its motion).
export const SCENE = ${JSON.stringify(svg)}
`)
if (!process.argv[2]) writeFileSync(new URL('../../hooks/shader-ring.ts', import.meta.url), SHADER)
console.log(`scene: ${svg.length} of ${BUDGET} characters (${count} spots in ${lines} lines + ${counts.under.join('+')} underpainting, ${counts.spark} sparks); shader ${SHADER.length}`)
