// Generates hooks/scene-blizzard.ts for the scenes mod: the blizzard backdrop as one SVG string.
// Run from the repo root: node generators/blizzard/gen-scene.mjs (or node build.mjs for all).
// An optional path argument writes somewhere else instead.
//
// See philosophy.md. The wind is written first: the curl of a noise stream
// function plus a prevailing wind. Streamlines are traced through it, and
// the snow is a dash rhythm sliding along them, so every flake rides the
// eddies. Intensity layers breathe on unrelated prime cycles: light snow,
// heavier fall, gust streaks, spindrift and a whiteout veil.
import { writeFileSync } from 'node:fs'

const out = process.argv[2] ?? new URL('../../hooks/scene-blizzard.ts', import.meta.url)
const W = 2000
const H = 1000

let seed = 1912
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const rr = (a, b) => a + rand() * (b - a)
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
const hex = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16))
const toHex = a => `#${a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`
const mix = (a, b, t) => toHex(hex(a).map((v, k) => v + (hex(b)[k] - v) * t))
const FOG = '#56616d'

// ---------- The wind: curl of a noise stream function, plus a prevailing wind ----------
function streamlines(n, { scale, curl, wind, step, steps, off }) {
  const lines = []
  const psi = (x, y) => fbm(x / scale + off, y / scale + off * 1.7)
  const e = 0.5
  for (let k = 0; lines.length < n && k < n * 6; k++) {
    let x = rr(-700, W + 50)
    let y = rr(-400, H)
    let d = `M${i0(x)} ${i0(y)}`
    let px = i0(x)
    let py = i0(y)
    let count = 0
    for (let s = 0; s < steps; s++) {
      const gx = (psi(x + e * scale, y) - psi(x - e * scale, y)) / (2 * e)
      const gy = (psi(x, y + e * scale) - psi(x, y - e * scale)) / (2 * e)
      let vx = gy * curl + wind[0]
      let vy = -gx * curl + wind[1]
      const m = Math.hypot(vx, vy) || 1
      x += (vx / m) * step
      y += (vy / m) * step
      if (x > W + 60 || y > H + 60) break
      const nx = i0(x)
      const ny = i0(y)
      d += `l${nx - px} ${ny - py}`
      px = nx
      py = ny
      count++
    }
    const sx = Number(d.slice(1).split(" ")[0])
    const sy = Number(d.split(" ")[1].split("l")[0])
    if (count >= 8 && px > 0 && py > 0 && Math.hypot(px - sx, py - sy) > count * step * 0.55) lines.push(d)
  }
  return lines
}
const pathset = (lines, cls, spread) =>
  lines.map(d => `<path d="${d}" class="${cls} ${cls}${Math.floor(rand() * 3)}" style="animation-delay:${-r1(rand() * spread)}s"/>`).join('')

const FAR = streamlines(92, { scale: 520, curl: 2.4, wind: [1, 0.62], step: 20, steps: 34, off: 3.1 })
const MID = streamlines(92, { scale: 380, curl: 3.2, wind: [1, 0.55], step: 20, steps: 34, off: 7.7 })
const NEAR = streamlines(50, { scale: 300, curl: 3.8, wind: [1, 0.5], step: 22, steps: 30, off: 12.3 })
const GUST = streamlines(36, { scale: 700, curl: 1.2, wind: [1, 0.16], step: 26, steps: 30, off: 19.9 })

// Steady light fall: a tile of flakes sliding diagonally, stacked twice.
let tile = ''
for (let k = 0; k < 130; k++) tile += `<circle cx="${i0(rr(0, W))}" cy="${i0(rr(0, H))}" r="${r1(rr(0.8, 2))}"/>`

// ---------- The land: three bands of forest sinking into the fog ----------
function pine(x, base, h, w) {
  const n = Math.max(5, Math.round(h / 22))
  let body = ''
  let caps = ''
  for (let i = 0; i < n; i++) {
    const t = i / n
    const yb = base - h * t * 0.92
    const th = (h / n) * 1.7
    const wi = w * Math.pow(1 - t, 0.85) * rr(0.82, 1.12)
    const top = yb - th
    const droop = rr(2, 6)
    body += `M${i0(x - wi)} ${i0(yb + droop)}Q${i0(x - wi * 0.35)} ${i0(yb - th * 0.45)} ${i0(x)} ${i0(top)}Q${i0(x + wi * 0.35)} ${i0(yb - th * 0.45)} ${i0(x + wi)} ${i0(yb + droop)}L${i0(x + wi * 0.4)} ${i0(yb - 2)}L${i0(x)} ${i0(yb + 2)}L${i0(x - wi * 0.45)} ${i0(yb - 1)}Z`
    caps += `M${i0(x - wi * 0.9)} ${i0(yb + droop - 2)}Q${i0(x - wi * 0.4)} ${i0(yb - th * 0.5)} ${i0(x - 1)} ${i0(top + 2)}`
  }
  body += `M${i0(x - w * 0.08)} ${i0(base)}h${Math.max(2, i0(w * 0.16))}v${i0(h * 0.08)}h${-Math.max(2, i0(w * 0.16))}Z`
  return { body, caps }
}
function bare(x, base, h) {
  let d = ''
  const grow = (x0, y0, ang, len, depth) => {
    const x1 = x0 + Math.cos(ang) * len
    const y1 = y0 + Math.sin(ang) * len
    d += `M${i0(x0)} ${i0(y0)}L${i0(x1)} ${i0(y1)}`
    if (depth === 0) return
    grow(x1, y1, ang - rr(0.3, 0.6), len * 0.68, depth - 1)
    grow(x1, y1, ang + rr(0.3, 0.6), len * 0.66, depth - 1)
  }
  const tx = x + rr(-6, 6)
  d += `M${i0(x)} ${i0(base)}L${i0(tx)} ${i0(base - h * 0.45)}`
  grow(tx, base - h * 0.45, -Math.PI / 2 + rr(-0.15, 0.15), h * 0.3, 4)
  return d
}
const ridge = (y0, amp, sc, offY) => {
  let d = `M0 ${H}`
  for (let x = 0; x <= W; x += 40) d += `L${x} ${i0(y0 + (fbm(x / sc, offY) - 0.5) * amp * 2)}`
  return { d: `${d}L${W} ${H}Z`, line: `M${d.slice(d.indexOf('L') + 1)}`, y: x => y0 + (fbm(x / sc, offY) - 0.5) * amp * 2 }
}
// Six pine shapes at height 100, reused by every band.
const PINES = Array.from({ length: 6 }, (_, k) => {
  const p = pine(0, 0, 100, 100 * rr(0.2, 0.27))
  return `<symbol id="p${k}" overflow="visible"><path d="${p.body}" stroke="none"/><path d="${p.caps}" fill="none" stroke-width="1.1" stroke-opacity=".55" stroke-linecap="round"/></symbol>`
}).join('')
function band({ y0, amp, sc, offY, n, hMin, hMax, bareN, tree, snow, fog, cap }) {
  const hill = ridge(y0, amp, sc, offY)
  let body = ''
  let caps = ''
  let twigs = ''
  for (let k = 0; k < n; k++) {
    const x = rr(-40, W + 40)
    const clump = fbm(x / 260, offY + 4)
    if (clump < 0.38 && rand() < 0.7) continue
    const h = rr(hMin, hMax) * (0.75 + clump * 0.5)
    body += `<use href="#p${Math.floor(rand() * 6)}" transform="translate(${i0(x)} ${i0(hill.y(x) + rr(2, 10))}) scale(${rand() < 0.5 ? '-' : ''}${r1(h / 10) / 10} ${r1(h / 10) / 10})"/>`
  }
  for (let k = 0; k < bareN; k++) {
    const x = rr(0, W)
    twigs += bare(x, hill.y(x) + 6, rr(hMin, hMax) * 1.05)
  }
  return `<g fill="${mix(tree, FOG, fog)}" stroke="${mix(cap, FOG, fog)}">${body}</g><path d="${twigs}" fill="none" stroke="${mix(tree, FOG, fog)}" stroke-width="1.4"/><path d="${hill.d}" fill="${mix(snow, FOG, fog)}"/>`
}
const bandA = band({ y0: 640, amp: 26, sc: 300, offY: 1.1, n: 90, hMin: 50, hMax: 100, bareN: 4, tree: '#26303a', snow: '#56616d', cap: '#8693a0', fog: 0.72 })
const bandB = band({ y0: 700, amp: 34, sc: 360, offY: 5.3, n: 46, hMin: 100, hMax: 180, bareN: 6, tree: '#1d252e', snow: '#4b5662', cap: '#8794a2', fog: 0.52 })
const bandC = band({ y0: 770, amp: 40, sc: 420, offY: 9.7, n: 16, hMin: 160, hMax: 250, bareN: 3, tree: '#161c23', snow: '#434e5a', cap: '#8a97a5', fog: 0.34 })
const drift1 = ridge(865, 30, 480, 14.2)
const drift2 = ridge(945, 22, 380, 17.9)
// Spindrift: snow streaming off the drift crests in gusts.
let spin = ''
for (let k = 0; k < 26; k++) {
  const x = rr(-300, W)
  const which = k % 2 ? drift1 : drift2
  const y = which.y(Math.max(0, Math.min(W, x + 200))) - rr(2, 16)
  spin += `<path d="M${i0(x)} ${i0(y)}q${i0(rr(120, 220))} ${i0(rr(-14, -2))} ${i0(rr(300, 480))} ${i0(rr(-10, 6))}" class="sd" style="animation-delay:${-r1(rand() * 3)}s"/>`
}
// Low clouds dragging across.
let clouds = ''
for (let k = 0; k < 16; k++) clouds += `<ellipse cx="${i0(rr(-300, W + 300))}" cy="${i0(rr(20, 360))}" rx="${i0(rr(240, 520))}" ry="${i0(rr(40, 90))}"/>`

// Intensity cycles (seconds, primes so they rarely line up).
const GUSTC = 61

// ---------- Falling snow: depth layers of flakes, and sheets carried on the wind ----------
// Every layer falls the same way: a tile of flakes sliding down and a little
// across (DX per screen height), stacked twice so the loop never shows.
const DX = 230
const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5
function flakes(n, rMin, rMax, shape, xSpread = null) {
  let s = ''
  for (let k = 0; k < n; k++) {
    const y = rr(0, H)
    const x = xSpread ? gauss() * xSpread + (y / H) * DX : rr(-DX, W)
    const r = rr(rMin, rMax)
    s += shape === 'e'
      ? `<ellipse cx="${i0(x)}" cy="${i0(y)}" rx="${r1(r)}" ry="${r1(r * 1.5)}"/>`
      : `<circle cx="${i0(x)}" cy="${i0(y)}" r="${r1(r)}"/>`
  }
  return s
}
// Many small flakes as round-capped zero-length strokes: about 10 characters each.
function dots(n, xSpread = null) {
  let d = ''
  for (let k = 0; k < n; k++) {
    const y = rr(0, H)
    const x = xSpread ? gauss() * xSpread + (y / H) * DX : rr(-DX, W)
    d += `M${i0(x)} ${i0(y)}h0`
  }
  return d
}
const dotLayer = (id, parts) => `<g id="${id}" fill="none" stroke-linecap="round">${parts.map(([n, w, c, o, spread]) => `<path d="${dots(n, spread)}" stroke="${c}" stroke-width="${w}" stroke-opacity="${o}"/>`).join('')}</g>`
const LAYERS = [
  // id, count, radius, shape, fill, opacity, fall seconds, wobble seconds, intensity class
  ['t3', 110, 2.2, 3.6, 'e', 'url(#fk)', 0.9, 7.5, 5, 'iN'],
  ['t4', 26, 6, 11, 'c', 'url(#fk)', 0.45, 3.6, 4, 'iN'],
]
let tiles = dotLayer('t1', [[820, 2.4, '#a9b4bf', 0.72], [560, 3.2, '#b4bfca', 0.72]]) + dotLayer('t2', [[560, 4.2, '#c6d0d9', 0.85], [300, 5.6, '#d0d9e1', 0.85]])
let layerCss = '.ft1{animation:fall 30s linear infinite}.wt1{animation:wob 9s ease-in-out infinite alternate}.ft2b{animation:fall 16s linear infinite}.wt2{animation:wob 7s ease-in-out infinite alternate}'
const fallGroup = (cls, id, f, w) => `<g class="${cls}"><g class="${w}"><g class="${f}"><use href="#${id}"/><use href="#${id}" x="-${DX}" y="-${H}"/></g></g></g>`
const layerSvg = { t1: fallGroup('iF', 't1', 'ft1', 'wt1'), t2: fallGroup('iM', 't2', 'ft2b', 'wt2') }
for (const [id, n, a, b, shape, fill, op, fall, wob, cls] of LAYERS) {
  tiles += `<g id="${id}" fill="${fill}" fill-opacity="${op}">${flakes(n, a, b, shape)}</g>`
  layerCss += `.f${id}{animation:fall ${fall}s linear infinite}.w${id}{animation:wob ${wob}s ease-in-out infinite alternate}\n`
  layerSvg[id] = `<g class="${cls}"><g class="w${id}"><g class="f${id}"><use href="#${id}"/><use href="#${id}" x="-${DX}" y="-${H}"/></g></g></g>`
}
// Sheets: bands of denser snow, each with a faint haze, swept across on the wind.
let sheets = ''
let sheetCss = ''
;[[41, -6, 520], [53, -30, 420], [67, -12, 600], [79, -50, 380]].forEach(([cyc, delay, spread], k) => {
  tiles += dotLayer(`s${k}`, [[340, 3.6, '#d4dde5', 0.9, spread], [170, 4.8, '#dde5ec', 0.85, spread * 0.8]])
  sheets += `<g class="sh" style="animation:sh${k} ${cyc}s ${delay}s ease-in-out infinite"><rect x="${i0(-spread * 1.6 + DX / 2)}" y="-300" width="${i0(spread * 3.2)}" height="${H + 600}" fill="url(#sheet)" transform="skewX(13)"/><g class="ft2"><use href="#s${k}"/><use href="#s${k}" x="-${DX}" y="-${H}"/></g></g>`
  sheetCss += `@keyframes sh${k}{0%{transform:translateX(-900px);opacity:0}8%{opacity:1}50%{opacity:1}58%,100%{transform:translateX(${W + 700}px);opacity:0}}\n`
})
// Gust streaks: near-straight lines of wind-driven snow.
const STREAKS = streamlines(34, { scale: 800, curl: 0.35, wind: [1, 0.2], step: 28, steps: 28, off: 23.3 })

// ---------- Foreground trees ----------
// Two bare, snow-loaded boughs reach in from the edges. Now and then a snowy
// owl (Bubo scandiacus) comes out of the storm, lands on one, stares, dozes,
// blinks slowly a few times and leaves into the storm again. Its own seed,
// so the storm above stays exactly as it was.
const stormSeed = seed
seed = 4242
// A polyline in relative steps, which is shorter than absolute points.
const pts = a => {
  let px = 0
  let py = 0
  return a.map(([x, y], k) => {
    const X = i0(x)
    const Y = i0(y)
    const step = k ? `l${X - px} ${Y - py}` : `M${X} ${Y}`
    px = X
    py = Y
    return step
  }).join('')
}

// A smooth line through points: quadratic curves between their midpoints,
// in relative steps. Used where straight segments read as blocky (snow).
const curve = a => {
  const P = a.map(([x, y]) => [i0(x), i0(y)])
  if (P.length < 3) return pts(P)
  let d = `M${P[0][0]} ${P[0][1]}`
  let [cx, cy] = P[0]
  for (let i = 1; i < P.length - 1; i++) {
    const mx = Math.round((P[i][0] + P[i + 1][0]) / 2)
    const my = Math.round((P[i][1] + P[i + 1][1]) / 2)
    d += `q${P[i][0] - cx} ${P[i][1] - cy} ${mx - cx} ${my - cy}`
    cx = mx
    cy = my
  }
  return `${d}l${P.at(-1)[0] - cx} ${P.at(-1)[1] - cy}`
}
// A closed patch between two runs of points, both drawn as curves.
const patch = (lo, hi) => `${curve(lo)}${curve([...hi].reverse()).replace('M', 'L')}Z`
// Eases a patch to nothing at both ends, so it starts and stops softly.
const taper = (k, n) => Math.sin((Math.PI * (k + 0.5)) / n) ** 0.6

// A limb along a smooth curve through `path`, its width easing from w0 to w1.
// Snow settles on whichever side faces up, thickest where the limb is level.
function limb(path, w0, w1, N = 34) {
  const P = [path[0], ...path, path.at(-1)]
  const C = []
  for (let i = 0; i <= N; i++) {
    const f = (i / N) * (path.length - 1)
    const k = Math.min(path.length - 2, Math.floor(f))
    const u = f - k
    const [p0, p1, p2, p3] = [P[k], P[k + 1], P[k + 2], P[k + 3]]
    const cr = j => 0.5 * (2 * p1[j] + (p2[j] - p0[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u * u + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * u * u * u)
    C.push([cr(0), cr(1), w1 + (w0 - w1) * Math.pow(1 - i / N, 1.3)])
  }
  const A = []
  const B = []
  const up = []
  const cap = []
  const slope = []
  for (let i = 0; i <= N; i++) {
    const [x, y, w] = C[i]
    const [ax, ay] = C[Math.max(0, i - 1)]
    const [bx, by] = C[Math.min(N, i + 1)]
    const m = Math.hypot(bx - ax, by - ay)
    const nx = -(by - ay) / m
    const ny = (bx - ax) / m
    const g = (w / 2) * (1 + (fbm(i * 0.5, 31.7 + w0) - 0.5) * 0.3)
    const pa = [x + nx * g, y + ny * g]
    const pb = [x - nx * g, y - ny * g]
    A.push(pa)
    B.push(pb)
    up.push(pa[1] < pb[1] ? pa : pb)
    slope.push(Math.abs(nx / (ny || 1e-6)))
    cap.push(Math.max(0, 1 - slope[i] * 1.3) * (5 + 13 * fbm(i * 0.4, 8.1 + w0)) * Math.min(1, w / 40 + 0.25))
  }
  return { C, A, B, up, cap, slope, N }
}
// Snow on a limb: one drift for each run of the limb level enough to hold
// it, swelling in the middle and thinning to nothing at each end.
function snowOn(L) {
  let fill = ''
  let line = ''
  let run = []
  for (let i = 0; i <= L.N + 1; i++) {
    if (i <= L.N && L.cap[i] > 0.8) {
      run.push(i)
      continue
    }
    if (run.length > 2) {
      const lo = run.map(j => L.up[j])
      const hi = run.map((j, k) => [L.up[j][0], L.up[j][1] - L.cap[j] * taper(k, run.length)])
      fill += patch(lo, hi)
      line += curve(hi)
    }
    run = []
  }
  return { fill, line }
}
// Twigs: thin tapering sprigs off a limb, kept clear of the owl's perch.
function twigsOn(L, n, avoid = null) {
  let d = ''
  for (let k = 0; k < n; k++) {
    const i = Math.round(rr(0.2, 0.95) * L.N)
    if (avoid && i > avoid[0] * L.N && i < avoid[1] * L.N) continue
    const [x, y, w] = L.C[i]
    const [bx, by] = L.C[Math.min(L.N, i + 1)]
    const along = Math.atan2(by - y, bx - x)
    const ang = along + (rand() < 0.7 ? -1 : 1) * rr(0.45, 1)
    const len = rr(40, 110) * Math.min(1, w / 30 + 0.4)
    const bw = Math.max(1.4, w * 0.22)
    const tx = x + Math.cos(ang) * len
    const ty = y + Math.sin(ang) * len
    const cx = x + Math.cos(ang + 0.2) * len * 0.55
    const cy = y + Math.sin(ang + 0.2) * len * 0.55
    const px = -Math.sin(along) * bw
    const py = Math.cos(along) * bw
    d += `M${i0(x - px)} ${i0(y - py)}Q${i0(cx)} ${i0(cy)} ${i0(tx)} ${i0(ty)}Q${i0(cx + px * 0.4)} ${i0(cy + py * 0.4)} ${i0(x + px)} ${i0(y + py)}Z`
    d += `M${i0(cx - 1)} ${i0(cy)}L${i0(cx + Math.cos(ang - 0.6) * len * 0.4)} ${i0(cy + Math.sin(ang - 0.6) * len * 0.4)}L${i0(cx + 1)} ${i0(cy + 1)}Z`
  }
  return d
}
// One side of the frame: a trunk rising steeply from the bottom corner, as
// if we stand right beside the tree, with branches reaching a little way in.
// The perch branch is the one the owl lands on.
function treeSide({ trunk, perch, others, windward, bark: trunkBark = 'url(#bk)' }) {
  const T = limb(trunk[0], trunk[1], trunk[2], 44)
  const Pb = limb(perch[0], perch[1], perch[2])
  const O = others.map(([path, w0, w1]) => limb(path, w0, w1, 26))
  let ip = Math.round(Pb.N * 0.3)
  for (let i = Math.round(Pb.N * 0.3); i <= Math.round(Pb.N * 0.55); i++) if (Pb.slope[i] < Pb.slope[ip]) ip = i
  for (const j of [ip - 2, ip - 1, ip, ip + 1, ip + 2]) Pb.cap[j] = Math.max(Pb.cap[j], 7)
  let twigs = twigsOn(Pb, 6, [0.22, 0.62])
  for (const L of O) twigs += twigsOn(L, 3)
  // The gale plasters snow up the side of the trunk it blows against, in
  // soft-edged patches that swell and thin.
  let plaster = ''
  let run = []
  for (let i = 0; i <= T.N + 1; i++) {
    const ok = i <= T.N && i > 1 && fbm(i * 0.85, 44.4 + trunk[1]) > 0.46
    if (ok) {
      run.push(i)
      continue
    }
    if (run.length > 2) {
      const edge = run.map(j => (T.A[j][0] * windward > T.B[j][0] * windward ? T.A[j] : T.B[j]))
      const inner = run.map((j, k) => [edge[k][0] - windward * (2 + 18 * fbm(j * 0.8, 51.3 + trunk[1]) ** 1.4 + 5 * (fbm(j * 2.3, 9.7) - 0.5)) * taper(k, run.length), edge[k][1]])
      plaster += patch(edge, inner)
    }
    run = []
  }
  // Each limb its own shape, so overlapping outlines never cancel into holes;
  // twigs sit behind the branches, the branches behind the trunk.
  const draw = (Ls, fill = 'url(#bk)') => {
    let wood = ''
    let bark = ''
    let rim = ''
    let snow = ''
    let crest = ''
    for (const L of Ls) {
      wood += `<path d="${pts(L.A)}${pts([...L.B].reverse()).replace('M', 'L')}Z"/>`
      for (let k = 0; k < 4; k++) {
        const a = Math.round(rr(0, 0.6) * L.N)
        const f = rr(-0.3, 0.3)
        bark += pts(L.C.slice(a, a + Math.round(rr(4, 9))).map(([x, y, w]) => [x, y + w * f]))
      }
      rim += pts(L.up.slice(0, Math.round(L.N * 0.85)).map(([x, y]) => [x, y + 3]))
      const sn = snowOn(L)
      snow += sn.fill
      crest += sn.line
    }
    return `<g fill="${fill}">${wood}</g><path d="${bark}" fill="none" stroke="#040506" stroke-width="2.4" stroke-linecap="round" stroke-opacity=".8"/><path d="${rim}" fill="none" stroke="#3c4754" stroke-width="2" stroke-opacity=".6"/>`
      + (Ls.includes(T) ? `<path d="${plaster}" fill="#8f9aa5" fill-opacity=".85"/>` : '')
      + `<path d="${snow}" fill="#b4bec8"/><path d="${crest}" fill="none" stroke="#e0e7ed" stroke-opacity=".75" stroke-width="2" stroke-linecap="round"/>`
  }
  const svg = `<path d="${twigs}" fill="#0b0e12"/>${draw([...O, Pb])}${draw([T], trunkBark)}`
  return { svg, perch: [Pb.up[ip][0], Pb.up[ip][1] - Pb.cap[ip] + 2.5] }
}

const LEFT = treeSide({
  trunk: [[[-110, 1100], [0, 880], [105, 640], [150, 400], [175, 160], [190, -90]], 250, 95],
  windward: -1,
  perch: [[[110, 640], [230, 585], [350, 570], [455, 540], [545, 488]], 64, 5],
  others: [
    [[[170, 300], [280, 255], [370, 190], [440, 140]], 46, 4],
    [[[40, 880], [170, 845], [265, 800], [340, 735]], 74, 6],
  ],
})
const RIGHT = treeSide({
  // Unlike the left tree, it rises from nearer the middle, leans out, and
  // its trunk is a shade darker.
  bark: 'url(#bk2)',
  trunk: [[[330, 1100], [285, 860], [232, 620], [172, 380], [118, 130], [64, -90]], 230, 88],
  windward: 1,
  perch: [[[205, 545], [305, 482], [405, 462], [485, 432], [545, 378]], 58, 5],
  others: [
    [[[138, 235], [232, 202], [325, 214], [405, 184]], 40, 4],
    [[[290, 890], [375, 875], [445, 845], [505, 803]], 66, 6],
  ],
})
// The owl, drawn facing us with its feet at (0, 0): a snowy owl's round,
// neckless shape in clean white, shaded only by a cool gradient.
// A wing reaching right from the shoulder: broad, rounded, the primaries
// fingered.
const WING = `<symbol id="owg" overflow="visible"><path d="M0 -7C20 -20 50 -22 72 -12C80 -8 81 -1 76 3L70 2L72 8L64 6L65 12L56 9L55 15L46 11C32 14 14 12 0 7Z" fill="#e7ecf0" stroke="#9aa6b1" stroke-width=".7" stroke-opacity=".6"/></symbol>`
const OWLBODY = `<symbol id="owb" overflow="visible"><path d="M0 -108C21 -108 33 -95 33 -78C33 -68 31 -63 32 -58C40 -44 40 -16 27 -5C18 2 -18 2 -27 -5C-40 -16 -40 -44 -32 -58C-31 -63 -33 -68 -33 -78C-33 -95 -21 -108 0 -108Z" fill="url(#ow)"/>
<ellipse cx="-9" cy="-1.5" rx="7.5" ry="4.5" fill="url(#ow)"/><ellipse cx="9" cy="-1.5" rx="7.5" ry="4.5" fill="url(#ow)"/>
<path d="M-15 1q-1 3.5-3.5 4.5M-10 2q0 3.5-2 5M-5 1q1 3.5-1 5M5 1q-1 3.5 1 5M10 2q0 3.5 2 5M15 1q1 3.5 3.5 4.5" fill="none" stroke="#15171a" stroke-width="1.6" stroke-linecap="round"/></symbol>`
// Faint crescents across the lower breast, seen only while it faces us.
let bars = ''
for (let r = 0; r < 4; r++) {
  const y = -42 + r * 8
  const half = 15 + r * 3
  for (let x = -half; x <= half; x += 7.5) {
    if (rand() < 0.3) continue
    bars += `M${r1(x + rr(-1.5, 1.5) - 2.5)} ${r1(y + rr(-1.2, 1.2))}q2.5 2 5 0`
  }
}
const BREAST = `<path class="br" d="${bars}" fill="none" stroke="#9a948d" stroke-width="1.3" stroke-linecap="round" stroke-opacity=".5"/>`
// The folded wings lie along its sides only while they are folded.
const FOLDED = '<path class="fw" d="M30 -62C40 -46 38 -18 24 -4C20 -14 14 -34 16 -54ZM-30 -62C-40 -46 -38 -18 -24 -4C-20 -14 -14 -34 -16 -54Z" fill="#dce3e8" stroke="#aab4be" stroke-width=".8"/>'
// The face: a soft disc, heavy white brows hooding lemon-yellow eyes (which
// is what makes the stare so fierce), a black beak almost buried in bristles.
const eye = x => `<ellipse cx="${x}" cy="-82" rx="7" ry="5.6" fill="#1b1a17"/><circle cx="${x}" cy="-82" r="5.2" fill="url(#iris)"/><circle cx="${x}" cy="-82" r="2.9" fill="#0a0a0a"/><circle cx="${x + 1.5}" cy="-83" r="1" fill="#fff" fill-opacity=".9"/>`
const FACE = `<g class="fc"><path d="M-27 -90Q-30 -66-9 -61M27 -90Q30 -66 9 -61" fill="none" stroke="#b2bcc6" stroke-width="1.3" stroke-opacity=".8"/>
<g class="ey">${eye(-11.5)}${eye(11.5)}</g>
<path d="M-21 -93H-2.5V-81.4Q-9 -85.6-20.5-85.4ZM21 -93H2.5V-81.4Q9 -85.6 20.5-85.4Z" fill="url(#ow)"/>
<path d="M-20.5 -85.4Q-9 -85.6-2.5 -81.4M20.5 -85.4Q9 -85.6 2.5 -81.4" fill="none" stroke="#a9b3bd" stroke-width="1"/><path d="M-19 -89.5Q-10 -91-3 -86.5M19 -89.5Q10 -91 3 -86.5" fill="none" stroke="#c9d1d8" stroke-width=".9"/>
<path d="M0 -77C2.6 -76 3 -72 0 -67.5C-3 -72-2.6 -76 0 -77Z" fill="#222"/>
<path d="M-1.5 -85l-1.8 9M1.5 -85l1.8 9M0 -84v7" stroke="#f4f7f9" stroke-width="1.4" stroke-linecap="round"/>
<path d="M-3 -71q-6 3-10 2M3 -71q6 3 10 2" fill="none" stroke="#c4cdd5" stroke-width="1"/></g>`
// A pair of wings hinged at the shoulders; cls shows or hides the pair,
// inner moves each wing.
const wings = (cls, inner) => `<g class="${cls}"><g transform="translate(22 -62)"><g class="${inner}"><use href="#owg" transform="scale(1.45 1.25)"/></g></g><g transform="translate(-22 -62) scale(-1 1)"><g class="${inner}"><use href="#owg" transform="scale(1.45 1.25)"/></g></g></g>`
const OWL = `${wings('owp', 'pw')}<use href="#owb"/>${BREAST}${FOLDED}${FACE}`

// One visit, in seconds from when the owl first shows. Everything the owl
// does runs on this cycle, delayed by --d so each tree can take its turn.
const OWL_T = 240
const kf = (name, steps, ease = 'linear') =>
  `@keyframes ${name}{${steps.map(([t, css]) => `${Math.round((t / OWL_T) * 10000) / 100}%{${css}}`).join('')}100%{${steps.at(-1)[1]}}}.${name}{animation:${name} ${OWL_T}s ${ease} infinite;animation-delay:var(--d)}\n`
// It glides in on spread wings, brakes with them raised, and folds them.
// It stares, glances aside, then the eyes slide shut. Later it wakes, blinks
// slowly three times, turns its face away, leaps off with two slow beats and
// glides away into the storm. Every move takes a second or more: fast
// repeating motion froze the desktop app on 16 November 2026.
const OPEN = 'transform:scaleY(1)'
const SHUT = 'transform:scaleY(.08)'
const POSE = (a, k) => `transform:rotate(${a}deg) scaleX(${k})`
const FACING = (x, o) => `transform:translateX(${x}px);opacity:${o}`
const OPACITY = o => `opacity:${o}`
let owlCss = kf('fc', [[0, FACING(0, 1)], [8.4, FACING(0, 1)], [9, FACING(-4.5, 1)], [10.4, FACING(-4.5, 1)], [11, FACING(0, 1)], [30.4, FACING(0, 1)], [31.4, FACING(-9, 0)]], 'ease-in-out')
  + kf('ey', [[0, OPEN], [11.4, OPEN], [12.8, SHUT], [19.6, SHUT], [21, OPEN], [22.4, OPEN], [23.4, SHUT], [24, SHUT], [25, OPEN], [26.2, OPEN], [27.2, SHUT], [27.8, SHUT], [28.8, OPEN]], 'ease-in-out')
  + kf('owp', [[0, OPACITY(1)], [8.3, OPACITY(1)], [8.6, OPACITY(0)], [31.5, OPACITY(0)], [31.8, OPACITY(1)]])
  + kf('br', [[0, OPACITY(1)], [30.4, OPACITY(1)], [31.4, OPACITY(0)]], 'ease-in-out')
  + kf('fw', [[0, OPACITY(0)], [8.2, OPACITY(0)], [8.6, OPACITY(1)], [31.6, OPACITY(1)], [31.9, OPACITY(0)]])
  + kf('pw', [[0, POSE(-6, 1)], [5.8, POSE(-6, 1)], [6.9, POSE(-38, 1)], [7.3, POSE(-38, 1)], [8.5, POSE(88, 0.5)], [31.6, POSE(88, 0.5)], [32.6, POSE(-45, 1)], [33.8, POSE(28, 1)], [35, POSE(-40, 1)], [36.2, POSE(26, 1)], [37.4, POSE(-6, 1)]], 'ease-in-out')
// The path: a few points along each curve keep the keyframes short. In, it
// slows as it nears the perch; out, it leaps straight away, shrinking fast.
const swoop = (from, via, to, t0, t1, scale, fade, easeOut) => {
  const steps = []
  for (let k = 0; k <= 6; k++) {
    const tau = k / 6
    const u = easeOut ? 1 - (1 - tau) ** 1.6 : tau ** 1.7
    const at = j => i0((1 - u) ** 2 * from[j] + 2 * (1 - u) * u * via[j] + u * u * to[j])
    steps.push([t0 + (t1 - t0) * tau, `transform:translate(${at(0)}px,${at(1)}px) scale(${Math.round(scale(u) * 100) / 100});opacity:${Math.round(fade(u) * 100) / 100}`])
  }
  return steps
}
const ARRIVE = swoop([620, -380], [170, -30], [0, 0], 0, 7, u => 0.08 + 0.92 * u ** 1.8, u => Math.min(1, u * 2.6), true)
const LEAVE = swoop([0, 0], [20, -90], [90, -210], 32.6, 41.5, u => 1 - 0.9 * u ** 0.6, u => (u < 0.55 ? 1 : (1 - u) / 0.45), false)
owlCss += kf('ov', [...ARRIVE, [32.6, ARRIVE.at(-1)[1]], ...LEAVE])

const INSET = 170
// Each tree leans a touch in the big gusts, about the foot of its trunk.
const TREES = `<g transform="translate(${INSET} 0)"><g class="sw">${LEFT.svg}<g transform="translate(${r1(LEFT.perch[0])} ${r1(LEFT.perch[1])}) scale(1.7)"><g class="ov" style="--d:-220s">${OWL}</g></g></g></g><g transform="translate(${W - INSET} 0) scale(-1 1)"><g class="sw">${RIGHT.svg}</g></g>`
seed = stormSeed


const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.lg{fill:none;stroke-linecap:round;stroke:#dde5ec;stroke-opacity:.34;stroke-width:1.4;animation:sg 1.3s linear infinite}
@keyframes sg{to{stroke-dashoffset:-744}}
.lg0{stroke-dasharray:26 160}.lg1{stroke-dasharray:14 90 34 48}.lg2{stroke-dasharray:40 120 10 16}
@keyframes fall{to{transform:translate(${DX}px,${H}px)}}
@keyframes wob{from{transform:translateX(-16px)}to{transform:translateX(16px)}}
${layerCss}.ft2{animation:fall 16s linear infinite}
${sheetCss}.iF{animation:iF 53s ease-in-out infinite}
@keyframes iF{0%,100%{opacity:.75}50%{opacity:1}}
.iM{animation:iM 97s ease-in-out -20s infinite}
@keyframes iM{0%{opacity:.45}22%{opacity:.55}34%{opacity:.9}48%{opacity:1}58%{opacity:.6}74%{opacity:.8}86%,100%{opacity:.45}}
.iN{animation:iN 71s ease-in-out -9s infinite}
@keyframes iN{0%,30%{opacity:0}44%{opacity:.85}52%{opacity:1}64%{opacity:.15}80%{opacity:.6}90%,100%{opacity:0}}
.iG{animation:iG ${GUSTC}s ease-in-out infinite}
@keyframes iG{0%,52%{opacity:0}58%{opacity:.9}64%{opacity:.35}70%{opacity:1}80%,100%{opacity:0}}
.push{animation:push ${GUSTC}s ease-in-out infinite}
@keyframes push{0%,52%{transform:translateX(0)}74%{transform:translateX(170px)}100%{transform:translateX(0)}}
.veil{animation:veil 113s ease-in-out -40s infinite}
@keyframes veil{0%,38%{opacity:.04}46%{opacity:.34}52%{opacity:.52}60%{opacity:.16}70%{opacity:.32}80%,100%{opacity:.04}}
.sd{fill:none;stroke:#d3dce5;stroke-opacity:.3;stroke-width:3;stroke-linecap:round;stroke-dasharray:40 140;animation:sg 1.6s linear infinite}
.cl{animation:cl 140s ease-in-out infinite alternate}
@keyframes cl{to{transform:translateX(260px)}}
.glow{animation:glow 37s ease-in-out infinite alternate}
@keyframes glow{from{opacity:.5}to{opacity:1}}
.ey{transform-origin:0 -80.5px}
${owlCss}.sw{animation:sw ${GUSTC}s ease-in-out infinite;transform-origin:0 1000px}
@keyframes sw{0%,52%{transform:rotate(0)}60%{transform:rotate(.45deg)}66%{transform:rotate(.15deg)}73%{transform:rotate(.6deg)}88%,100%{transform:rotate(0)}}
@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e1319"/><stop offset=".35" stop-color="#1d252e"/><stop offset=".62" stop-color="#3a4551"/><stop offset=".72" stop-color="#4a5561"/></linearGradient>
<radialGradient id="sun" cx="1460" cy="300" r="380" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b9c3cc" stop-opacity=".22"/><stop offset="1" stop-color="#b9c3cc" stop-opacity="0"/></radialGradient>
<radialGradient id="fk"><stop offset="0" stop-color="#eef3f7"/><stop offset=".55" stop-color="#e2e9ef" stop-opacity=".7"/><stop offset="1" stop-color="#e2e9ef" stop-opacity="0"/></radialGradient>
<linearGradient id="sheet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#aab5c0" stop-opacity="0"/><stop offset=".5" stop-color="#aab5c0" stop-opacity=".18"/><stop offset="1" stop-color="#aab5c0" stop-opacity="0"/></linearGradient>
<radialGradient id="cloud"><stop offset="0" stop-color="#0d1217" stop-opacity=".55"/><stop offset="1" stop-color="#0d1217" stop-opacity="0"/></radialGradient>
<linearGradient id="fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${FOG}" stop-opacity="0"/><stop offset=".5" stop-color="${FOG}" stop-opacity=".6"/><stop offset="1" stop-color="${FOG}" stop-opacity="0"/></linearGradient>
<linearGradient id="white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8995" stop-opacity=".5"/><stop offset=".6" stop-color="#9aa5b0"/><stop offset="1" stop-color="#7d8995" stop-opacity=".6"/></linearGradient>
<linearGradient id="dr1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4450"/><stop offset="1" stop-color="#1a2028"/></linearGradient>
<linearGradient id="dr2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#323b46"/><stop offset="1" stop-color="#11161c"/></linearGradient>
${PINES}
<radialGradient id="ow" cx="-8" cy="-82" r="78" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f6f8fa"/><stop offset=".55" stop-color="#e6ebef"/><stop offset="1" stop-color="#b6c0ca"/></radialGradient>
<radialGradient id="iris"><stop offset="0" stop-color="#ffe85a"/><stop offset=".7" stop-color="#f7cf1c"/><stop offset="1" stop-color="#d9a40c"/></radialGradient>
${WING}${OWLBODY}
<linearGradient id="bk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07090c"/><stop offset=".55" stop-color="#0e1216"/><stop offset="1" stop-color="#1a2129"/></linearGradient>
<linearGradient id="bk2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#040608"/><stop offset=".55" stop-color="#090c0f"/><stop offset="1" stop-color="#11161c"/></linearGradient>
<filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.6"/></filter><filter id="soft2" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2"/></filter><filter id="soft3" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.2"/></filter>
${tiles}
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" fill="url(#sun)" class="glow"/>
<g class="cl" fill="url(#cloud)">${clouds}</g>
<g filter="url(#soft)">${bandA}</g>
<rect y="560" width="${W}" height="200" fill="url(#fog)"/>
${layerSvg.t1}
<g filter="url(#soft2)">${bandB}</g>
<rect y="620" width="${W}" height="220" fill="url(#fog)"/>
<g filter="url(#soft3)">${bandC}</g>
<rect y="700" width="${W}" height="200" fill="url(#fog)"/>
<g class="push">${layerSvg.t2}</g>
<path d="${drift1.d}" fill="url(#dr1)"/><path d="${drift1.line}" fill="none" stroke="#8b9cad" stroke-opacity=".22" stroke-width="2"/>
<path d="${drift2.d}" fill="url(#dr2)"/>
<g class="push">${sheets}</g>
<rect width="${W}" height="${H}" fill="url(#white)" class="veil"/>
<g class="iG">${pathset(STREAKS, 'lg', 1.3)}<g>${spin}</g></g>
${TREES}
<g class="push">${layerSvg.t3}${layerSvg.t4}</g>
</svg>`

// The engine allows 131 072 characters, but on 16 November 2026 the desktop
// app froze every scene from about 126 000 up (rainforest's included) while
// this storm at 111 913 ran. Keep well under that.
const BUDGET = 110000
if (svg.length > BUDGET) throw new Error(`scene too long: ${svg.length} of ${BUDGET}`)
writeFileSync(
  out,
  `// Generated by generators/blizzard/gen-scene.mjs: the blizzard backdrop.\nexport const SCENE = ${JSON.stringify(svg)}\n`,
)
console.log(`scene: ${svg.length} of ${BUDGET} characters`)
