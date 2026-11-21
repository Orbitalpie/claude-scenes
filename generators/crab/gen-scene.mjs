// Generates the Crab Nebula backdrop for the scenes mod: hooks/scene-crab.ts, one
// completely still SVG, and hooks/shader-crab.ts, the GPU shader that plays
// all its motion over it.
// Run from the repo root: node generators/crab/gen-scene.mjs (or node build.mjs for all).
// An optional path argument writes the SVG somewhere else instead (no shader).
//
// See philosophy.md. The Crab Nebula (M1), traced from the Hubble mosaic
// (NASA, ESA, J. Hester and A. Loll) into brush strokes, hangs on the right of
// a dark star field. The desktop app won't draw embedded pictures, so the
// photo's colours (crab-pixels.bin.gz, made by make-picture.cjs) are turned
// into three layers of round-capped strokes by ../lib/trace.mjs: a soft
// underpainting, the filaments laid along the photo's own grain, and bright
// sparks. Any change in the SVG near those strokes froze the app (November
// 2026), so the SVG holds nothing animated at all. The shader (../lib/shader.mjs)
// adds twinkling stars on every side, cross stars, a cross on the pulsar and
// shooting stars. On the phone or under Reduce Motion the still SVG shows alone.
import { writeFileSync } from 'node:fs'
import { loadPixels, trace } from '../lib/trace.mjs'
import { starField } from '../lib/stars.mjs'
import { starShader } from '../lib/shader.mjs'

const out = process.argv[2] ?? new URL('../../hooks/scene-crab.ts', import.meta.url)
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
// Session 6: the grid is 600 photo pixels wide (1.33 scene units each) and the
// filaments are written as continuous lines of relative steps that follow the
// photo's grain (fil.chain), as for the Ring, so the drawing fills about
// 124,000 characters. (Until then the Crab used trace.mjs's defaults on a
// 400-pixel grid: about 9,000 separate strokes in 92,000 characters.)
const { UNDER, FIL, SPARK, count, counts, lines, PW, PH, unit } = trace(loadPixels(new URL('./crab-pixels.bin.gz', import.meta.url)), {
  res: 2,
  order: 'nearest',
  blurs: [2, 5, 9],
  under: [
    { step: 17, len: 10.5, r: 6, minL: 0.03, k: 12, width: 22, opacity: 0.16 },
    { step: 10.5, len: 7, r: 3, minL: 0.05, k: 16, width: 12, opacity: 0.2 },
  ],
  fil: {
    step: 1.75, len: [2.4, 4.8], detailGain: 6, lumGain: 0.8, bias: 0.15, minWide: 0, sat: 1.5, gain: 1.1,
    dim: { k: 18, width: 1.3, opacity: 0.5 },
    bright: { k: 22, width: 1.4, opacity: 0.85 },
    chain: { gap: 4.5, maxLen: 12, turn: 0.9, colour: 90, minStep: 1.35, smooth: 1 },
  },
  spark: { minL: 0.5, minDetail: 0.2, width: 2.4 },
})

// The nebula's place: the picture's centre at NEB, S scene units per photo pixel.
const NEB = [1450, 380]
const S = 800 / PW
const X0 = NEB[0] - (PW * S) / 2
const Y0 = NEB[1] - (PH * S) / 2
// The pulsar, in photo pixels (the centre of the blue synchrotron glow).
const PUL = [0.49 * PW, 0.5175 * PW]
const PX = X0 + PUL[0] * S
const PY = Y0 + PUL[1] * S

// ---------- Still stars (see ../lib/stars.mjs) ----------
// The shader adds the twinkling stars and the big cross stars over these.
seed = 20261118
const BOX = [X0 - 20, Y0 - 20, X0 + PW * S + 20, Y0 + PH * S + 20]
const STARS = starField({
  rand,
  box: BOX,
  // The nebula and its glow (measured on a render): no stars behind it.
  behind: (x, y) => Math.hypot(x - 1440, y - 378) < 325,
  moves: () => false,
  relocate: () => [rr(60, 700), rr(30, 970)],
  small: 380,
  medium: 80,
  big: 0,
})

// ---------- Faint far galaxies ----------
seed = 404
let GALAXIES = ''
;[[330, 170, 26, -30], [690, 90, 16, 20], [190, 640, 20, 55], [880, 260, 11, -10]].forEach(([x, y, r, a]) => {
  GALAXIES += `<g transform="translate(${x} ${y}) rotate(${a}) scale(1 ${r2(rr(0.3, 0.5))})"><circle r="${r}" fill="url(#gx)"/><circle r="${r1(r * 0.25)}" fill="url(#gc)"/></g>`
})

// ---------- The pulsar: a still blue-white point with a soft glow ----------
// It used to pulse and send out rings; any motion over the strokes froze the app.
const PULSAR = `<g transform="translate(${i0(PX)} ${i0(PY)})"><circle r="44" fill="url(#pg)" opacity=".8"/><circle r="4" fill="#f4f9ff"/></g>`

// ---------- The still drawing ----------
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>
<radialGradient id="gx"><stop offset="0" stop-color="#c8c4e8" stop-opacity=".22"/><stop offset=".5" stop-color="#9890c0" stop-opacity=".08"/><stop offset="1" stop-color="#9890c0" stop-opacity="0"/></radialGradient>
<radialGradient id="gc"><stop offset="0" stop-color="#f4ead8" stop-opacity=".55"/><stop offset="1" stop-color="#f4ead8" stop-opacity="0"/></radialGradient>
<radialGradient id="neb"><stop offset="0" stop-color="#d9653a" stop-opacity=".1"/><stop offset=".6" stop-color="#d9653a" stop-opacity=".05"/><stop offset="1" stop-color="#d9653a" stop-opacity="0"/></radialGradient>
<radialGradient id="core"><stop offset="0" stop-color="#9ec8ff" stop-opacity=".3"/><stop offset=".5" stop-color="#9ec8ff" stop-opacity=".1"/><stop offset="1" stop-color="#9ec8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="pg"><stop offset="0" stop-color="#f4f9ff" stop-opacity=".95"/><stop offset=".12" stop-color="#cfe4ff" stop-opacity=".6"/><stop offset=".4" stop-color="#9ec8ff" stop-opacity=".22"/><stop offset="1" stop-color="#9ec8ff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${W}" height="${H}"/>
${STARS.SMALL}${GALAXIES}${STARS.MEDIUM}
<g opacity=".82">
<circle cx="${NEB[0]}" cy="${NEB[1]}" r="470" fill="url(#neb)"/>
<g transform="translate(${i0(X0)} ${i0(Y0)}) scale(${+(S * unit).toFixed(4)})">${UNDER}</g>
<g transform="translate(${i0(X0)} ${i0(Y0)}) scale(${+(S * unit).toFixed(4)})">${FIL}${SPARK}</g>
<ellipse cx="${i0(PX + 20)}" cy="${i0(PY - 30)}" rx="230" ry="190" fill="url(#core)" opacity=".55"/>
${PULSAR}
</g>
</svg>`

// ---------- The motion, as a GPU shader ----------
const SHADER = starShader({
  title: 'the Crab Nebula: stars and shooting stars',
  // No spread star over the nebula; one that lands there moves below it.
  avoid: { cx: 1440, cy: 378, rx: 335, ry: 335 },
  moveTo: [740, 980],
  // A few more small stars in the dark band hugging the nebula: 15 round its
  // lower half, 4 up each side.
  around: [
    { count: 15, a0: 10, a1: 170 },
    { count: 4, a0: 175, a1: 260 },
    { count: 4, a0: 280, a1: 355 },
  ],
  placed: [
    [1320, 920, 55, [1, 0.9, 0.6]], // larger, slightly yellow, under the nebula
    [520, 80, 58, [0.86, 0.92, 1]], // larger, very faintly blue, near the top of the left half
    [280, 500, 36, [1, 0.92, 0.7]], // medium, yellowish, halfway down the left-hand side
  ],
  // The pulsar at the heart.
  core: { x: i0(PX), y: i0(PY), reach: 34, rgb: [0.86, 0.92, 1], strength: 0.9 },
  // Now and then a shooting star in the upper left, far from the nebula.
  shooting: [
    { from: [880, 90], dir: [-1, 0.42], cycle: 197, start: 150 },
    { from: [150, 120], dir: [1, 0.5], cycle: 263, start: 40 },
  ],
})

// A still drawing under a shader may be bigger than an animated scene (see check-scene.mjs).
const BUDGET = 125000
if (svg.length > BUDGET) throw new Error(`scene too long: ${svg.length} of ${BUDGET}`)
writeFileSync(out, `// Generated by generators/crab/gen-scene.mjs: the Crab Nebula backdrop (still; hooks/shader-crab.ts plays its motion).
export const SCENE = ${JSON.stringify(svg)}
`)
if (!process.argv[2]) writeFileSync(new URL('../../hooks/shader-crab.ts', import.meta.url), SHADER)
console.log(`scene: ${svg.length} of ${BUDGET} characters (${count} spots in ${lines} lines + ${counts.under.join('+')} underpainting, ${counts.spark} sparks); shader ${SHADER.length}`)
