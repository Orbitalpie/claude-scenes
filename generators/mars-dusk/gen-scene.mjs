// Generates hooks/scene-mars.ts for the scenes mod: the mars-dusk backdrop as one SVG string.
// Run from the repo root: node generators/mars-dusk/gen-scene.mjs (or node build.mjs for all).
// An optional path argument writes somewhere else instead.
import { writeFileSync } from 'node:fs'

const out = process.argv[2] ?? new URL('../../hooks/scene-mars.ts', import.meta.url)
const W = 1600
const H = 1000
const HORIZON = 690

// Deterministic random so every reload draws the same scene.
let seed = 20261115
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const f = n => String(Math.round(n * 2) / 2)

// Stars: a sky that turns slowly about a pole above the top of the frame, as if
// time ran fast. One wedge of stars is drawn and repeated round the pole, so the
// whole turning sky stays small. A mask fades them out as the orange rises.
// They use their own random stream so the terrain below stays the same.
let starSeed = 4242
const srand = () => {
  starSeed = (starSeed * 1664525 + 1013904223) % 4294967296
  return starSeed / 4294967296
}
const POLE = [1050, -260]
const WEDGES = 6
const R_MIN = 230
const R_MAX = 1420
const stars = []
for (let i = 0; i < 150; i++) {
  // Even density over the wedge's area.
  const rr = Math.sqrt(R_MIN ** 2 + srand() * (R_MAX ** 2 - R_MIN ** 2))
  const a = (srand() * 2 * Math.PI) / WEDGES
  const x = POLE[0] + Math.cos(a) * rr
  const y = POLE[1] + Math.sin(a) * rr
  const bright = srand() < 0.08
  const r = bright ? 1.5 + srand() * 0.8 : 0.6 + srand() * 1.2
  const base = bright ? 0.95 : 0.45 + srand() * 0.45
  const cls = `t${Math.floor(srand() * 5)}`
  if (bright) {
    stars.push(`<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${(r * 3.2).toFixed(1)}" opacity="${(base * 0.18).toFixed(2)}"/>`)
  }
  stars.push(`<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${r.toFixed(1)}" opacity="${base.toFixed(2)}"/>`)
}
const wedgeUses = Array.from({ length: WEDGES - 1 }, (_, k) =>
  `<use href="#wedge" transform="rotate(${((k + 1) * 360) / WEDGES} ${POLE[0]} ${POLE[1]})"/>`,
).join('')
// One turn every 40 minutes, anticlockwise like a northern sky.
const TURN_S = 2400

// Terrain: three layers of rolling ground, each a smooth height line.
function layer(top, amp, waves, step) {
  const phases = waves.map(() => rand() * Math.PI * 2)
  const pts = []
  for (let x = -40; x <= W + 40; x += step) {
    let y = top
    waves.forEach(([len, a], i) => {
      y += Math.sin((x / len) * Math.PI * 2 + phases[i]) * a * amp
    })
    y += (rand() - 0.5) * amp * 0.25
    pts.push([x, y])
  }
  return pts
}
// Buttes on the far ridge: flat tops, steep worn sides.
function addButtes(pts, count) {
  for (let b = 0; b < count; b++) {
    const c = 150 + rand() * (W - 300)
    const half = 40 + rand() * 70
    const lift = 22 + rand() * 26
    for (const p of pts) {
      const d = Math.abs(p[0] - c)
      if (d < half) p[1] -= lift
      else if (d < half + 45) p[1] -= lift * (1 - (d - half) / 45) ** 1.6
    }
  }
}
function smooth(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2
    const my = (pts[i][1] + pts[i + 1][1]) / 2
    d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`
  }
  const l = pts[pts.length - 1]
  return d + ` L${f(l[0])} ${f(l[1])}`
}
function heightAt(pts, x) {
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i][0] && x <= pts[i + 1][0]) {
      const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])
      return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t
    }
  }
  return pts[pts.length - 1][1]
}

const far = layer(HORIZON + 4, 9, [[520, 1], [190, 0.5], [70, 0.25]], 22)
addButtes(far, 2)
const mid = layer(HORIZON + 52, 22, [[700, 1], [260, 0.6], [95, 0.25]], 26)
const near = layer(HORIZON + 150, 38, [[900, 1], [340, 0.55], [120, 0.25]], 30)
const layers = [
  { pts: far, fill: 'g0', rim: 0.75, rimW: 1.6 },
  { pts: mid, fill: 'g1', rim: 0.1, rimW: 3, soft: true },
  { pts: near, fill: 'g2', rim: 0, rimW: 4, soft: true },
]

// Rocks: weathered, rounded boulders and a few leaning standing stones.
let rockId = 0
function rock(cx, base, w, h, tall) {
  const n = 11 + Math.floor(rand() * 4)
  const lean = tall ? (rand() < 0.5 ? -1 : 1) * (0.08 + rand() * 0.14) : 0
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI
    const jit = tall ? 0.94 + rand() * 0.07 : 0.84 + rand() * 0.22
    const py = base + Math.sin(a) * h * (tall ? jit : 0.85 + rand() * 0.2)
    const px = cx + Math.cos(a) * w * jit + (base - py) * lean
    pts.push([px, py])
  }
  pts.push([cx + w * 0.9, base + h * 0.06], [cx - w * 0.9, base + h * 0.06])
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const st0 = m(pts[pts.length - 1], pts[0])
  let d = `M${f(st0[0])} ${f(st0[1])}`
  for (let i = 0; i < pts.length; i++) {
    const q = m(pts[i], pts[(i + 1) % pts.length])
    d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f(q[0])} ${f(q[1])}`
  }
  d += ' Z'
  // Rim light along the upper edge, from the glow behind.
  const a0 = Math.round(n * 0.25), a1 = Math.round(n * 0.75)
  let rimD = `M${f(pts[a0][0])} ${f(pts[a0][1])}`
  for (let i = a0 + 1; i <= a1; i++) rimD += ` L${f(pts[i][0])} ${f(pts[i][1])}`
  const id = `r${rockId++}`
  // Old bedding lines across the bigger stones.
  let strata = ''
  if (h > 12) {
    const lines = 2 + Math.floor(rand() * 3)
    for (let k = 1; k <= lines; k++) {
      const yy = base - h * (k / (lines + 1)) + (rand() - 0.5) * 3
      strata += `<path d="M${f(cx - w * 1.4)} ${f(yy + w * lean)} Q${f(cx)} ${f(yy + (rand() - 0.5) * 6)} ${f(cx + w * 1.4)} ${f(yy - w * lean + (rand() - 0.5) * 4)}" stroke="#2a0f0b" stroke-width="${f(Math.max(0.6, h / 40))}" fill="none" opacity=".75"/>`
    }
  }
  return (
    `<ellipse cx="${f(cx + w * 0.15)}" cy="${f(base + h * 0.06)}" rx="${f(w * 1.35)}" ry="${f(Math.max(1.5, h * 0.14))}" fill="#050202" opacity=".55"/>` +
    (h < 10 ? `<path d="${d}" fill="url(#rk)"/>` : `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<path d="${d}" fill="url(#rk)"/>` +
    `<g clip-path="url(#${id})">${strata}<rect x="${f(cx - w * 2)}" y="${f(base - h * 1.2)}" width="${f(w * 4)}" height="${f(h * 1.4)}" fill="url(#rkshade)"/></g>`) +
    `<path d="${rimD}" stroke="#d47a44" stroke-width="${f(Math.min(1.6, Math.max(0.6, h / 40)))}" fill="none" opacity="${f(0.14 + rand() * 0.14)}" stroke-linecap="round" stroke-linejoin="round"/>`
  )
}

const groundSvg = []
layers.forEach((L, li) => {
  const nextPts = layers[li + 1]?.pts
  const edge = smooth(L.pts)
  groundSvg.push(`<path d="${edge} L${W + 40} ${H} L-40 ${H} Z" fill="url(#${L.fill})"/>`)
  groundSvg.push(`<path d="${edge}" stroke="#e08a4c" stroke-width="${L.rimW}" fill="none" opacity="${L.rim}"${L.soft ? ' filter="url(#soft)"' : ''}/>`)
  // Faint wind streaks along the slopes.
  for (let s = 0; s < 6 + li * 5; s++) {
    const x0 = rand() * W
    const len = 60 + rand() * 160 * (li + 1)
    let top = -1e9, bottom = 1e9
    for (let xx = x0; xx <= x0 + len; xx += 10) {
      top = Math.max(top, heightAt(L.pts, xx))
      bottom = Math.min(bottom, nextPts ? heightAt(nextPts, xx) - 6 : H)
    }
    if (bottom - top < 14) continue
    const yy = top + 6 + rand() * (bottom - top - 8)
    groundSvg.push(`<path d="M${f(x0)} ${f(yy)} q${f(len / 2)} ${f((rand() - 0.5) * 6)} ${f(len)} ${f((rand() - 0.5) * 4)}" stroke="#4a2016" stroke-width="${f(0.8 + li * 0.5)}" fill="none" opacity=".45" stroke-linecap="round"/>`)
  }
  const count = [30, 24, 18][li]
  const placed = []
  for (let k = 0; k < count; k++) {
    const x0 = 20 + rand() * (W - 40)
    const top = heightAt(L.pts, x0)
    const bottom = nextPts ? Math.min(heightAt(nextPts, x0) - 4, top + 120) : H - 10
    if (bottom - top < 8) continue
    const yy = top + 5 + rand() * (bottom - top - 5)
    const depth = (yy - HORIZON) / (H - HORIZON)
    const size = 2.5 + Math.pow(depth, 1.3) * 80 * (0.45 + rand())
    const tall = li > 0 && rand() < 0.16
    placed.push([yy, x0, size, tall])
  }
  placed.sort((a, b) => a[0] - b[0])
  for (const [yy, x0, size, tall] of placed) {
    groundSvg.push(
      tall
        ? rock(x0, yy, size * 0.5, size * 1.6, true)
        : rock(x0, yy, size * (0.8 + rand() * 0.5), size * (0.6 + rand() * 0.35), false),
    )
  }
})
const groundClip = `${smooth(far)} L${W + 40} ${H} L-40 ${H} Z`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.t0,.t1,.t2,.t3,.t4{fill:#f6e9da;animation:tw 7s ease-in-out infinite}
.t1{animation-duration:9s;animation-delay:-3s}.t2{animation-duration:11s;animation-delay:-6s}.t3{animation-duration:6s;animation-delay:-2s}.t4{animation-duration:13s;animation-delay:-8s}
.sky-turn{transform-box:view-box;transform-origin:${POLE[0]}px ${POLE[1]}px;animation:turn ${TURN_S}s linear infinite}
@keyframes turn{to{transform:rotate(-360deg)}}
@keyframes tw{0%,100%{fill-opacity:1}50%{fill-opacity:.55}}
.hz{transform-box:view-box;animation-iteration-count:infinite;animation-direction:alternate;animation-timing-function:ease-in-out}
.h1{animation-name:d1;animation-duration:140s}
.h2{animation-name:d2;animation-duration:190s}
.h3{animation-name:d3;animation-duration:110s}
@keyframes d1{from{transform:translateX(-120px)}to{transform:translateX(140px)}}
@keyframes d2{from{transform:translateX(160px)}to{transform:translateX(-150px)}}
@keyframes d3{from{transform:translateX(-80px) translateY(4px)}to{transform:translateX(90px) translateY(-6px)}}
@media (prefers-reduced-motion:reduce){.t0,.t1,.t2,.t3,.t4,.hz,.sky-turn{animation:none}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="${HORIZON}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#050307"/>
<stop offset=".22" stop-color="#0d070b"/>
<stop offset=".42" stop-color="#1f0d0e"/>
<stop offset=".60" stop-color="#43180f"/>
<stop offset=".76" stop-color="#7c3013"/>
<stop offset=".90" stop-color="#b24f1d"/>
<stop offset="1" stop-color="#d27235"/>
</linearGradient>
<linearGradient id="g0" x1="0" y1="${HORIZON - 40}" x2="0" y2="${HORIZON + 90}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#3a160f"/><stop offset="1" stop-color="#1f0b0a"/>
</linearGradient>
<linearGradient id="g1" x1="0" y1="${HORIZON + 20}" x2="0" y2="${HORIZON + 200}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#260d0b"/><stop offset="1" stop-color="#120606"/>
</linearGradient>
<linearGradient id="g2" x1="0" y1="${HORIZON + 100}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#150706"/><stop offset=".5" stop-color="#0a0304"/><stop offset="1" stop-color="#040102"/>
</linearGradient>
<linearGradient id="rk" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#3a1912"/><stop offset=".45" stop-color="#1c0c09"/><stop offset="1" stop-color="#090303"/>
</linearGradient>
<linearGradient id="rkshade" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".3" stop-color="#000" stop-opacity=".35"/><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
</linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5">
<stop offset="0" stop-color="#eaa063" stop-opacity=".55"/>
<stop offset=".5" stop-color="#c9683a" stop-opacity=".22"/>
<stop offset="1" stop-color="#c9683a" stop-opacity="0"/>
</radialGradient>
<radialGradient id="blue" cx=".5" cy=".5" r=".5">
<stop offset="0" stop-color="#7f9fc0" stop-opacity=".30"/>
<stop offset=".6" stop-color="#5d7a9c" stop-opacity=".10"/>
<stop offset="1" stop-color="#5d7a9c" stop-opacity="0"/>
</radialGradient>
<radialGradient id="dust" cx=".5" cy=".5" r=".5">
<stop offset="0" stop-color="#c99669" stop-opacity=".22"/>
<stop offset="1" stop-color="#c99669" stop-opacity="0"/>
</radialGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="skymask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${HORIZON}"><rect width="${W}" height="520" fill="url(#fade)"/></mask>
<clipPath id="gc"><path d="${groundClip}"/></clipPath>
<filter id="soft" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency=".9 .55" numOctaves="2" seed="7"/>
<feColorMatrix values="0 0 0 0 .03  0 0 0 0 .01  0 0 0 0 .01  0 0 0 -1.6 1.05"/>
</filter>
<filter id="mottle" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency=".006 .03" numOctaves="3" seed="11"/>
<feColorMatrix values="0 0 0 0 .02  0 0 0 0 .005  0 0 0 0 .005  0 0 0 1.6 -.6"/>
</filter>
</defs>
<rect width="${W}" height="${HORIZON + 30}" fill="url(#sky)"/>
<g mask="url(#skymask)"><g class="sky-turn"><g id="wedge">${stars.join('')}</g>${wedgeUses}</g></g>
<g class="hz h1"><ellipse cx="520" cy="470" rx="760" ry="70" fill="url(#dust)"/></g>
<g class="hz h2"><ellipse cx="1120" cy="560" rx="880" ry="85" fill="url(#dust)"/></g>
<g class="hz h3"><ellipse cx="800" cy="630" rx="1000" ry="60" fill="url(#dust)" opacity=".9"/></g>
<ellipse cx="1180" cy="${HORIZON}" rx="300" ry="120" fill="url(#blue)"/>
<ellipse cx="800" cy="${HORIZON}" rx="1100" ry="150" fill="url(#glow)"/>
${groundSvg.join('')}
<g clip-path="url(#gc)"><rect y="${HORIZON - 80}" width="${W}" height="${H - HORIZON + 80}" filter="url(#mottle)" opacity=".7"/><rect y="${HORIZON - 80}" width="${W}" height="${H - HORIZON + 80}" filter="url(#grain)" opacity=".55"/></g>
<ellipse cx="800" cy="${HORIZON + 6}" rx="1000" ry="18" fill="url(#glow)" opacity=".35"/>
</svg>`

if (svg.length > 131072) throw new Error(`scene too long: ${svg.length}`)
writeFileSync(
  out,
  `// Generated: the Mars-at-dusk backdrop. Ground and horizon are still; only the sky moves.\nexport const SCENE = ${JSON.stringify(svg)}\n`,
)
console.log(`scene: ${svg.length} characters`)
