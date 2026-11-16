// Generates hooks/scene-rainforest.ts for the scenes mod: the rainforest backdrop as one SVG string.
// Run from the repo root: node generators/rainforest/gen-scene.mjs (or node build.mjs for all).
// An optional path argument writes somewhere else instead.
//
// A Southeast Asian lowland rainforest, grown rather than drawn (see
// philosophy.md): noise-walked trunks with buttress roots, recursive branches,
// a flow-field leaf litter, fog-graded depth layers, drifting mist, breathing
// light shafts, flickering sun flecks. Creatures come and go on prime cycles;
// one cycle is a story: a tiger stalks a troop of macaques, pounces, misses.
import { writeFileSync } from 'node:fs'

const out = process.argv[2] ?? new URL('../../hooks/scene-rainforest.ts', import.meta.url)
const W = 2000
const H = 1000
const TAU = Math.PI * 2

// ---------- Seeded randomness and value noise ----------
let seed = 20261115
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const rr = (a, b) => a + rand() * (b - a)
const pick = a => a[Math.floor(rand() * a.length)]
const P = [...Array(256).keys()]
for (let i = 255; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1))
  ;[P[i], P[j]] = [P[j], P[i]]
}
const hash = (x, y) => P[(P[x & 255] + y) & 255] / 255
function vn(x, y) {
  const X = Math.floor(x)
  const Y = Math.floor(y)
  const fx = x - X
  const fy = y - Y
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const a = hash(X, Y) + (hash(X + 1, Y) - hash(X, Y)) * u
  const b = hash(X, Y + 1) + (hash(X + 1, Y + 1) - hash(X, Y + 1)) * u
  return a + (b - a) * v
}
function fbm(x, y) {
  let s = 0
  let a = 0.5
  let f = 1
  for (let o = 0; o < 4; o++) {
    s += a * vn(x * f, y * f)
    a /= 2
    f *= 2
  }
  return s / 0.9375
}
const i0 = n => Math.round(n)
const r1 = n => Math.round(n * 10) / 10

// Colour: mix a colour towards the fog of the air. t = 0 is the colour, 1 is fog.
const hex = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16))
const toHex = a => `#${a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`
const mix = (a, b, t) => toHex(hex(a).map((v, k) => v + (hex(b)[k] - v) * t))
const FOG = '#3b4d42'

// The ground line.
const G = x => 880 + 10 * Math.sin(x / 260 + 1) + 22 * (fbm(x / 320, 3.3) - 0.5)

// ---------- Leaves: many small blades gathered into one path per colour ----------
function leafD(x, y, ang, len, wid, k = i0) {
  const dx = Math.cos(ang) * len
  const dy = Math.sin(ang) * len
  const nx = -Math.sin(ang) * wid
  const ny = Math.cos(ang) * wid
  return `M${k(x)} ${k(y)}q${k(dx / 2 + nx)} ${k(dy / 2 + ny)} ${k(dx)} ${k(dy)}q${k(-dx / 2 - nx)} ${k(-dy / 2 - ny)} ${k(-dx)} ${k(-dy)}`
}
class Bucket {
  constructor() { this.m = new Map() }
  add(fill, d) { this.m.set(fill, (this.m.get(fill) ?? '') + d) }
  svg(extra = '') { return [...this.m].map(([c, d]) => `<path fill="${c}"${extra} d="${d}"/>`).join('') }
}
class Strokes {
  constructor() { this.m = new Map() }
  add(stroke, w, d) {
    const k = `${stroke}|${w}`
    this.m.set(k, (this.m.get(k) ?? '') + d)
  }
  svg(extra = '') {
    return [...this.m].map(([k, d]) => {
      const [c, w] = k.split('|')
      return `<path fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"${extra} d="${d}"/>`
    }).join('')
  }
}

// ---------- Trees: noise-walked trunks, buttress roots, recursive branches ----------
function tree(x, w, fog, leaves, wood, opts = {}) {
  const top = opts.top ?? -20
  const base = G(x)
  const n = opts.detail ? 16 : 8
  const L = []
  const R = []
  const nx = rand() * 50
  for (let k = 0; k <= n; k++) {
    const t = k / n
    const y = top + (base - top) * t
    const lean = (fbm(nx, t * 2.2) - 0.5) * w * 1.6
    const near = Math.max(0, (t - 0.82) / 0.18)
    const flare = 1 + 2.4 * near * near
    L.push([x + lean - (w / 2) * flare * (1 + (fbm(nx + 9, t * 6) - 0.5) * 0.25), y])
    R.push([x + lean + (w / 2) * flare * (1 + (fbm(nx + 19, t * 6) - 0.5) * 0.25), y])
  }
  R[n][1] += 4
  L[n][1] += 4
  const col = mix(opts.bark ?? '#1d2a1e', FOG, fog)
  let d = `M${L.map(p => `${i0(p[0])} ${i0(p[1])}`).join('L')}L${R.reverse().map(p => `${i0(p[0])} ${i0(p[1])}`).join('L')}Z`
  R.reverse()
  let s = `<path fill="${col}" d="${d}"/>`
  if (opts.detail) {
    // Bark: striations that follow the trunk.
    let bark = ''
    for (let j = 0; j < 7; j++) {
      const f = (j + 0.5) / 7
      let p = ''
      for (let k = 2; k <= n; k += 2) {
        const xx = L[k][0] + (R[k][0] - L[k][0]) * (f + (fbm(j * 3.1, k * 0.7) - 0.5) * 0.12)
        p += `${k === 2 ? 'M' : 'L'}${i0(xx)} ${i0(L[k][1])}`
      }
      bark += p
    }
    s += `<path fill="none" stroke="${mix('#3c4d36', FOG, fog)}" stroke-opacity=".45" stroke-width="1.2" d="${bark}"/>`
    // Rim light on the side facing the canopy gap.
    s += `<path fill="none" stroke="#a7c47e" stroke-opacity=".22" stroke-width="2" d="M${R.slice(1, n - 1).map(p => `${i0(p[0] - 1)} ${i0(p[1])}`).join('L')}"/>`
    // Moss.
    for (let m = 0; m < 5; m++) {
      const k = Math.floor(rr(3, n - 1))
      const xx = L[k][0] + (R[k][0] - L[k][0]) * rr(0.1, 0.6)
      s += `<ellipse cx="${i0(xx)}" cy="${i0(L[k][1] + rr(-20, 20))}" rx="${i0(rr(4, w / 3))}" ry="${i0(rr(8, 22))}" fill="#3d5a2c" fill-opacity=".35"/>`
    }
  }
  // Branches.
  const nb = opts.branches ?? 3
  for (let b = 0; b < nb; b++) {
    const k = Math.floor(rr(2, n * 0.55))
    const side = b % 2 ? 1 : -1
    const px = side > 0 ? R[k][0] : L[k][0]
    branch(px, L[k][1], side > 0 ? rr(-0.6, -0.1) : Math.PI + rr(0.1, 0.6), rr(90, 160) * (opts.reach ?? 1), Math.max(2, w * 0.28), opts.depth ?? 3, fog, leaves, wood)
  }
  return { svg: s, L, R }
}
function branch(x, y, ang, len, w, depth, fog, leaves, wood) {
  const x2 = x + Math.cos(ang) * len
  const y2 = y + Math.sin(ang) * len
  const bend = (rand() - 0.5) * len * 0.3
  // Relative curve: the same shape in fewer characters.
  const X = i0(x)
  const Y = i0(y)
  wood.add(mix('#1b261b', FOG, fog), r1(Math.max(0.8, w)), `M${X} ${Y}q${i0((x + x2) / 2 - Math.sin(ang) * bend) - X} ${i0((y + y2) / 2 + Math.cos(ang) * bend) - Y} ${i0(x2) - X} ${i0(y2) - Y}`)
  if (depth === 0 || len < 26) {
    cluster(x2, y2, 4 + Math.floor(rand() * 3), fog, leaves, 1.3)
    return
  }
  const g = 0.618
  branch(x2, y2, ang - g * rr(0.5, 0.9), len * rr(0.62, 0.74), w * 0.62, depth - 1, fog, leaves, wood)
  branch(x2, y2, ang + g * rr(0.4, 0.8), len * rr(0.6, 0.72), w * 0.6, depth - 1, fog, leaves, wood)
  if (rand() < 0.6) cluster((x + x2) / 2, (y + y2) / 2, 4, fog, leaves, 0.9)
}
let farBlobs = 0
const LEAF = ['#1c2f1a', '#24391f', '#2c4524', '#1a2a1c', '#33502a']
function cluster(x, y, n, fog, leaves, size = 1) {
  if (fog > 0.5) {
    const r = i0(rr(16, 30))
    const c = mix(pick(LEAF), FOG, fog)
    // One far blob in three is left out, by count so the layout stays put.
    if (farBlobs++ % 3 !== 2) leaves.add(c, `M${i0(x - r)} ${i0(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`)
    return
  }
  SPRAYS.push(`<use href="#s${Math.floor(rand() * 3)}" transform="translate(${i0(x)} ${i0(y)}) rotate(${i0(rr(-40, 40))}) scale(${r1(rr(0.8, 1.25) * size)})"/>`)
}
// Leaf sprays: a few hand-tuned shapes of a dozen leaves, reused all over the
// mid layer so the trees can be dense without the scene growing heavy.
const SPRAYS = []
function spray(n, spread, len, cols) {
  const b = new Bucket()
  let stem = ''
  for (let k = 0; k < n; k++) {
    const t = k / (n - 1)
    const a = Math.PI / 2 + (t - 0.5) * 2 * spread + rr(-0.15, 0.15)
    const ox = Math.cos(a) * 6
    const oy = Math.sin(a) * 6 - 4
    const l = len * rr(0.7, 1.15)
    stem += `M0 -4L${r1(ox)} ${r1(oy)}`
    b.add(mix(cols[k % cols.length], FOG, 0.3), leafD(ox, oy, a + rr(-0.2, 0.2), l, l * 0.3, r1))
  }
  return `<path d="${stem}" stroke="#18261a" stroke-width="1.2"/>${b.svg()}`
}
const SPRAY_DEFS = [
  spray(13, 1.5, 30, ['#1f3a1c', '#2c4f25', '#3a6230']),
  spray(11, 1.1, 38, ['#1a3019', '#284622', '#335a2a']),
  spray(15, 2.0, 24, ['#24401f', '#2f5428', '#456f34']),
].map((d, k) => `<symbol id="s${k}" overflow="visible">${d}</symbol>`).join('')

// ---------- Far layer: pale trunks in the fog ----------
const farLeaves = new Bucket()
const farWood = new Strokes()
let far = ''
for (let k = 0; k < 13; k++) {
  const x = 40 + k * 158 + rr(-40, 40)
  far += tree(x, rr(12, 26), 0.7, farLeaves, farWood, { branches: 2, reach: 0.7, bark: '#24322a', depth: 2 }).svg
}
// Far canopy: a ragged roof, open over the light gap.
let canopy = ''
for (let k = 0; k < 70; k++) {
  const x = rr(-60, W + 60)
  const gap = Math.exp(-(((x - 1380) / 230) ** 2))
  if (rand() < gap * 0.8) continue
  canopy += `<circle cx="${i0(x)}" cy="${i0(rr(-30, 120) * (1 - gap * 0.6))}" r="${i0(rr(50, 120))}"/>`
}

// ---------- Mid layer: the trees the animals use ----------
const midLeaves = new Bucket()
const midWood = new Strokes()
const MIDTREES = [
  { x: 150, w: 54 }, { x: 545, w: 66 }, { x: 860, w: 40 }, { x: 1395, w: 74 }, { x: 1745, w: 52 },
]
let mid = ''
const trunks = {}
for (const t of MIDTREES) {
  const tr = tree(t.x, t.w, 0.12, midLeaves, midWood, { detail: true, branches: 3 })
  trunks[t.x] = tr
  mid += tr.svg
}
// A sweep of high branch that the gibbons travel along.
midWood.add('#18231a', 6, `M820 262Q1100 300 1420 238`)
midWood.add('#18231a', 4, `M1420 238Q1600 220 1760 250`)

// Lianas: sagging loops between trunks, and hanging vines.
const vines = new Strokes()
const vineLeaves = new Bucket()
const loops = [[150, 300, 545, 260, 140], [545, 330, 860, 380, 90], [860, 200, 1395, 340, 160], [1395, 420, 1745, 300, 120], [-20, 120, 150, 220, 60], [1745, 180, 2020, 260, 80]]
for (const [x1, y1, x2, y2, sag] of loops) {
  vines.add('#121b13', 4, `M${x1} ${y1}Q${i0((x1 + x2) / 2)} ${i0((y1 + y2) / 2 + sag * 2)} ${x2} ${y2}`)
}
let hanging = ''
for (let k = 0; k < 12; k++) {
  const x = rr(30, W - 30)
  const top = rr(-10, 160)
  const len = rr(260, 620)
  const sway = rr(-30, 30)
  let d = `M${i0(x)} ${i0(top)}q${i0(sway)} ${i0(len / 2)} ${i0(sway * 0.4)} ${i0(len)}`
  let lv = ''
  let leafNo = 0
  for (let y = 40; y < len; y += rr(26, 44)) {
    const t = y / len
    const xx = x + sway * 2 * t * (1 - t) + sway * 0.4 * t * t
    const a = Math.PI / 2 + (rand() < 0.5 ? -0.9 : 0.9)
    const l = rr(8, 14)
    // Every other leaf only, by count so the layout stays put.
    if (leafNo++ % 2 === 0) lv += leafD(xx, top + y, a, l, 3)
  }
  const cls = k % 3 === 0 ? ` class="vs" style="transform-origin:${i0(x)}px ${i0(top)}px;animation-delay:${-i0(rand() * 9)}s"` : ''
  hanging += `<g${cls}><path fill="none" stroke="#152117" stroke-width="1.6" d="${d}"/><path fill="#1f321c" d="${lv}"/></g>`
}

for (let k = 0; k < 46; k++) {
  const x = rr(0, W)
  if (Math.abs(x - 1380) < 160 && rand() < 0.8) continue
  cluster(x, rr(-10, 150), 0, 0, null, rr(1.2, 1.8))
}
// The orangutan's branch and the stick insect's twig.
midWood.add('#18231a', 5, 'M500 252Q600 236 720 226')
midWood.add('#18231a', 3, 'M176 520Q300 506 430 492')
// ---------- Ground: soil, roots and a flow-field leaf litter ----------
let ground = `M0 ${H}`
for (let x = 0; x <= W; x += 40) ground += `L${x} ${i0(G(x))}`
ground += `L${W} ${H}Z`
const LITTER = ['#3e3120', '#4a3a22', '#2e2618', '#55432a', '#38461f', '#433f20', '#5e4a2c']
const litter = new Bucket()
const litterTop = new Bucket()
let placed = 0
for (let k = 0; placed < 270 && k < 4000; k++) {
  const x = rand() * W
  const g = G(x)
  const y = g - 2 + rand() * (H - g + 4)
  const dens = fbm(x / 180, y / 90)
  if (dens < 0.38) continue
  placed++
  const depthT = (y - g) / (H - g)
  const s = 0.55 + depthT * 0.8
  const ang = fbm(x / 240 + 7, y / 160) * TAU * 1.6
  const c = mix(LITTER[Math.floor(fbm(x / 90 + 3, y / 60) * LITTER.length * 1.3) % LITTER.length], FOG, (1 - depthT) * 0.35)
  const len = rr(10, 18) * s
  const wid = rr(3, 5.5) * s
  if (placed % 3 !== 0) litter.add(c, leafD(x, y, ang, len, wid))
}
for (let k = 0; k < 100; k++) {
  const x = rand() * W
  const g = G(x)
  const y = g + 6 + rand() * (H - g)
  const ang = fbm(x / 240 + 7, y / 160) * TAU * 1.6
  const c = pick(LITTER)
  const len = rr(10, 16)
  const wid = rr(3, 5)
  if (k % 2 === 0) litterTop.add(c, leafD(x, y, ang, len, wid))
}
let roots = ''
for (const t of MIDTREES) {
  for (let k = 0; k < 3; k++) {
    const dir = k % 2 ? 1 : -1
    const x = t.x + dir * t.w * rr(0.6, 1.2)
    roots += `M${i0(x)} ${i0(G(t.x) - 6)}q${i0(dir * rr(40, 90))} ${i0(rr(6, 20))} ${i0(dir * rr(110, 190))} ${i0(rr(10, 34))}`
  }
}

// ---------- Light: shafts, sun flecks, spores, mist, drips ----------
let shafts = ''
for (let k = 0; k < 6; k++) {
  const x = 1210 + k * 62 + rr(-20, 20)
  const w = rr(16, 46)
  const lean = rr(380, 520)
  shafts += `<path d="M${i0(x)} 40L${i0(x + w)} 40L${i0(x + w * 2.6 - lean)} ${i0(G(x - lean))}L${i0(x - lean)} ${i0(G(x - lean))}Z" fill="url(#shaft)" class="sh" style="animation-duration:${i0(rr(17, 31))}s;animation-delay:${-i0(rand() * 30)}s"/>`
}
let flecks = ''
for (let k = 0; k < 40; k++) {
  const onGround = k < 26
  const x = onGround ? rr(720, 1500) : pick([545, 860, 1395, 150, 1745]) + rr(-8, 22)
  const y = onGround ? G(x) + rr(4, 90) : rr(380, 800)
  const rx = onGround ? rr(6, 22) : rr(3, 7)
  const ry = onGround ? rx * rr(0.22, 0.4) : rr(5, 12)
  flecks += `<ellipse cx="${i0(x)}" cy="${i0(y)}" rx="${i0(rx)}" ry="${i0(ry)}" fill="url(#fleck)" class="f${k % 4}"/>`
}
let spores = ''
for (let k = 0; k < 36; k++) {
  const t = rand()
  const x = 1000 + rr(0, 560) - t * 120
  const y = 120 + t * 720
  spores += `<circle cx="${i0(x)}" cy="${i0(y)}" r="${r1(rr(0.6, 1.6))}" class="sp" style="animation-delay:${-i0(rand() * 50)}s"/>`
}
function mist(y0, h, n, op, cls) {
  let s = ''
  for (let k = 0; k < n; k++) {
    const x = rr(-300, W + 300)
    const y = y0 + (fbm(x / 400, y0) - 0.5) * h + rr(-h / 3, h / 3)
    s += `<ellipse cx="${i0(x)}" cy="${i0(y)}" rx="${i0(rr(160, 360))}" ry="${i0(rr(18, 52))}"/>`
  }
  return `<g class="${cls}" fill="url(#mist)" opacity="${op}">${s}</g>`
}
let drips = ''
for (let k = 0; k < 7; k++) {
  const x = rr(100, W - 100)
  const y = rr(180, 520)
  drips += `<path d="M${i0(x)} ${i0(y)}v5" class="dr" style="animation-duration:${r1(rr(7, 14))}s;animation-delay:${-r1(rand() * 14)}s"/>`
}

// ---------- Foreground: big near leaves and ferns, lens-blurred ----------
function bigLeaf(x, y, ang, len, wid) {
  const dx = Math.cos(ang)
  const dy = Math.sin(ang)
  const px = -dy
  const py = dx
  const pt = (t, o) => `${i0(x + dx * len * t + px * o)} ${i0(y + dy * len * t + py * o)}`
  const wv = t => wid * Math.sin(Math.PI * Math.pow(t, 0.8)) * (1 + (rand() - 0.5) * 0.08)
  let d = `M${pt(0, 0)}`
  for (let t = 0.1; t <= 1.001; t += 0.1) d += `L${pt(t, wv(t))}`
  for (let t = 0.9; t >= -0.001; t -= 0.1) d += `L${pt(t, -wv(t))}`
  let veins = `M${pt(0, 0)}L${pt(1, 0)}`
  for (let t = 0.15; t < 0.9; t += 0.11) veins += `M${pt(t, 0)}L${pt(t + 0.1, wv(t + 0.1) * 0.85)}M${pt(t, 0)}L${pt(t + 0.1, -wv(t + 0.1) * 0.85)}`
  return `<path d="${d}Z" fill="#060a06"/><path d="${veins}" fill="none" stroke="#2c4125" stroke-opacity=".5" stroke-width="1.5"/>`
}
function fern(x, y, ang, len, curl, fill = '#0e180d') {
  let a = ang
  let px = x
  let py = y
  let rach = `M${i0(x)} ${i0(y)}`
  let lf = ''
  const steps = 10
  for (let k = 1; k <= steps; k++) {
    const t = k / steps
    a += curl / steps
    const nx2 = px + Math.cos(a) * (len / steps)
    const ny2 = py + Math.sin(a) * (len / steps)
    rach += `L${i0(nx2)} ${i0(ny2)}`
    const ll = len * 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05))
    if (ll > 2) {
      lf += leafD(nx2, ny2, a - 1.15, ll, ll * 0.18)
      lf += leafD(nx2, ny2, a + 1.15, ll, ll * 0.18)
    }
    px = nx2
    py = ny2
  }
  return `<path d="${rach}" fill="none" stroke="${fill}" stroke-width="2"/><path d="${lf}" fill="${fill}"/>`
}
let fore = ''
// Bottom-left and bottom-right clumps of large leaves.
for (const [x, y, a, l, w] of [[-40, 1020, -1.1, 420, 70], [60, 1030, -0.7, 360, 60], [-30, 900, -0.35, 300, 52], [160, 1040, -1.5, 260, 44],
  [2040, 1020, -2.1, 420, 70], [1940, 1035, -2.45, 330, 56], [2040, 880, -2.8, 300, 50], [1860, 1050, -1.7, 240, 40]]) fore += bigLeaf(x, y, a, l, w)
// Leaves hanging into the top corners.
for (const [x, y, a, l, w] of [[-30, -20, 0.55, 300, 46], [120, -40, 1.2, 240, 40], [2030, -20, 2.6, 300, 46], [1880, -40, 1.95, 220, 38]]) fore += bigLeaf(x, y, a, l, w)
let ferns = ''
for (const [x, a, l, c] of [[420, -1.9, 170, -0.9], [470, -1.2, 150, 0.8], [700, -1.7, 120, -0.6], [1010, -1.4, 130, 0.7], [1290, -1.9, 120, -0.7], [1560, -1.3, 160, 0.9], [1600, -1.95, 150, -0.9], [300, -1.5, 110, 0.5], [1760, -1.6, 130, 0.6]]) {
  ferns += `<g class="fs" style="transform-origin:${x}px 1000px;animation-delay:${-i0(rand() * 11)}s">${fern(x, 1004, a, l, c)}</g>`
}

// ---------- Creatures ----------
const CYCLES = [61, 67, 71, 79, 83, 89, 97, 101, 107, 113, 127, 131]
function life(x, y, body, { s = 1, flip = false, move, cycle, vis = 'ap', rot = 0 } = {}) {
  const dur = cycle ?? pick(CYCLES)
  const delay = -Math.round(rand() * dur)
  const anim = move ? `${vis} ${dur}s ${delay}s infinite,${move} ${dur}s ${delay}s linear infinite` : `${vis} ${dur}s ${delay}s infinite`
  const face = `${rot ? `rotate(${rot}) ` : ''}scale(${flip ? -s : s} ${s})`
  return `<g transform="translate(${i0(x)} ${i0(y)})"><g class="a" style="animation:${anim}"><g transform="${face}">${body}</g></g></g>`
}
const hinge = (cls, x, y, body, delay = 0) =>
  `<g class="${cls}" style="transform-origin:${x}px ${y}px${delay ? `;animation-delay:${delay}s` : ''}">${body}</g>`

// Weaver ant: orange, tiny. Facing right.
const ANT = `<g fill="#c9772e"><ellipse cx="-4" rx="2.6" ry="1.8"/><circle cx="0" r="1.2"/><circle cx="3" r="1.6"/></g><path d="M0 0l-2 3M0 0l2 3M0 0l-3-3M0 0l1-3M4-1l3-3" stroke="#c9772e" stroke-width=".5" fill="none" class="lg"/>`
// Rhinoceros beetle: glossy, horned. Facing up.
const BEETLE = `<ellipse rx="7" ry="10" fill="#2a1a10" stroke="#8a5a34" stroke-opacity=".6"/><path d="M0 -10 Q-1 -18 3 -22" stroke="#3a2416" stroke-width="2.4" fill="none"/><path d="M0 -2V10" stroke="#8a5a34" stroke-opacity=".5"/>
<g class="lg" stroke="#2a1a10" stroke-width="1.2"><path d="M-6 -4l-6-3M-7 2l-6 1M-6 7l-5 4M6 -4l6-3M7 2l6 1M6 7l5 4"/></g>`
// Atlas moth: rests on bark, slowly opening and closing its wings.
const MOTHWING = `<path d="M0 -2 Q-18 -30 -46 -26 Q-54 -18 -48 -8 Q-30 -4 0 2Z" fill="#9a4528"/><path d="M0 2 Q-26 4 -36 18 Q-30 30 -12 24 Q-4 14 0 4Z" fill="#8a3a22"/>
<path d="M-48 -24 Q-54 -20 -50 -14" stroke="#e0c36a" stroke-width="3" fill="none"/><path d="M-26 -18l6 -2l1 5z M-20 10l5 -2l1 4z" fill="#f4e6c2" fill-opacity=".8"/><path d="M-8 -6 Q-30 -14 -44 -12 M-6 6 Q-20 10 -28 18" stroke="#f0d9a8" stroke-opacity=".5" fill="none"/>`
const MOTH = `${hinge('mw', 0, 0, MOTHWING)}<g transform="scale(-1 1)">${hinge('mw', 0, 0, MOTHWING)}</g><ellipse rx="3.5" ry="11" fill="#6a2a18"/>`
// Rajah Brooke's birdwing: black wings, bright green bands. Flaps fast.
const BWING = `<path d="M0 0 Q-6 -24 -30 -28 Q-34 -16 -14 -2Z" fill="#0b0f0b"/><path d="M-6 -10l-18 -12M-5 -6l-16 -6" stroke="#5ff07a" stroke-width="3.2" stroke-linecap="round"/><path d="M0 0 Q-20 6 -18 18 Q-6 14 0 2Z" fill="#0b0f0b"/><path d="M-8 6l-6 6" stroke="#5ff07a" stroke-width="2.4" stroke-linecap="round"/>`
const BIRDWING = `${hinge('bw', 0, 0, BWING)}<g transform="scale(-1 1)">${hinge('bw', 0, 0, BWING, -0.05)}</g><ellipse rx="1.8" ry="9" fill="#141a14"/><circle cy="-9" r="2" fill="#c43a2a"/>`
// Dragonfly.
const DRAGON = `<path d="M-30 0H8" stroke="#3fae9a" stroke-width="2.2"/><circle cx="10" r="3" fill="#2a8a7a"/>
<g class="dw" fill="#bfe8e0" fill-opacity=".35"><ellipse cx="0" cy="-8" rx="3" ry="11" transform="rotate(20)"/><ellipse cx="-6" cy="-8" rx="3" ry="11" transform="rotate(-20 -6 0)"/><ellipse cx="0" cy="8" rx="3" ry="11" transform="rotate(-20)"/><ellipse cx="-6" cy="8" rx="3" ry="11" transform="rotate(20 -6 0)"/></g>`
// Stick insect: sways like a twig in the breeze.
const STICK = `<path d="M-40 0L36 -2M-10 -1l-8 -16M-10 0l-10 14M8 -1l6 -18M8 -1l10 14M22 -2l18 -12M22 -2l18 8M-40 0l-12 -4M36 -2l10 -10M36 -2l12 -4" stroke="#6f6a3a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
// Orchid mantis: pink petal legs.
const MANTIS = `<path d="M-10 0 Q0 -8 12 -4 Q14 0 10 4 Q0 8 -10 0Z" fill="#f0c4d8"/><g fill="#f6d6e4"><ellipse cx="-4" cy="8" rx="5" ry="3"/><ellipse cx="4" cy="8" rx="5" ry="3"/></g>
<path d="M12 -4l6 -12l4 4" stroke="#f0c4d8" stroke-width="2" fill="none"/><circle cx="16" cy="-14" r="2.4" fill="#f6d6e4"/>`
// Cicada.
const CICADA = `<ellipse rx="4" ry="9" fill="#2f3a24"/><g class="vib"><path d="M0 -6 Q-12 4 -4 18Z M0 -6 Q12 4 4 18Z" fill="#cfe0c0" fill-opacity=".35" stroke="#9aaa8a" stroke-opacity=".5" stroke-width=".5"/></g><circle cy="-9" r="3" fill="#3a4a2a"/>`
// Giant pill millipede: glossy segments.
const MILLI = `${Array.from({ length: 12 }, (_, k) => `<ellipse cx="${-k * 5}" cy="0" rx="3.4" ry="4" fill="${k % 2 ? '#2a1c14' : '#3a2618'}"/>`).join('')}<path d="${Array.from({ length: 12 }, (_, k) => `M${-k * 5} 3l-1 3`).join('')}" stroke="#7a5236" stroke-width=".6" class="lg"/>`
// Ground beetle.
const GBEETLE = `<ellipse rx="5" ry="3.4" fill="#1d2420" stroke="#5a8a6a" stroke-opacity=".5" stroke-width=".6"/><circle cx="5" r="2" fill="#1d2420"/><path d="M-2 -3l-2 -3M2 -3l2 -3M-2 3l-2 3M2 3l2 3" stroke="#1d2420" class="lg"/>`
// Synchronised fireflies.
let flies = ''
for (let k = 0; k < 26; k++) {
  const a = rand() * TAU
  const d = Math.sqrt(rand())
  flies += `<use href="#fly" x="${i0(Math.cos(a) * 90 * d)}" y="${i0(Math.sin(a) * 40 * d)}"/>`
}
// Wallace's flying frog on a leaf: throat pulses.
const FROG = `<path d="M-14 4 Q-16 -8 -4 -10 Q10 -12 14 -2 Q14 6 2 8 Q-10 8 -14 4Z" fill="#3f8a34"/><g class="thr" style="transform-origin:8px 4px"><ellipse cx="8" cy="5" rx="5" ry="3" fill="#d8e090" fill-opacity=".7"/></g>
<circle cx="8" cy="-9" r="3.4" fill="#3f8a34"/><circle cx="8.6" cy="-9.4" r="1.6" fill="#141a10"/><path d="M-10 6 Q-18 10 -20 14 M6 7l4 7" stroke="#3f8a34" stroke-width="2.2" fill="none"/><path d="M-20 14l-4 2M-20 14l-1 4 M10 14l3 2" stroke="#e08a3a" stroke-width="1.6"/>`
// Draco: the gliding lizard, orange patagium spread.
const DRACO = `<path d="M-6 0 Q-10 -18 4 -20 Q12 -10 6 0Z M-6 0 Q-10 18 4 20 Q12 10 6 0Z" fill="#d9773a" fill-opacity=".85"/><path d="M-30 0H22" stroke="#6a6a44" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="0" r="3.6" fill="#6a6a44"/>`
// Rhinoceros hornbill: big black wings, white tail, orange casque.
const HWING = `<path d="M-8 -4 Q2 -44 30 -52 Q20 -22 12 -2Z" fill="#0d0e0c"/><path d="M8 -26 Q18 -40 30 -52 Q22 -30 16 -22Z" fill="#e8e4d8" fill-opacity=".55"/>`
const HORNBILL = `<path d="M-26 -2L-62 -6L-62 8L-26 4Z" fill="#e8e4d8"/><path d="M-50 -5V7" stroke="#0d0e0c" stroke-width="5"/><ellipse rx="28" ry="9" fill="#0d0e0c"/>
<circle cx="28" cy="-4" r="7" fill="#0d0e0c"/><path d="M32 -4 Q52 -2 66 10 Q48 6 32 2Z" fill="#e2b04a"/><path d="M32 -8 Q48 -20 58 -6 Q46 -6 34 -4Z" fill="#d8642a"/>
${hinge('hw', 0, -2, HWING)}`
// Lar gibbon hanging by one hand: pale face ring. Swings from (0,0).
const GIBBON = `<g fill="none" stroke="#8a7254" stroke-linecap="round"><path d="M0 0L-3 34" stroke-width="4"/><path d="M-1 38Q16 30 34 8" stroke-width="3.6"/><path d="M-10 64Q-14 76 -4 78M-4 64Q2 74 8 70" stroke-width="4"/></g>
<ellipse cx="-6" cy="52" rx="9" ry="15" fill="#8a7254"/><circle cx="-12" cy="34" r="7.5" fill="#8a7254"/><circle cx="-11" cy="35" r="3.6" fill="#2a2018" stroke="#efe4d0" stroke-width="1"/>`
// Bornean orangutan sitting in a fork, one long arm up.
const ORANG = `<g fill="#7d3a18"><path d="M-24 0 Q-32 -42 -12 -60 Q0 -68 12 -60 Q32 -42 24 0Z"/><circle cx="0" cy="-72" r="14"/></g>
<path d="M14 -52 Q32 -96 26 -136M-16 -48 Q-34 -20 -26 4" stroke="#7d3a18" stroke-width="9" stroke-linecap="round" fill="none"/>
<g class="look" style="transform-origin:0 -72px"><ellipse cx="2" cy="-70" rx="9" ry="10" fill="#3a2214"/><circle cx="-1" cy="-73" r="1.4" fill="#d8a060"/><circle cx="5" cy="-73" r="1.4" fill="#d8a060"/></g>
<path d="M-20 -40l-6 8M-16 -20l-6 8M18 -36l6 8M20 -16l6 6" stroke="#a8582a" stroke-opacity=".7" stroke-width="1.6"/>`

// Long-tailed macaque, sitting and foraging.
const MACAQUE = `<g fill="#6a5c48"><path d="M-8 0 Q-13 -11 -8 -19 Q-3 -25 3 -23 Q9 -21 9 -12 Q10 -4 7 0Z"/>
<path d="M-8 -2 Q-28 0 -32 -14 Q-34 -26 -25 -30" fill="none" stroke="#6a5c48" stroke-width="2.4" stroke-linecap="round"/>
<path d="M4 -14 L11 -2" stroke="#6a5c48" stroke-width="3.2" stroke-linecap="round"/>
<g class="peck" style="transform-origin:4px -22px"><circle cx="7" cy="-27" r="6.4"/><ellipse cx="10" cy="-26" rx="3.2" ry="3.6" fill="#a8927a"/><circle cx="10.5" cy="-27.5" r=".9" fill="#1a120c"/></g></g>`

// The tiger. Crouched stalking body, legs that walk or hold still, and a leap pose.
const TC = '#a85b26'
const TD = '#7a4019'
const STRIPE = '#170c06'
const legF = (x, c) => `<path d="M${x - 7} -36L${x + 7} -36L${x + 12} -2Q${x + 13} 2 ${x + 6} 2L${x} 2Z" fill="${c}"/>`
const legH = (x, c) => `<path d="M${x - 14} -38Q${x + 8} -38 ${x + 6} -20L${x + 14} -2Q${x + 15} 2 ${x + 8} 2L${x} 2L${x - 6} -16Z" fill="${c}"/>`
const tigerLegs = walking => {
  const w = (cls, x, body, d) => (walking ? hinge(cls, x, -32, body, d) : body)
  return {
    far: w('st', 28, legF(28, TD), -0.9) + w('st', -66, legH(-66, TD), 0),
    near: w('st', 40, legF(40, TC), 0) + w('st', -78, legH(-78, TC), -0.9),
  }
}
const stripes = (pts, len) => pts.map(([x, y]) => `M${x} ${y}q4 ${len / 2} -1 ${len}`).join('')
const TORSO = `<path d="M-95 -36Q-92 -54 -60 -52Q-22 -50 8 -58Q40 -64 58 -48Q66 -34 54 -24Q20 -18 -20 -20Q-66 -16 -90 -22Q-100 -28 -95 -36Z" fill="${TC}"/>
<path d="M-80 -24Q-40 -18 10 -22Q40 -24 50 -28" stroke="#d9b48a" stroke-opacity=".35" stroke-width="5" fill="none"/>
<path d="${stripes([[-80, -50], [-64, -51], [-48, -51], [-32, -51], [-16, -52], [0, -56], [16, -60], [32, -60]], 22)}" stroke="${STRIPE}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`
const THEAD = `<path d="M50 -50Q62 -62 82 -58Q100 -54 108 -42Q112 -32 103 -28Q90 -24 76 -28Q60 -30 50 -40Z" fill="${TC}"/>
<path d="M62 -57L64 -67L72 -59ZM76 -58L80 -67L85 -56Z" fill="${TD}"/><ellipse cx="100" cy="-34" rx="9" ry="5.5" fill="#e6d2b4" fill-opacity=".7"/>
<path d="M70 -56l3 8M78 -57l1 7M60 -46l8 4" stroke="${STRIPE}" stroke-width="2" stroke-linecap="round"/><circle cx="89" cy="-46" r="2.2" fill="#ffe27a"/><circle cx="107" cy="-37" r="2" fill="#2a1a12"/>`
const TTAIL = `<path d="M-94 -34Q-128 -44 -146 -26Q-156 -14 -148 -6" stroke="${TC}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M-151 -16Q-156 -10 -148 -6M-120 -40l2 8M-136 -36l4 6" stroke="${STRIPE}" stroke-width="3" stroke-linecap="round" fill="none"/>`
const walkL = tigerLegs(true)
const stillL = tigerLegs(false)
const TIGER_BODY = `${hinge('tt', -94, -34, TTAIL)}${TORSO}<g class="th" style="transform-origin:56px -42px">${THEAD}</g>`
const TIGER_LEAP = `<path d="M-88 -62Q-130 -76 -164 -64" stroke="${TC}" stroke-width="7" stroke-linecap="round" fill="none"/>
<path d="M-76 -60L-134 -36L-136 -30L-128 -30L-80 -50ZM56 -62L112 -50L114 -42L108 -42L54 -52Z" fill="${TD}"/>
<path d="M-90 -66Q-50 -82 10 -80Q56 -78 70 -64Q64 -50 20 -50Q-40 -48 -86 -54Z" fill="${TC}"/>
<path d="${stripes([[-72, -76], [-56, -78], [-40, -79], [-24, -80], [-8, -80], [8, -80], [24, -79], [40, -77]], 22)}" stroke="${STRIPE}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
<path d="M-70 -56L-118 -26L-118 -20L-110 -20L-72 -46ZM60 -60L120 -54L122 -46L116 -46L58 -50Z" fill="${TC}"/>
<path d="M64 -76Q80 -90 100 -84Q120 -78 126 -66Q124 -58 112 -58L94 -60Q74 -60 64 -66Z" fill="${TC}"/><path d="M76 -86L78 -95L86 -86Z" fill="${TD}"/>
<path d="M112 -62L126 -60" stroke="#2a1208" stroke-width="2"/><circle cx="102" cy="-76" r="2.2" fill="#ffe27a"/>`

// The ambush: everything here shares one 150 s clock.
const STORY = 150
const STORY_DELAY = -24
const story = name => `animation:${name} ${STORY}s ${STORY_DELAY}s linear infinite`
const TIGER_X = 250
const TIGER_Y = 912
const tiger = `<g transform="translate(${TIGER_X} ${TIGER_Y})"><g style="${story('tgMove')}"><g transform="scale(1.05)">
<g style="${story('tgBody')}"><g style="${story('tgWalk')}">${walkL.far}</g><g style="${story('tgStill')}">${stillL.far}</g>${TIGER_BODY}<g style="${story('tgWalk')}">${walkL.near}</g><g style="${story('tgStill')}">${stillL.near}</g></g>
<g style="${story('tgLeap')}">${TIGER_LEAP}</g></g></g></g>`
// Macaques: where they sit, and where each one flees to.
const TROOP = [[1070, 880, 1.6, -212, -330], [1150, 903, 1.75, 262, -430], [1205, 876, 1.4, 200, -250], [1290, 894, 1.6, 100, -110], [985, 897, 1.3, -120, -190]]
let troop = ''
let troopKeys = ''
TROOP.forEach(([x, y, s, dx, dy], k) => {
  const flip = k % 2 === 1
  troopKeys += `@keyframes mk${k}{0%,${2 + k}%{opacity:0;transform:translate(0,0)}${6 + k}%{opacity:1}${58.6 + k * 0.15}%{opacity:1;transform:translate(0,0)}${60.2 + k * 0.2}%{transform:translate(${i0(dx * 0.35)}px,${i0(dy * 0.15)}px) rotate(${flip ? 25 : -25}deg)}${62.8 + k * 0.3}%{opacity:1;transform:translate(${dx}px,${dy}px) rotate(${flip ? 10 : -10}deg)}${66 + k * 0.3}%,100%{opacity:0;transform:translate(${dx}px,${dy}px)}}\n`
  troop += `<g transform="translate(${x} ${y})"><g style="animation:mk${k} ${STORY}s ${STORY_DELAY}s ease-in-out infinite;opacity:0"><g transform="scale(${flip ? -s : s} ${s})"><g class="peck2" style="animation-delay:${-k * 1.3}s">${MACAQUE}</g></g></g></g>`
})

// Everything else that lives here, each on its own cycle.
const life1 = []
// Weaver ants: a trail down a fallen limb into the litter.
const LIMB = [[1470, 700], [1720, 905]]
const limbAng = Math.atan2(LIMB[1][1] - LIMB[0][1], LIMB[1][0] - LIMB[0][0])
const limbLen = Math.hypot(LIMB[1][0] - LIMB[0][0], LIMB[1][1] - LIMB[0][1])
let ants = ''
for (let k = 0; k < 16; k++) {
  ants += `<g class="ant" style="animation-delay:${-r1(k * 1.55 + rand() * 0.6)}s"><use href="#ant" y="${i0(rr(-5, -2))}"/></g>`
}
const antTrail = `<g transform="translate(${LIMB[0][0]} ${LIMB[0][1]}) rotate(${r1((limbAng * 180) / Math.PI)})">${ants}</g>`
life1.push(life(0, 0, antTrail, { move: null, cycle: 97, vis: 'apL' }))
life1.push(life(1752, 770, BEETLE, { s: 1.4, move: 'up', cycle: 89 }))
life1.push(life(1405, 600, MOTH, { s: 1.1, move: null, cycle: 131, vis: 'apL' }))
life1.push(life(1150, 520, `<g class="flit">${BIRDWING}</g>`, { s: 1.2, move: 'bfly' , cycle: 79 }))
life1.push(life(700, 470, `<g class="flit" style="animation-delay:-2s">${BIRDWING}</g>`, { s: 1, flip: true, move: 'bfly2', cycle: 103 }))
life1.push(life(640, 660, DRAGON, { s: 1.2, move: 'dart', cycle: 71 }))
life1.push(life(330, 500, `<g class="rock" style="transform-origin:0 0">${STICK}</g>`, { s: 1.2, move: null, cycle: 113, vis: 'apL' }))
life1.push(life(1835, 902, `<g class="rock" style="transform-origin:0 6px">${MANTIS}</g>`, { s: 1.3, move: null, cycle: 101 }))
life1.push(life(872, 470, CICADA, { s: 1.2, move: null, cycle: 67 }))
life1.push(life(880, 952, MILLI, { s: 1.3, move: 'creep', cycle: 83 }))
life1.push(life(1300, 940, `<g class="scur">${GBEETLE}</g>`, { s: 1.4, move: null, cycle: 59 }))
life1.push(life(620, 965, `<g class="scur" style="animation-delay:-3s">${GBEETLE}</g>`, { s: 1.2, flip: true, move: null, cycle: 73 }))
life1.push(life(390, 790, `<g class="sync">${flies}</g>`, { move: 'driftL', cycle: 109, vis: 'apL' }))
life1.push(life(1600, 760, FROG, { s: 1.5, move: null, cycle: 127 }))
life1.push(life(1370, 430, DRACO, { s: 1.8, rot: 160, move: 'glide', cycle: 117 }))
// Bigger animals.
life1.push(life(2200, 150, `<g class="hb">${HORNBILL}</g>`, { s: 1.1, flip: true, move: 'cross', cycle: 173, vis: 'apF' }))
life1.push(life(820, 262, `<g class="sw">${GIBBON}</g><g transform="translate(-90 6)"><g class="sw" style="animation-delay:-1.1s">${GIBBON}</g></g>`, { s: 1.3, move: 'brach', cycle: 139, vis: 'apF' }))
life1.push(life(560, 395, ORANG, { s: 1.15, move: null, cycle: 151, vis: 'apL' }))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.a{opacity:0}
@keyframes ap{0%{opacity:0}6%{opacity:1}30%{opacity:1}38%,100%{opacity:0}}
@keyframes apL{0%{opacity:0}10%{opacity:1}55%{opacity:1}65%,100%{opacity:0}}
@keyframes apF{0%{opacity:0}3%{opacity:1}30%{opacity:1}34%,100%{opacity:0}}
@keyframes up{to{transform:translateY(-170px)}}
@keyframes driftL{to{transform:translateX(-60px)}}
@keyframes creep{0%{transform:translate(0,0)}34%{transform:translate(150px,0)}38%,100%{transform:translate(160px,10px)}}
@keyframes bfly{0%{transform:translate(0,0)}8%{transform:translate(90px,-50px)}16%{transform:translate(170px,10px)}24%{transform:translate(260px,-40px)}32%{transform:translate(340px,-90px)}40%,100%{transform:translate(420px,-60px)}}
@keyframes bfly2{0%{transform:translate(0,0)}10%{transform:translate(-80px,40px)}20%{transform:translate(-150px,-20px)}30%{transform:translate(-250px,30px)}40%,100%{transform:translate(-330px,-10px)}}
@keyframes dart{0%,5%{transform:translate(0,0)}6%,12%{transform:translate(110px,-30px)}13%,20%{transform:translate(60px,40px)}21%,28%{transform:translate(190px,10px)}29%,100%{transform:translate(260px,-60px)}}
@keyframes glide{0%,10%{transform:translate(0,0)}15%,100%{transform:translate(-470px,110px)}}
@keyframes cross{0%{transform:translateX(0)}32%,100%{transform:translateX(-2500px)}}
@keyframes brach{0%{transform:translateX(0)}32%,100%{transform:translateX(560px)}}
.ant{animation:ant 25s linear infinite}
@keyframes ant{0%{transform:translateX(0);opacity:0}4%{opacity:1}90%{opacity:1}100%{transform:translateX(${i0(limbLen + 12)}px);opacity:0}}
.lg,.mw,.bw,.vib,.flit,.dw{transform-box:fill-box}
.mw{animation:mw 7s ease-in-out infinite alternate}
@keyframes mw{to{transform:scaleX(.45)}}
.bw{animation:bw 1.4s ease-in-out infinite alternate}
@keyframes bw{to{transform:scaleX(.25)}}
.flit{animation:flit 1.9s ease-in-out infinite alternate}
@keyframes flit{to{transform:translateY(9px)}}
.vib{transform-origin:center top;animation:vib 9s ease-in-out infinite}
@keyframes vib{55%{transform:scaleX(1)}65%{transform:scaleX(.8)}75%{transform:scaleX(1)}}
.rock{animation:rock 6s ease-in-out infinite alternate}
@keyframes rock{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
.scur{animation:scur 12s infinite}
@keyframes scur{0%,20%{transform:translateX(0)}24%,45%{transform:translateX(40px)}50%,70%{transform:translate(55px,-6px)}74%,100%{transform:translate(110px,4px)}}
.sync{animation:sync 1.3s ease-in infinite}
@keyframes sync{0%,100%{opacity:.1}12%{opacity:1}30%{opacity:.1}}
.thr{animation:thr 1.6s ease-in-out infinite alternate}
@keyframes thr{to{transform:scale(1.5)}}
.hw{animation:hw 1.4s ease-in-out infinite alternate}
@keyframes hw{to{transform:scaleY(-.7)}}
.hb{animation:flit 2.2s ease-in-out infinite alternate}
.sw{transform-origin:0 0;animation:sw 2.4s ease-in-out infinite alternate}
@keyframes sw{from{transform:rotate(-24deg)}to{transform:rotate(22deg)}}
.look{animation:look 11s ease-in-out infinite}
@keyframes look{40%{transform:rotate(0)}50%,70%{transform:rotate(-14deg)}80%{transform:rotate(0)}}
.peck2{animation:none}
.peck{animation:peck 3.3s ease-in-out infinite}
@keyframes peck{0%,40%,100%{transform:rotate(0)}55%,75%{transform:rotate(22deg)}}
.st{animation:st 1.8s ease-in-out infinite alternate}
@keyframes st{from{transform:rotate(-13deg)}to{transform:rotate(13deg)}}
.tt{animation:tt 3.4s ease-in-out infinite alternate}
@keyframes tt{from{transform:rotate(-8deg)}to{transform:rotate(10deg)}}
@keyframes tgMove{0%,8%{opacity:0;transform:translate(0,0)}12%{opacity:1}52%{transform:translate(620px,0)}58%{transform:translate(626px,5px)}59.6%{transform:translate(760px,-80px)}61.2%{transform:translate(880px,0)}72%{transform:translate(880px,0)}86%{opacity:1}90%,100%{opacity:0;transform:translate(1300px,0)}}
@keyframes tgBody{0%,58.1%{opacity:1}58.2%,61%{opacity:0}61.1%,100%{opacity:1}}
@keyframes tgLeap{0%,58.1%{opacity:0}58.2%,61%{opacity:1}61.1%,100%{opacity:0}}
@keyframes tgWalk{0%,51.9%{opacity:1}52%,71.9%{opacity:0}72%,100%{opacity:1}}
@keyframes tgStill{0%,51.9%{opacity:0}52%,71.9%{opacity:1}72%,100%{opacity:0}}
.th{animation:th ${STORY}s ${STORY_DELAY}s linear infinite}
@keyframes th{0%,61.5%{transform:rotate(0)}63%,70%{transform:rotate(-22deg)}72%,100%{transform:rotate(0)}}
${troopKeys}
.sh{animation:sh 23s ease-in-out infinite alternate}
@keyframes sh{from{opacity:.35}to{opacity:1}}
.f0,.f1,.f2,.f3{animation:fk ease-in-out infinite alternate}
.f0{animation-duration:3.1s}.f1{animation-duration:4.3s}.f2{animation-duration:5.7s}.f3{animation-duration:7.1s}
@keyframes fk{from{opacity:.15}to{opacity:1}}
.sp{animation:sp 40s linear infinite;opacity:0}
@keyframes sp{0%{opacity:0;transform:translate(0,0)}20%{opacity:.9}80%{opacity:.9}100%{opacity:0;transform:translate(-50px,-110px)}}
.m1{animation:m1 95s ease-in-out infinite alternate}
@keyframes m1{to{transform:translateX(-160px)}}
.m2{animation:m2 130s ease-in-out infinite alternate}
@keyframes m2{to{transform:translateX(200px)}}
.m3{animation:m3 70s ease-in-out infinite alternate}
@keyframes m3{from{transform:translateX(60px);opacity:.8}to{transform:translateX(-120px);opacity:1}}
.dr{stroke:#cfe6d0;stroke-opacity:.5;stroke-width:1.4;animation:dr 9s ease-in infinite;opacity:0}
@keyframes dr{0%,84%{opacity:0;transform:translateY(0)}85%{opacity:1}100%{opacity:0;transform:translateY(420px)}}
.vs{animation:vs 13s ease-in-out infinite alternate}
@keyframes vs{from{transform:rotate(-1.4deg)}to{transform:rotate(1.4deg)}}
.fs{animation:fs 9s ease-in-out infinite alternate}
@keyframes fs{from{transform:rotate(-1.6deg)}to{transform:rotate(1.6deg)}}
@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
</style>
<defs>
<linearGradient id="air" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a20"/><stop offset=".22" stop-color="#2b3d31"/><stop offset=".5" stop-color="#18241c"/><stop offset=".8" stop-color="#0d140f"/><stop offset="1" stop-color="#070a07"/></linearGradient>
<radialGradient id="gap" cx="1380" cy="60" r="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9fb98a" stop-opacity=".42"/><stop offset=".5" stop-color="#6f8a62" stop-opacity=".12"/><stop offset="1" stop-color="#6f8a62" stop-opacity="0"/></radialGradient>
<linearGradient id="shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4f0b8" stop-opacity=".2"/><stop offset=".7" stop-color="#d4e6a8" stop-opacity=".06"/><stop offset="1" stop-color="#d4e6a8" stop-opacity="0"/></linearGradient>
<linearGradient id="soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1d13"/><stop offset="1" stop-color="#0a0a06"/></linearGradient>
<radialGradient id="fleck"><stop offset="0" stop-color="#eef7b8" stop-opacity=".55"/><stop offset="1" stop-color="#eef7b8" stop-opacity="0"/></radialGradient>
<radialGradient id="mist"><stop offset="0" stop-color="#a7b9a4" stop-opacity=".22"/><stop offset="1" stop-color="#a7b9a4" stop-opacity="0"/></radialGradient>
<radialGradient id="ff"><stop offset="0" stop-color="#e8ff8a" stop-opacity=".8"/><stop offset="1" stop-color="#c8f060" stop-opacity="0"/></radialGradient>
<linearGradient id="vf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b4d42" stop-opacity="0"/><stop offset="1" stop-color="#3b4d42" stop-opacity=".55"/></linearGradient>
<symbol id="ant" overflow="visible"><g transform="scale(1.7)">${ANT}</g></symbol>
<symbol id="fly" overflow="visible"><circle r="9" fill="url(#ff)"/><circle r="1.4" fill="#f4ffb0"/></symbol>
${SPRAY_DEFS}
<filter id="far" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.6"/></filter>
<filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3.2"/></filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#air)"/>
<rect width="${W}" height="${H}" fill="url(#gap)"/>
<g filter="url(#far)">${far}${farWood.svg()}${farLeaves.svg()}<g fill="#0f1912">${canopy}</g></g>
${mist(330, 120, 18, 0.9, 'm1')}
<g>${shafts}</g>
${mist(560, 160, 16, 0.75, 'm2')}
${hanging}
${vines.svg()}
${mid}
${midWood.svg()}
<path d="M${LIMB[0][0] - 20} ${LIMB[0][1] - 14}L${LIMB[1][0] + 20} ${LIMB[1][1] + 6}" stroke="#211a12" stroke-width="13" stroke-linecap="round"/><path d="M${LIMB[0][0] - 18} ${LIMB[0][1] - 19}L${LIMB[1][0] + 18} ${LIMB[1][1] + 1}" stroke="#5a5034" stroke-opacity=".35" stroke-width="2"/>
${midLeaves.svg()}${SPRAYS.filter((_, k) => k % 2 === 0).join('')}
<path d="M1560 770 Q1600 730 1660 742 Q1630 780 1560 770Z" fill="#2a4a22"/><path d="M1560 770 Q1610 752 1660 742" stroke="#4a6a3a" fill="none"/>
<path d="${ground}" fill="url(#soil)"/>
<path d="${roots}" fill="none" stroke="#1d1a10" stroke-width="7" stroke-linecap="round"/>
${litter.svg()}
<g>${flecks}</g>
<g fill="#e8f2c8">${spores}</g>
${life1.join('\n')}
${troop}
${tiger}
${litterTop.svg()}
${mist(900, 70, 14, 1, 'm3')}
<g>${drips}</g>
${ferns}
<g filter="url(#dof)">${fore}</g>
</svg>`

// The engine allows 131 072 characters, but on 16 November 2026 the desktop
// app froze scenes from about 112 000 up, and any motion repeating faster
// than about once a second froze it too. Keep under both.
const BUDGET = 110000
if (svg.length > BUDGET) throw new Error(`scene too long: ${svg.length} of ${BUDGET}`)
writeFileSync(
  out,
  `// Generated by generators/rainforest/gen-scene.mjs: the rainforest backdrop.\nexport const SCENE = ${JSON.stringify(svg)}\n`,
)
console.log(`scene: ${svg.length} of ${BUDGET} characters`)
