// Generates hooks/scene-library.ts for the scenes mod: the library backdrop as one SVG string.
// Run from the repo root: node generators/library/gen-scene.mjs (or node build.mjs for all).
// An optional path argument writes somewhere else instead.
//
// See philosophy.md. A wall of shelving fills the frame. Books are shelved row
// by row; the lamplight is baked into each book and board as one of a few
// light levels, so every colour and level shares one path and the room costs
// little to draw. Three books glow now and then and spin up a swirl of
// sparkles. Every few minutes an orangutan climbs down, reads a book and
// leaves along the shelf; its arms are posed by inverse kinematics from where
// its hands must be.
import { writeFileSync } from 'node:fs'

const out = process.argv[2] ?? new URL('../../hooks/scene-library.ts', import.meta.url)
const W = 2000
const H = 1000

let seed = 1983
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const rr = (a, b) => a + rand() * (b - a)
const pick = a => a[Math.floor(rand() * a.length)]
const i0 = n => Math.round(n)
const r1 = n => Math.round(n * 10) / 10
const hex = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16))
const toHex = a => `#${a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`

// ---------- Light: baked into everything as one of a few levels ----------
// [x, y, radius, strength]: high on the left (where the orangutan reads),
// on the right, and a fainter glow low in the middle.
const LAMPS = [[400, 430, 420, 1.0], [1640, 500, 380, 0.8], [1000, 720, 480, 0.34]]
const light = (x, y) => {
  let l = 0.1
  for (const [lx, ly, r, a] of LAMPS) l += a * Math.exp(-((x - lx) ** 2 + (y - ly) ** 2) / (r * r))
  // Darker towards the cornice and the side walls.
  l *= 1 - 0.25 * ((x - 1000) / 1000) ** 2 - 0.2 * Math.max(0, (250 - y) / 250)
  return Math.min(1.08, l)
}
const LEVELS = 9
const level = (x, y) => Math.max(1, Math.min(LEVELS, Math.round((light(x, y) / 1.08) * LEVELS)))
// Lamplight is warm: reds hold up, blues fall away.
const lit = (c, q) => {
  const k = (q / LEVELS) * 0.8
  const [r, g, b] = hex(c)
  return toHex([r * k * 1.12, g * k * 0.96, b * k * 0.78])
}
// Paths gathered by fill (or stroke) colour, so each colour is drawn once.
const buckets = new Map()
const add = (key, d) => buckets.set(key, (buckets.get(key) ?? '') + d)
const drawBuckets = (prefix, attr) =>
  [...buckets].filter(([k]) => k.startsWith(prefix)).map(([k, d]) => `<path ${attr(k.slice(prefix.length))} d="${d}"/>`).join('')

// ---------- The shelving ----------
const TOP = 40 // the cornice above
const PITCH = 115
const BOARD = 12
const boardY = r => TOP + PITCH * r // top of board r (1..8); 8 is the plinth
const UPS = []
for (let x = -20; x < W + 30; x += 250) UPS.push(x)
const UPW = 26
const WOOD = '#4a2a1a'

// ---------- The books ----------
const PAL = [
  ['#6e2219', 5], ['#7a3322', 3], ['#1f4a35', 4], ['#2c3f2a', 2], ['#1f2c4a', 3], ['#34445e', 2],
  ['#8a6236', 3], ['#5a3a22', 4], ['#4d2540', 2], ['#9a7a3a', 2], ['#1c1714', 3], ['#b8a47c', 1], ['#22504f', 2],
]
const BAG = PAL.flatMap(([c, n]) => Array(n).fill(c))
const books = [] // standing books, kept for the special ones

function fillRow(xa, xb, base, space) {
  let x = xa + i0(rr(1, 4))
  let set = 0
  let sc
  let sh
  let sw
  for (;;) {
    if (set === 0 && rand() < 0.12) {
      set = 3 + Math.floor(rand() * 5)
      sc = pick(BAG)
      sh = rr(0.78, 0.92) * space
      sw = i0(rr(15, 23))
    }
    // A short pile lying flat.
    if (set === 0 && rand() < 0.04 && x + 95 < xb) {
      const len = i0(rr(58, 80))
      let y = base
      const n = 3 + Math.floor(rand() * 3)
      for (let k = 0; k < n; k++) {
        const t = i0(rr(9, 15))
        const off = i0(rr(-3, 4))
        const c = pick(BAG)
        add(`b${c}|${level(x + len / 2, y)}`, `M${x + off} ${y - t}h${len}v${t}h${-len}z`)
        y -= t + 1
      }
      x += len + 6
      continue
    }
    let c
    let h
    let w
    if (set > 0) {
      c = sc
      h = sh
      w = sw
      set--
    } else {
      c = pick(BAG)
      h = rr(0.64, 0.94) * space
      w = i0(rand() < 0.1 ? rr(28, 38) : rr(12, 25))
    }
    h = i0(h)
    if (x + w > xb - 1) break
    books.push({ x, y: base - h, w, h, c, bands: rand() < 0.55 ? 1 + Math.floor(rand() * 2) : 0, label: rand() < 0.2 })
    x += w + (rand() < 0.3 ? 1 : 0)
    if (rand() < 0.025) x += i0(rr(8, 28))
  }
  // The last book leans on its neighbour where there's room for it.
  const room = xb - x
  if (room > 16) {
    const w = i0(rr(11, 15))
    const h = rr(0.72, 0.88) * space
    const phi = Math.min(0.5, Math.max(0.06, (room - w - 1) / h))
    const blx = x + h * Math.sin(phi)
    const pts = [[blx, base], [blx - h * Math.sin(phi), base - h * Math.cos(phi)]]
    pts.push([pts[1][0] + w * Math.cos(phi), pts[1][1] - w * Math.sin(phi)], [blx + w * Math.cos(phi), base - w * Math.sin(phi)])
    if (pts[3][0] <= xb) {
      const c = pick(BAG)
      add(`b${c}|${level(x + room / 2, base - h / 2)}`, `M${pts.map(([a, b]) => `${r1(a)} ${r1(b)}`).join('L')}z`)
    }
  }
}
for (let r = 0; r < 8; r++) {
  const y0 = r === 0 ? TOP : boardY(r) + BOARD
  const base = boardY(r + 1)
  for (let u = 0; u < UPS.length - 1; u++) fillRow(UPS[u] + UPW, UPS[u + 1], base, Math.min(103, base - y0))
}

// The book the orangutan reads: left bay, fourth shelf, near x 305.
const special = books.filter(b => b.y > 385 && b.y < 500 && b.x > 256 && b.x < 480).sort((a, b) => Math.abs(a.x + a.w / 2 - 305) - Math.abs(b.x + b.w / 2 - 305))[0]
special.c = '#6e2219'
special.bands = 2
// Its twin for visits on the right: the same size, at the mirror-image spot,
// so the one mirrored climb reaches it. Books in the way come off the shelf.
const special2 = { ...special, x: W - special.x - special.w, c: '#1f4a35' }
for (let i = books.length - 1; i >= 0; i--) {
  const b = books[i]
  if (b.y > 385 && b.y < 500 && b.x < special2.x + special2.w + 1 && b.x + b.w > special2.x - 1) books.splice(i, 1)
}
books.push(special2)
const held = new Set([special, special2])
// The three books that glow and spin up sparkles.
const nearest = (x, y) => books.filter(b => !held.has(b) && b.w >= 18).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]
// [x, y, cycle, delay]: each picks the nearest book wide enough for a rune.
const MAGIC = [[1560, 380, 47, -4], [1790, 700, 67, -40], [700, 430, 83, -70]].map(([x, y, cyc, delay]) => ({ b: nearest(x, y), cyc, delay }))

// A book on the right that now and then flares and vanishes, leaving its gap
// empty for a while before it comes back.
const VANISH_T = 70
const vanish = books.filter(b => !held.has(b) && !MAGIC.some(m => m.b === b) && b.w >= 16 && b.y > 730 && b.y < 845).sort((a, b) => Math.hypot(a.x - 1725, a.y - 765) - Math.hypot(b.x - 1725, b.y - 765))[0]
held.add(vanish)
// Low on the left, a gap in the bottom shelf where a pair of small red eyes
// glows in the dark, blinking now and then.
for (let i = books.length - 1; i >= 0; i--) {
  const b = books[i]
  if (b.y > 845 && b.x < 428 && b.x + b.w > 376) books.splice(i, 1)
}
const EYES = [402, 906]

for (const b of books) {
  if (held.has(b)) continue
  const q = level(b.x + b.w / 2, b.y + b.h / 2)
  add(`b${b.c}|${q}`, `M${b.x} ${b.y}h${b.w}v${b.h}h${-b.w}z`)
  if (b.bands) {
    let d = `M${b.x + 2} ${b.y + 8}h${b.w - 4}M${b.x + 2} ${b.y + b.h - 9}h${b.w - 4}`
    if (b.bands === 2) d += `M${b.x + 2} ${b.y + 12}h${b.w - 4}`
    add(`g|${q}`, d)
  }
  if (b.label) add(`l|${q}`, `M${b.x + 3} ${b.y + i0(b.h * 0.25)}h${b.w - 6}v${i0(b.h * 0.14)}h${6 - b.w}z`)
  add('hi', `M${b.x + 3} ${b.y + 2}v${b.h - 4}`)
}

// Chains: a few old volumes chained to the shelf lip, in the light.
// Links alternate: an oval seen face-on, then one seen edge-on as a short
// bar, each turned along the droop. A staple holds each chain to its spine.
let chains = ''
let chainBars = ''
let staples = ''
for (let k = 0, n = 0; k < 400 && n < 7; k++) {
  const b = pick(books)
  if (held.has(b) || light(b.x, b.y) < 0.55 || b.x > 620 && b.x < 1380) continue
  const sx = b.x + b.w / 2
  const sy = b.y + b.h * 0.62
  const base = b.y + b.h
  const c1 = [sx + rr(6, 14), base + 34]
  const p2 = [sx + rr(30, 48), base + 8]
  const at = u => [0, 1].map(j => (1 - u) ** 2 * [sx, sy][j] + 2 * (1 - u) * u * c1[j] + u * u * p2[j])
  let walked = 0
  let last = at(0)
  let link = 0
  for (let s = 1; s <= 80; s++) {
    const p = at(s / 80)
    walked += Math.hypot(p[0] - last[0], p[1] - last[1])
    last = p
    if (walked < 6.2) continue
    walked = 0
    const q = at(Math.max(0, s / 80 - 0.03))
    const a = Math.atan2(p[1] - q[1], p[0] - q[0])
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    if (link++ % 2 === 0) chains += `M${r1(p[0] - ux * 4.5)} ${r1(p[1] - uy * 4.5)}a4.5 2.6 ${i0((a * 180) / Math.PI)} 1 0 ${r1(ux * 9)} ${r1(uy * 9)}a4.5 2.6 ${i0((a * 180) / Math.PI)} 1 0 ${r1(-ux * 9)} ${r1(-uy * 9)}`
    else chainBars += `M${r1(p[0] - ux * 4)} ${r1(p[1] - uy * 4)}l${r1(ux * 8)} ${r1(uy * 8)}`
  }
  staples += `M${i0(sx - 3)} ${i0(sy - 4)}h6v7h-6z`
  n++
}

// Boards, uprights, cornice and plinth, each section at its own light level.
for (let r = 1; r < 8; r++) {
  for (let u = 0; u < UPS.length - 1; u++) {
    const x = UPS[u] + UPW
    const w = UPS[u + 1] - x
    const q = level(x + w / 2, boardY(r))
    add(`w|${q}`, `M${x} ${boardY(r)}h${w}v${BOARD}h${-w}z`)
    add(`e|${q}`, `M${x} ${boardY(r) + 1}h${w}`)
  }
}
for (const x of UPS) {
  for (let r = 0; r < 8; r++) {
    const y = boardY(r)
    const q = level(x + UPW / 2, y + PITCH / 2)
    add(`w|${q}`, `M${x} ${y}h${UPW}v${PITCH}h${-UPW}z`)
    add(`e|${q}`, `M${x + 2} ${y}v${PITCH}`)
  }
}
let cornice = ''
for (let x = 0; x < W; x += 250) {
  const q = level(x + 125, 20)
  add(`w|${q}`, `M${x} 0h250v${TOP}h-250z`)
  add(`e|${q}`, `M${x} 9h250M${x} 27h250M${x} ${TOP - 2}h250`)
  const p = level(x + 125, 980)
  add(`w|${p}`, `M${x} 960h250v40h-250z`)
  add(`e|${p}`, `M${x} 962h250M${x} 974h250`)
}
let shadows = ''
for (let r = 0; r < 8; r++) shadows += `<rect y="${r === 0 ? TOP : boardY(r) + BOARD}" width="${W}" height="30"/>`

// ---------- Magic: books that glow, and a rune that rises on the spine ----------
// Now and then a book glows, throwing warm light over the books round it. As
// it glows hottest a dark rune stands out on its spine in relief: lit on its
// upper left edge, shadowed on its lower right. Each book has its own rune,
// drawn in a 10 x 24 box.
const RUNES = [
  'M2 0V24M2 5L9 0M2 12L9 7', // fehu
  'M5 0V24M5 10L0 2M5 10L10 2', // algiz
  'M5 0L10 6L0 18M5 0L0 6L10 18', // othala
]
let magic = ''
let magicCss = ''
MAGIC.forEach(({ b, cyc, delay }, k) => {
  const cx = b.x + b.w / 2
  const cy = b.y + b.h / 2
  // The draws the old sparkle swirl made, kept so the dust stays put.
  for (let m = 0; m < 34 * 4; m++) rand()
  const sc = Math.min(1.5, (b.w - 5) / 10)
  const at = (dx, dy) => `translate(${r1(cx - 5 * sc + dx)} ${r1(cy - 12 * sc + dy)}) scale(${r1(sc)})`
  const rune = RUNES[k]
  magic += `<ellipse cx="${cx}" cy="${i0(cy)}" rx="221" ry="169" fill="url(#ls)" class="gl${k}"/><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="url(#bg)" class="gl${k}"/>`
    + `<g class="rn${k}" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${r1(2.4 / sc)}"><path d="${rune}" stroke="#fff3cc" stroke-opacity=".8" transform="${at(-0.9, -0.9)}"/><path d="${rune}" stroke="#1e0d03" stroke-opacity=".75" transform="${at(1.2, 1.2)}"/><path d="${rune}" stroke="#3d1f0b" transform="${at(0, 0)}"/></g>`
  magicCss += `.gl${k}{animation:gl${k} ${cyc}s ${delay}s ease-in-out infinite}@keyframes gl${k}{0%,4%{opacity:0}12%{opacity:.75}18%,28%{opacity:1}36%{opacity:.5}44%,100%{opacity:0}}`
    + `.rn${k}{opacity:0;animation:rn${k} ${cyc}s ${delay}s ease-in-out infinite}@keyframes rn${k}{0%,12%{opacity:0}18%,28%{opacity:1}35%,100%{opacity:0}}
`
})

// Dust drifting up through the lamplight, each mote now and then catching
// the light: a slow glimmer of two or three seconds on its own cycle.
let dust = ''
for (let k = 0, n = 0; k < 300 && n < 37; k++) {
  const x = rr(80, 1920)
  const y = rr(120, 900)
  if (light(x, y) < 0.6) continue
  dust += `<circle cx="${i0(x)}" cy="${i0(y)}" r="${r1(rr(0.9, 1.8))}" class="du${n % 3}" style="animation-delay:${-i0(rr(0, 40))}s"/>`
  n++
}

// ---------- The orangutan, seen from behind ----------
// Its own seed, so the shelves above stay as they are.
const shelfSeed = seed
seed = 4747
const closed = P => {
  const m = (a, b) => [i0((a[0] + b[0]) / 2), i0((a[1] + b[1]) / 2)]
  let s = m(P.at(-1), P[0])
  let d = `M${s[0]} ${s[1]}`
  for (let i = 0; i < P.length; i++) {
    const n = m(P[i], P[(i + 1) % P.length])
    d += `q${i0(P[i][0]) - s[0]} ${i0(P[i][1]) - s[1]} ${n[0] - s[0]} ${n[1] - s[1]}`
    s = n
  }
  return `${d}z`
}
const inside = (P, x, y) => {
  let c = false
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    if ((P[i][1] > y) !== (P[j][1] > y) && x < ((P[j][0] - P[i][0]) * (y - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c
  }
  return c
}
// A lock of hair from (x, y), pointing at angle a (0 is straight down,
// positive towards +x), curling a little at the tip. Every lock winds the
// same way, so locks that overlap in one path never cancel into holes.
const lock = (x, y, a, len, wid) => {
  const dx = Math.sin(a)
  const dy = Math.cos(a)
  const px = dy * (wid / 2)
  const py = -dx * (wid / 2)
  const curl = rr(-0.2, 0.2) * len
  const tx = x + dx * len + dy * curl
  const ty = y + dy * len - dx * curl
  return `M${r1(x - px)} ${r1(y - py)}Q${r1(x + dx * len * 0.5)} ${r1(y + dy * len * 0.5)} ${r1(tx)} ${r1(ty)}Q${r1(x + dx * len * 0.45 + px * 0.3)} ${r1(y + dy * len * 0.45 + py * 0.3)} ${r1(x + px)} ${r1(y + py)}z`
}
// One long strand flowing from (x, y) at angle a, with a slight S.
const strand = (x, y, a, l) => `M${i0(x)} ${i0(y)}q${r1(Math.sin(a) * l * 0.5 + rr(-4, 4))} ${r1(Math.cos(a) * l * 0.5)} ${r1(Math.sin(a) * l)} ${r1(Math.cos(a) * l)}`
const SKIN = '#2a1d18'
const SHEEN = '#b5592c'
const SHADE = '#3a1307'
// Light, dark and mid strands in one go: [colour, opacity, width, path].
const hairPaths = sets => sets.map(([c, o, w, d]) => `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`).join('')

// The body: one mound of long hair from crown to hem, shoulder centre at
// (0, 0). Seen from behind, the head is only the top of it.
const BODY_P = [[0, -80], [20, -76], [33, -62], [40, -44], [48, -28], [62, -14], [76, 12], [86, 56], [90, 108], [87, 158], [74, 198], [46, 222], [0, 232], [-46, 222], [-74, 198], [-87, 158], [-90, 108], [-86, 56], [-76, 12], [-62, -14], [-48, -28], [-40, -44], [-33, -62], [-20, -76]]
// The hair parts at the crown and flows down, fanning a little outwards.
const flow = (x, y) => (x / 150) * (y < 40 ? 1.3 : 0.8)
const bodyHair = n => {
  let d = ''
  for (let k = 0, m = 0; k < n * 10 && m < n; k++) {
    const x = rr(-88, 88)
    const y = rr(-70, 170)
    if (!inside(BODY_P, x, y)) continue
    d += strand(x, y, flow(x, y) + rr(-0.08, 0.08), Math.min(rr(60, 150), 236 - y))
    m++
  }
  return d
}
// The ragged hem, and a soft fringe down the sides.
let hem = ''
for (let k = 0; k < 48; k++) {
  const th = -1.3 + (2.6 * k) / 47 + rr(-0.02, 0.02)
  const x = Math.sin(th) * 84
  const y = 108 + Math.cos(th) * 118
  hem += lock(x, y - 14, th * 0.22, rr(18, 44) * (0.55 + 0.45 * Math.cos(th)), rr(12, 18))
}
for (const side of [-1, 1]) for (let k = 0; k < 7; k++) {
  const y = -14 + k * 22
  hem += lock(side * (62 + Math.min(k, 4) * 6), y, side * rr(0.15, 0.35), rr(16, 26), 12)
}
// The strands are clipped to the outline and hem, so none sticks out.
const BODY = `<path id="bp" d="${closed(BODY_P)}" fill="url(#fur)"/><path id="hm" d="${hem}" fill="url(#fur)"/><g clip-path="url(#bc)">`
  + hairPaths([['#8a3a1a', 0.5, 3, bodyHair(40)], [SHEEN, 0.22, 1.8, bodyHair(90)], [SHADE, 0.3, 2, bodyHair(80)]]) + '</g>'
// The top of the mound again, on its own, so a tilt of the head still shows.
// The same gradient in the body's space, so it joins without a seam.
const HEAD_P = [[0, -82], [20, -78], [33, -64], [38, -46], [32, -30], [16, -20], [0, -18], [-16, -20], [-32, -30], [-38, -46], [-33, -64], [-20, -78]]
let crown = ''
for (let k = 0; k < 26; k++) {
  const a = rr(-1.25, 1.25)
  crown += strand(rr(-5, 5), -78 + rr(0, 5), a, rr(28, 58))
}
const HEAD = `<path d="${closed(HEAD_P)}" fill="url(#fur)"/><g clip-path="url(#bc)">${hairPaths([[SHEEN, 0.24, 1.6, crown], [SHADE, 0.26, 1.8, crown.replace(/M(-?\d+) /g, (m, x) => `M${+x + 3} `)]])}</g>`

// Arms hang from the shoulders along +y. Their hair hangs back towards the
// shoulder, as it does from a raised arm, in a sheet of the same hair.
const L1 = 128
const L2 = 146 // elbow to wrist
const armHair = (len, half, n) => {
  let locks = ''
  let lite = ''
  let dark = ''
  for (let k = 0; k < n; k++) {
    const side = k % 2 ? 1 : -1
    const y = rr(14, len - 4)
    const w = half - (y / len) * half * 0.3
    locks += lock(side * (w - 3), y, Math.PI - side * rr(0.15, 0.45), rr(16, 36), rr(10, 14))
  }
  for (let k = 0; k < 14; k++) {
    const y = rr(len * 0.4, len)
    lite += strand(rr(-half + 4, half - 4), y, Math.PI + rr(-0.1, 0.1), rr(40, y))
    dark += strand(rr(-half + 4, half - 4), y, Math.PI + rr(-0.1, 0.1), rr(40, y))
  }
  return `<path d="${locks}" fill="url(#fa)"/>${hairPaths([[SHEEN, 0.24, 1.6, lite], [SHADE, 0.3, 1.8, dark]])}`
}
// The hand at the end of the forearm: palm against the shelf's edge,
// fingers hooked over its top.
const HAND = `<ellipse cy="${L2 - 4}" rx="11" ry="15" fill="${SKIN}"/><path d="M-7 ${L2 + 6}q0 9-4 13M-2 ${L2 + 8}q0 9-3 13M3 ${L2 + 8}q0 9-2 13M8 ${L2 + 6}q0 8-1 12" fill="none" stroke="${SKIN}" stroke-width="4.5" stroke-linecap="round"/>`
const GRIP_UP = -5 // the palm sits this far below the top of what it grips
// A short bent leg from the hip, as shaggy as the rest: locks of the same
// hair hang from it, and strands run down it.
const LEG_C = [[0, 0], [-22, 22], [-34, 48], [-28, 74], [-16, 96]]
let legLocks = ''
let legLite = ''
let legDark = ''
for (let k = 0; k < 22; k++) {
  const u = rr(0.05, 0.9) * (LEG_C.length - 1)
  const i = Math.floor(u)
  const f = u - i
  const x = LEG_C[i][0] + (LEG_C[i + 1][0] - LEG_C[i][0]) * f
  const y = LEG_C[i][1] + (LEG_C[i + 1][1] - LEG_C[i][1]) * f
  legLocks += lock(x + (k % 2 ? 9 : -9), y, rr(-0.3, 0.15), rr(18, 34), rr(10, 14))
  if (k < 12) {
    legLite += strand(x + rr(-8, 8), y, rr(-0.15, 0.1), rr(24, 50))
    legDark += strand(x + rr(-8, 8), y, rr(-0.15, 0.1), rr(24, 50))
  }
}
// The arms' and legs' drawings don't move inside their joints, so each is
// drawn once and used twice.
const APE_DEFS = `<symbol id="au" overflow="visible"><circle r="28" fill="url(#fa)"/><path d="M-27 -6C-31 40-24 100-19 ${L1}L19 ${L1}C24 100 31 40 27 -6Z" fill="url(#fa)"/>${armHair(L1, 26, 26)}</symbol>`
  + `<symbol id="af" overflow="visible"><circle r="22" fill="url(#fa)"/><path d="M-22 -4C-22 50-16 100-13 ${L2 - 8}L13 ${L2 - 8}C16 100 22 50 22 -4Z" fill="url(#fa)"/>${armHair(L2 - 8, 20, 28)}${HAND}</symbol>`
  + `<symbol id="lg" overflow="visible"><path d="M-8 -4C-34 10-50 38-44 62C-40 80-30 94-16 98L-6 92C-18 80-24 64-20 44C-16 26 0 14 12 6Z" fill="url(#fa)"/><path d="${legLocks}" fill="url(#fa)"/>${hairPaths([[SHEEN, 0.24, 1.6, legLite], [SHADE, 0.3, 1.8, legDark]])}<path d="M-22 92q-8 8-6 16q8 2 18-4l-2-10z" fill="${SKIN}"/></symbol>`
const arm = (side, k) => `<g transform="translate(${side * 46} 6)"><g class="${k}u"><use href="#au"/><g transform="translate(0 ${L1})"><g class="${k}f"><use href="#af"/></g></g></g></g>`
const leg = (side, k) => `<g transform="translate(${side * 34} 172)${side > 0 ? ' scale(-1 1)' : ''}"><g class="${k}"><use href="#lg"/></g></g>`
const APE = `${leg(-1, 'll')}${leg(1, 'rl')}${arm(-1, 'l')}${arm(1, 'r')}${BODY}<g transform="translate(0 -30)"><g class="hd"><g transform="translate(0 30)">${HEAD}</g></g></g>`

// The books it reads: on the shelf a spine; held open in front of the face,
// from behind we see the back of its covers either side of the head. The
// right-hand twin is drawn mirrored, as the climb to it is.
const READ_HAND = [343, 500] // the left hand, holding the open book's edge
const READ_MID = [420, 466] // the open book's centre: in front of the face
const book = (SB, k, flip) => {
  const q = level(SB.x + SB.w / 2, SB.y + SB.h / 2)
  const leather = lit(SB.c, q)
  const gilt = lit('#c99a45', q)
  const ob = [(READ_MID[0] - READ_HAND[0]) * flip, READ_MID[1] - READ_HAND[1] - GRIP_UP]
  const BW = 74
  const BH = SB.h
  return `<g transform="translate(${SB.x + SB.w / 2} ${SB.y})"><g class="bk${k}"><g class="sp${k}"><path d="M${-SB.w / 2} 0h${SB.w}v${SB.h}h${-SB.w}z" fill="${leather}"/><path d="M${2 - SB.w / 2} 8h${SB.w - 4}M${2 - SB.w / 2} 12h${SB.w - 4}M${2 - SB.w / 2} ${SB.h - 9}h${SB.w - 4}" stroke="${gilt}" stroke-width="1.5"/></g>`
    + `<g class="op${k}" opacity="0" transform="translate(${ob[0]} ${ob[1]})"><path d="M0 ${-BH / 2}L${-BW} ${-BH / 2 + 6}V${BH / 2 - 2}L0 ${BH / 2}L${BW} ${BH / 2 - 2}V${-BH / 2 + 6}Z" fill="${leather}"/><path d="M0 ${-BH / 2}V${BH / 2}" stroke="#000" stroke-opacity=".5" stroke-width="5"/><path d="M${-BW + 7} ${-BH / 2 + 12}V${BH / 2 - 8}M${BW - 7} ${-BH / 2 + 12}V${BH / 2 - 8}" stroke="${gilt}" stroke-width="1.5" stroke-opacity=".7"/><path d="M${-BW} ${-BH / 2 + 6}l-2 3V${BH / 2 + 1}M${BW} ${-BH / 2 + 6}l2 3V${BH / 2 + 1}" stroke="#d8cdb4" stroke-opacity=".5" stroke-width="2" fill="none"/></g></g></g>`
}

// ---------- The visit, posed by inverse kinematics ----------
// One visit's motion, in the left-hand bay. Every second visit the whole
// orangutan is drawn mirrored, so it comes down on the right of the text.
const SHOULDER = { l: [-46, 6], r: [46, 6] }
const deg = r => (r * 180) / Math.PI
// The angle that turns the arm (which hangs along +y) to point along (vx, vy).
const toward = (vx, vy) => deg(Math.atan2(-vx, vy))
function ik(sx, sy, tx, ty, side) {
  let dx = tx - sx
  let dy = ty - sy
  let D = Math.hypot(dx, dy)
  const lo = Math.abs(L1 - L2) + 12
  const hi = L1 + L2 - 1
  const k = D > hi ? hi / D : D < lo ? lo / D : 1
  dx *= k
  dy *= k
  D *= k
  const phi = Math.atan2(dy, dx)
  const a = Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D))
  // Elbows bend outwards, away from the body.
  const opts = [phi + a, phi - a].map(t => [t, sx + L1 * Math.cos(t), sy + L1 * Math.sin(t)])
  const [t, ex, ey] = (opts[0][1] - opts[1][1]) * side > 0 ? opts[0] : opts[1]
  const up = toward(Math.cos(t), Math.sin(t))
  let fore = toward(sx + dx - ex, sy + dy - ey) - up
  while (fore > 180) fore -= 360
  while (fore < -180) fore += 360
  return [up, fore]
}

const VISIT = 80 // one visit, every 80 seconds, alternating sides
const S = []
let cur = { o: 0, B: [422, -400], rot: 0, l: [376, -642], r: [474, -527], hd: 0, ll: 0, rl: 0, bk: [0, 0, 0], sp: 1, op: 0 }
const at = (t, ch = {}) => {
  cur = { ...cur, ...ch, t }
  S.push(cur)
}
const gripOn = (x, y) => [x, y - GRIP_UP]
// Down from above the frame: the high hand lets go while the body drops a
// shelf onto the low one, then grips two shelves lower. The body swings
// under whichever hand holds it, tilting towards it, legs trailing.
const STEP = 1.7
const climb = k => {
  const high = 270 - PITCH * (8 - k)
  const hs = (8 - k) % 2 === 0 ? 'r' : 'l'
  const ls = hs === 'r' ? 'l' : 'r'
  const sw = hs === 'r' ? 1 : -1
  return {
    B: [422 + sw * 22, 520 - PITCH * (8 - k)],
    rot: sw * 5,
    [hs]: gripOn(hs === 'l' ? 372 + (k % 3) * 3 : 476 - (k % 2) * 4, high),
    [ls]: gripOn(ls === 'l' ? 374 : 472, high + PITCH),
    ll: -sw * 12,
    rl: -sw * 8,
    hd: sw * 3,
  }
}
at(0, climb(0))
at(0.3, { o: 1 })
for (let k = 0; k < 8; k++) {
  const t = 0.4 + STEP * k
  const now = climb(k)
  const next = climb(k + 1)
  at(t, now)
  const free = (8 - k) % 2 === 0 ? 'r' : 'l'
  const fx = (now[free][0] + next[free][0]) / 2 + (free === 'l' ? -36 : 36)
  // Mid-swing: through the middle, dropping onto the other hand.
  at(t + STEP * 0.5, { B: [422 - now.rot * 1.6, now.B[1] + PITCH * 0.7], rot: -now.rot * 0.3, [free]: [fx, (now[free][1] + next[free][1]) / 2], ll: now.ll * 0.3, rl: now.rl * 0.3 })
}
const A = 0.4 + STEP * 8
at(A, climb(8))
at(A + 0.6, { B: [430, 522], rot: 2, ll: 5, rl: -3 })
at(A + 1.3, { hd: 0, ll: 2, rl: -2, B: [420, 520], rot: 0 })
// It reaches across, hooks the book out by its top and opens it to read.
const g = gripOn(special.x + special.w / 2, special.y)
const off = (h, r) => ({ l: h, bk: [h[0] - g[0], h[1] - g[1], r] })
at(A + 2.9, { l: g, hd: -4 })
at(A + 3.5)
at(A + 5.0, off([g[0] - 4, g[1] - 36], -8))
at(A + 5.8, { sp: 1, op: 0 })
at(A + 6.5, { sp: 0, op: 1 })
at(A + 7.2, { ...off(READ_HAND, 0), hd: 2 })
at(A + 9.6, { hd: -6, bk: [READ_HAND[0] - g[0], READ_HAND[1] - g[1], -2] })
at(A + 12.1, { hd: 4, bk: [READ_HAND[0] - g[0], READ_HAND[1] - g[1], 2] })
at(A + 14.7, { hd: -3, ll: -6 })
at(A + 16.8, { hd: 0, bk: [READ_HAND[0] - g[0], READ_HAND[1] - g[1], 0] })
at(A + 17.6, { sp: 0, op: 1 })
at(A + 18.3, { sp: 1, op: 0 })
at(A + 18.8, off([g[0] - 4, g[1] - 36], -8))
at(A + 20.2, off(g, 0))
at(A + 21.2, { l: gripOn(370, 385), ll: 4 })
at(A + 22.6, { hd: -8 })
// Then off to the left along the shelf, hand over hand, swaying.
const RAIL = 270 - GRIP_UP
const MOVE = 1.6
let t = A + 22.6 + MOVE
let L = [330, RAIL]
let R = [476, RAIL]
at(t - MOVE * 0.5, { l: [348, RAIL + 50], B: [408, 526], rot: -2 })
at(t, { l: L, B: [(L[0] + R[0]) / 2, 520], rot: 0 })
for (let k = 0; k < 10; k++) {
  const lead = k % 2 === 0
  const from = lead ? L : R
  const to = lead ? [L[0] - 150, RAIL] : [L[0] + 104, RAIL]
  const mid = [(from[0] + to[0]) / 2, RAIL - 26]
  if (lead) L = to
  else R = to
  const swing = lead ? 10 : -10
  const other = lead ? R[0] : L[0]
  at(t + MOVE * 0.5, { [lead ? 'l' : 'r']: mid, B: [(other + (from[0] + to[0]) / 2) / 2, 528], rot: lead ? -4 : 3, ll: swing, rl: -swing, hd: -8 + swing / 4 })
  t += MOVE
  at(t, { l: L, r: R, B: [(L[0] + R[0]) / 2, 520], rot: 0 })
}
at(t + 0.2, { o: 0 })
at(VISIT - 0.2)
at(VISIT, { ...climb(0), o: 0, hd: 0, bk: [0, 0, 0], sp: 1, op: 0 })

// Every joint's angle at every moment, unwrapped so none spins the long way.
// The arms are posed in the world, then turned back into the body's frame.
const prev = {}
const unwrap = (k, a) => {
  if (k in prev) {
    while (a - prev[k] > 180) a -= 360
    while (a - prev[k] < -180) a += 360
  }
  prev[k] = a
  return Math.round(a * 10) / 10
}
const pctOf = (t, cyc) => `${Math.round((t / cyc) * 10000) / 100}%`
const tracks = { ou: [], hd: [], lu: [], lf: [], ru: [], rf: [], ll: [], rl: [] }
const books2 = { bk0: [], sp0: [], op0: [], bk1: [], sp1: [], op1: [] }
for (const s of S) {
  const pct = pctOf(s.t, VISIT)
  const c = Math.cos((s.rot * Math.PI) / 180)
  const n = Math.sin((s.rot * Math.PI) / 180)
  const sh = ([x, y]) => [s.B[0] + x * c - y * n, s.B[1] + x * n + y * c]
  const rot = a => `transform:rotate(${a}deg)`
  tracks.ou.push([pct, `transform:translate(${i0(s.B[0])}px,${i0(s.B[1])}px) rotate(${s.rot}deg);opacity:${s.o}`])
  for (const side of ['l', 'r']) {
    const [x, y] = sh(SHOULDER[side])
    const [up, fo] = ik(x, y, s[side][0], s[side][1], side === 'l' ? -1 : 1)
    tracks[`${side}u`].push([pct, rot(unwrap(`${side}u`, up - s.rot))])
    tracks[`${side}f`].push([pct, rot(unwrap(`${side}f`, fo))])
  }
  tracks.hd.push([pct, rot(s.hd)])
  tracks.ll.push([pct, rot(s.ll)])
  tracks.rl.push([pct, rot(s.rl)])
  // The books run on the two-visit cycle: the left one on the first visit,
  // its mirrored twin on the second.
  for (const k of [0, 1]) {
    const tt = s.t + k * VISIT
    const mine = s.t < VISIT
    const p = pctOf(tt, VISIT * 2)
    const [dx, dy, r] = mine ? s.bk : [0, 0, 0]
    books2[`bk${k}`].push([p, `transform:translate(${i0(k ? -dx : dx)}px,${i0(dy)}px) rotate(${k ? -r : r}deg)`])
    books2[`sp${k}`].push([p, `opacity:${mine ? s.sp : 1}`])
    books2[`op${k}`].push([p, `opacity:${mine ? s.op : 0}`])
  }
}
// The other half of each book's cycle: it stays on the shelf.
for (const k of [0, 1]) {
  const at0 = pctOf(k ? 0 : VISIT, VISIT * 2)
  const end = pctOf(k ? VISIT - 0.01 : VISIT * 2, VISIT * 2)
  for (const [key, css] of [[`bk${k}`, 'transform:translate(0px,0px) rotate(0deg)'], [`sp${k}`, 'opacity:1'], [`op${k}`, 'opacity:0']]) {
    books2[key].push([at0, css], [end, css])
    books2[key].sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
  }
}
// Leave out moments where nothing changes, except the ends of a hold.
const squeeze = steps => steps.filter((s, i) => i === 0 || i === steps.length - 1 || s[1] !== steps[i - 1][1] || s[1] !== steps[i + 1][1])
const FIRST = 12 // seconds after the scene starts that the first visit begins
let apeCss = ''
for (const [k, steps] of Object.entries(tracks)) {
  apeCss += `@keyframes ${k}{${squeeze(steps).map(([p, css]) => `${p}{${css}}`).join('')}}.${k}{animation:${k} ${VISIT}s ${FIRST - VISIT}s ease-in-out infinite}\n`
}
for (const [k, steps] of Object.entries(books2)) {
  apeCss += `@keyframes ${k}{${squeeze(steps).map(([p, css]) => `${p}{${css}}`).join('')}}.${k}{animation:${k} ${VISIT * 2}s ${FIRST - VISIT * 2}s ease-in-out infinite}\n`
}
// Every second visit, the mirror image: switched while it's out of sight
// above the frame, at the start of a visit.
apeCss += `@keyframes mir{0%,49.9%{transform:translate(0px,0px) scale(1,1)}50%,99.9%{transform:translate(${W}px,0px) scale(-1,1)}}.mir{animation:mir ${VISIT * 2}s ${FIRST - VISIT * 2}s linear infinite}\n`
const APE_SVG = `${book(special, 0, 1)}${book(special2, 1, -1)}<g class="mir"><g class="ou">${APE}</g></g>`
seed = shelfSeed

// ---------- Assemble ----------
const levelsOf = p => [...buckets.keys()].filter(k => k.startsWith(p))
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
${magicCss}.du0{animation:du0 29s ease-in-out infinite alternate,gm 19s ease-in-out infinite}.du1{animation:du1 37s ease-in-out infinite alternate,gm 23s ease-in-out infinite}.du2{animation:du2 43s ease-in-out infinite alternate,gm 31s ease-in-out infinite}
@keyframes vb{0%,57%{opacity:1}61%,86%{opacity:0}90%,100%{opacity:1}}.vb{animation:vb ${VANISH_T}s -10s ease-in-out infinite}
@keyframes vf{0%,54%{opacity:0}58%{opacity:.7}62%,85%{opacity:0}89%{opacity:.4}93%,100%{opacity:0}}.vf{opacity:0;animation:vf ${VANISH_T}s -10s ease-in-out infinite}
@keyframes eb{0%,92%{transform:scaleY(1)}94.5%{transform:scaleY(.1)}97%,100%{transform:scaleY(1)}}.eb{animation:eb 29s -20s ease-in-out infinite}
@keyframes eg{from{opacity:.5}to{opacity:1}}.eg{animation:eg 11s ease-in-out infinite alternate}
@keyframes gm{0%,86%{opacity:.4}93%{opacity:1}100%{opacity:.4}}
@keyframes du0{to{transform:translate(14px,-70px)}}@keyframes du1{to{transform:translate(-18px,-60px)}}@keyframes du2{to{transform:translate(10px,-90px)}}
.ga{animation:ga 13s ease-in-out infinite alternate}.gb{animation:ga 17s ease-in-out -6s infinite alternate}.gc{animation:ga 23s ease-in-out -9s infinite alternate}
@keyframes ga{from{opacity:.55}to{opacity:1}}
${apeCss}@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
</style>
<defs>
<linearGradient id="us" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<radialGradient id="lamp"><stop offset="0" stop-color="#ffb466" stop-opacity=".2"/><stop offset="1" stop-color="#ffb466" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" r=".75"><stop offset=".45" stop-color="#050302" stop-opacity="0"/><stop offset="1" stop-color="#050302" stop-opacity=".85"/></radialGradient>
<radialGradient id="mote"><stop offset="0" stop-color="#fff8dc"/><stop offset=".4" stop-color="#f2cf72" stop-opacity=".85"/><stop offset="1" stop-color="#a97cff" stop-opacity="0"/></radialGradient>
<radialGradient id="ls"><stop offset="0" stop-color="#ffd98a" stop-opacity=".55"/><stop offset=".5" stop-color="#e8b86a" stop-opacity=".21"/><stop offset="1" stop-color="#e8b86a" stop-opacity="0"/></radialGradient>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0c0"/><stop offset="1" stop-color="#e0b0ff" stop-opacity=".45"/></linearGradient>
${APE_DEFS}
<radialGradient id="eg"><stop offset="0" stop-color="#ff3a20" stop-opacity=".35"/><stop offset="1" stop-color="#ff3a20" stop-opacity="0"/></radialGradient>
<clipPath id="bc"><use href="#bp"/><use href="#hm"/></clipPath>
<linearGradient id="fur" x1="-70" y1="-80" x2="80" y2="240" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a1502a"/><stop offset=".45" stop-color="#7a3318"/><stop offset="1" stop-color="#47190a"/></linearGradient>
<linearGradient id="fa" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#97472a"/><stop offset=".6" stop-color="#712f16"/><stop offset="1" stop-color="#46190a"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#0b0604"/>
${levelsOf('b').map(k => `<path fill="${lit(k.slice(1).split('|')[0], +k.split('|')[1])}" d="${buckets.get(k)}"/>`).join('')}
${levelsOf('l|').map(k => `<path fill="#000" fill-opacity=".45" d="${buckets.get(k)}"/>`).join('')}
<g class="vb"><path d="M${vanish.x} ${vanish.y}h${vanish.w}v${vanish.h}h${-vanish.w}z" fill="${lit(vanish.c, level(vanish.x, vanish.y + vanish.h / 2))}"/><path d="M${vanish.x + 2} ${vanish.y + 8}h${vanish.w - 4}M${vanish.x + 2} ${vanish.y + vanish.h - 9}h${vanish.w - 4}" stroke="${lit('#c99a45', level(vanish.x, vanish.y + vanish.h / 2))}" stroke-width="1.5"/></g><rect x="${vanish.x - 3}" y="${vanish.y - 3}" width="${vanish.w + 6}" height="${vanish.h + 6}" fill="url(#bg)" class="vf"/>
<g transform="translate(${EYES[0]} ${EYES[1]})"><ellipse rx="22" ry="12" fill="url(#eg)" class="eg"/><g class="eb"><circle cx="-6" r="2.6" fill="#ff3a20"/><circle cx="6" r="2.6" fill="#ff3a20"/><circle cx="-6.6" cy="-.6" r=".8" fill="#ffd0b0"/><circle cx="5.4" cy="-.6" r=".8" fill="#ffd0b0"/></g></g>
${levelsOf('g|').map(k => `<path fill="none" stroke="${lit('#c99a45', +k.slice(2))}" stroke-width="1.5" d="${buckets.get(k)}"/>`).join('')}
<path d="${buckets.get('hi')}" fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="3"/>
<g fill="url(#us)">${shadows}</g>
${levelsOf('w|').map(k => `<path fill="${lit(WOOD, +k.slice(2))}" d="${buckets.get(k)}"/>`).join('')}
${levelsOf('e|').map(k => `<path fill="none" stroke="${lit('#80502f', +k.slice(2))}" stroke-width="2" d="${buckets.get(k)}"/>`).join('')}
<path d="${chainBars}" fill="none" stroke="#4d483f" stroke-width="2.8" stroke-linecap="round"/><path d="${chains}" fill="none" stroke="#8a8273" stroke-width="1.7"/><path d="${staples}" fill="#6a6457" stroke="#2a2620" stroke-width="1"/>
<ellipse cx="400" cy="430" rx="520" ry="420" fill="url(#lamp)" class="ga"/><ellipse cx="1640" cy="500" rx="460" ry="380" fill="url(#lamp)" class="gb"/><ellipse cx="1000" cy="720" rx="600" ry="300" fill="url(#lamp)" class="gc"/>
${magic}
<g fill="url(#mote)">${dust}</g>
${APE_SVG}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`

// The desktop app freezes scenes much over 110 000 characters (November 2026).
const BUDGET = 110000
if (svg.length > BUDGET) throw new Error(`scene too long: ${svg.length} of ${BUDGET}`)
writeFileSync(
  out,
  `// Generated by generators/library/gen-scene.mjs: the library backdrop.\nexport const SCENE = ${JSON.stringify(svg)}\n`,
)
console.log(`scene: ${svg.length} of ${BUDGET} characters`)
