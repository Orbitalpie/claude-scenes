// Shared by the scenes traced from photographs (crab, ring, ...). Not a scene:
// build.mjs skips this folder.
//
// The desktop app won't draw embedded raster pictures inside a scene (tested
// November 2026), so a photo is shrunk to a small grid of colours at build time
// (make-pixels.cjs) and traced here into three layers of round-capped strokes:
//
// 1. Underpainting: broad, faint strokes that lay down the soft colour.
// 2. Filaments: short, fine strokes wherever the photo has bright detail, each
//    laid along the photo's own grain (a structure tensor of the brightness),
//    in a dim set and a bright set.
// 3. Sparks: the brightest knots, as dots.
//
// Since session 6 the filaments can instead be joined into continuous lines of
// relative steps along the grain (options fil.chain, res, order; see DEFAULTS),
// about 2.3 times more compact, which lets a drawing carry far more detail.
//
// Each layer's colours are reduced to a small palette (k-means), and each
// palette colour is one <path>. The paths are in photo pixels: put them in a
// group that translates and scales them into place.
//
//   const px = loadPixels(new URL('./crab-pixels.bin.gz', import.meta.url))
//   const t = trace(px, { ...knobs })   // { UNDER, FIL, SPARK, count, PW, PH }
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

// The .gz holds two 16-bit little-endian numbers (width, height), then
// width x height RGB bytes.
export function loadPixels(file) {
  const raw = gunzipSync(readFileSync(file))
  const PW = raw.readUInt16LE(0)
  const PH = raw.readUInt16LE(2)
  const R = new Float32Array(PW * PH)
  const G = new Float32Array(PW * PH)
  const B = new Float32Array(PW * PH)
  for (let i = 0; i < PW * PH; i++) {
    R[i] = raw[4 + i * 3] / 255
    G[i] = raw[5 + i * 3] / 255
    B[i] = raw[6 + i * 3] / 255
  }
  return { PW, PH, R, G, B }
}

export const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')

// The knobs, with the values the Crab Nebula was tuned with.
export const DEFAULTS = {
  // Brightness from colour.
  luma: [0.3, 0.55, 0.15],
  // Underpainting layers, painted in order on one random sequence. step: grid
  // spacing in photo pixels; len: stroke length; r: colour averaging radius;
  // minL: the wide-blurred brightness below which it fades out; k: palette
  // size; width, opacity: the stroke's look.
  under: [
    { step: 11, len: 7, r: 4, minL: 0.03, k: 12, width: 15, opacity: 0.16 },
    { step: 7, len: 5, r: 2, minL: 0.05, k: 16, width: 8, opacity: 0.2 },
  ],
  underSat: 1.3,
  underSeed: 5150,
  // Filaments: a stroke is tried every `step` photo pixels and kept with
  // chance detail * detailGain + brightness * lumGain - bias. minWide skips
  // places whose wide-blurred brightness is below it, such as lone stars in
  // the photo, which would otherwise come out as stray dashes.
  fil: {
    step: 2.1, jitter: 1, detailGain: 6, lumGain: 0.8, bias: 0.15, turn: 0.15, len: [2, 4],
    sat: 1.5, gain: 1.1, brightL: 0.38, brightDetail: 0.1, minWide: 0,
    dim: { k: 18, width: 1.1, opacity: 0.5 },
    bright: { k: 22, width: 1.15, opacity: 0.85 },
  },
  filSeed: 6160,
  // Sparks: local brightest points above minL that stand out by minDetail.
  spark: { minL: 0.5, minDetail: 0.12, sat: 1.1, gain: 1.3, k: 4, width: 1.6, opacity: 0.9 },
  // Blur radii in photo pixels: for the brightness the grain is measured on, the
  // grain itself (the tensor) and the wide brightness that detail is measured
  // against. Scale them up with a bigger grid (they suit a grid about 300 wide).
  blurs: [1, 3, 6],
  // Seed for the k-means palettes.
  paletteSeed: 777,
  // Compact writing (session 6). All off by default, so the Crab is unchanged.
  // res: coordinates are written in units of 1/res photo pixel (2 gives smoother
  // lines for little extra length). The paths then sit in a group that must be
  // scaled by `unit` (= 1/res) as well; trace() returns it.
  res: 1,
  // order: 'reading' (top to bottom) or 'nearest' (each stroke or chain starts
  // near where the last one ended, so the moves between them are short numbers).
  order: 'reading',
  // fil.chain: instead of one short separate stroke per spot, join neighbouring
  // spots that follow the grain (and have a similar colour) into one continuous
  // line of relative steps, with no move between them:
  //   { gap: furthest the next spot may be (photo px), maxLen: most spots in one
  //     line, turn: widest bend between steps (radians), colour: widest colour
  //     difference (0-255, summed over the three channels) }
  // Set to null for the separate short strokes.
}

export function trace(px, knobs = {}) {
  const o = { ...DEFAULTS, ...knobs, fil: { ...DEFAULTS.fil, ...knobs.fil }, spark: { ...DEFAULTS.spark, ...knobs.spark } }
  const { PW, PH, R, G, B } = px

  let seed = 1
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const rr = (a, b) => a + rand() * (b - a)
  const i0 = n => Math.round(n)
  const fmt = n => String(Math.round(n * 100) / 100).replace(/^0\./, '.')

  const L = new Float32Array(PW * PH)
  for (let i = 0; i < PW * PH; i++) L[i] = o.luma[0] * R[i] + o.luma[1] * G[i] + o.luma[2] * B[i]
  const idx = (x, y) => Math.min(PH - 1, Math.max(0, y)) * PW + Math.min(PW - 1, Math.max(0, x))
  // A box blur of radius r, run twice (close to a Gaussian).
  function blur(src, r) {
    let a = src
    for (let pass = 0; pass < 2; pass++) {
      const t = new Float32Array(PW * PH)
      const out = new Float32Array(PW * PH)
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        let s = 0
        for (let k = -r; k <= r; k++) s += a[idx(x + k, y)]
        t[y * PW + x] = s / (2 * r + 1)
      }
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        let s = 0
        for (let k = -r; k <= r; k++) s += t[idx(x, y + k)]
        out[y * PW + x] = s / (2 * r + 1)
      }
      a = out
    }
    return a
  }
  // The grain: which way the threads run at each point (the structure tensor
  // of the brightness, smoothed), and how much finer detail stands out there.
  const Ls = blur(L, o.blurs[0])
  const Jxx = new Float32Array(PW * PH)
  const Jyy = new Float32Array(PW * PH)
  const Jxy = new Float32Array(PW * PH)
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const gx = Ls[idx(x + 1, y)] - Ls[idx(x - 1, y)]
    const gy = Ls[idx(x, y + 1)] - Ls[idx(x, y - 1)]
    const i = y * PW + x
    Jxx[i] = gx * gx
    Jyy[i] = gy * gy
    Jxy[i] = gx * gy
  }
  const Sxx = blur(Jxx, o.blurs[1])
  const Syy = blur(Jyy, o.blurs[1])
  const Sxy = blur(Jxy, o.blurs[1])
  const grain = i => 0.5 * Math.atan2(2 * Sxy[i], Sxx[i] - Syy[i]) + Math.PI / 2
  const Lwide = blur(L, o.blurs[2])

  // Colour of the photo at (x, y), averaged over a little square.
  function colourAt(x, y, r = 1) {
    const s = [0, 0, 0]
    let n = 0
    for (let v = -r; v <= r; v++) for (let u = -r; u <= r; u++) {
      const i = idx(i0(x) + u, i0(y) + v)
      s[0] += R[i]; s[1] += G[i]; s[2] += B[i]; n++
    }
    return s.map(c => (c / n) * 255)
  }
  // Richer colour: a strokes layer reads paler than the photo, so push saturation.
  function boost([r, g, b], sat, gain) {
    const m = (r + g + b) / 3
    return [r, g, b].map(c => (m + (c - m) * sat) * gain)
  }
  // k-means: a small palette for many colours, so each palette colour is one <path>.
  function palette(cols, k) {
    seed = o.paletteSeed
    let cents = Array.from({ length: k }, () => cols[Math.floor(rand() * cols.length)].slice())
    const lab = new Int32Array(cols.length)
    for (let it = 0; it < 12; it++) {
      for (let j = 0; j < cols.length; j++) {
        let best = 0
        let bd = Infinity
        for (let c = 0; c < k; c++) {
          const d = (cols[j][0] - cents[c][0]) ** 2 + (cols[j][1] - cents[c][1]) ** 2 + (cols[j][2] - cents[c][2]) ** 2
          if (d < bd) { bd = d; best = c }
        }
        lab[j] = best
      }
      const sum = cents.map(() => [0, 0, 0, 0])
      cols.forEach((c, j) => { const s = sum[lab[j]]; s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; s[3]++ })
      cents = sum.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cents[c]))
    }
    return { cents, lab }
  }
  // Strokes [x, y, dx, dy, colour] into one <path> per colour, in reading order,
  // each stroke a short relative move and line (a zero line is a round dot).
  function strokesToPaths(strokes, { k, width, opacity }) {
    if (!strokes.length) return ''
    const { cents, lab } = palette(strokes.map(s => s[4]), Math.min(k, strokes.length))
    const groups = cents.map(() => [])
    strokes.forEach((s, j) => groups[lab[j]].push(s))
    let svg = `<g fill="none" stroke-linecap="round" stroke-width="${fmt(width)}" stroke-opacity="${fmt(opacity)}">`
    groups.forEach((g, c) => {
      if (!g.length) return
      g.sort((a, b) => a[1] - b[1] || a[0] - b[0])
      let px = 0
      let py = 0
      let d = ''
      for (const [x, y, dx, dy] of g) {
        const sx = i0(x - dx / 2)
        const sy = i0(y - dy / 2)
        const ex = i0(x + dx / 2)
        const ey = i0(y + dy / 2)
        // After a relative move, a second pair of numbers is a relative line, so no "l" is needed.
        const dot = ex === sx && ey === sy
        d += d ? `m${sx - px} ${sy - py}` + (dot ? 'h0' : ` ${ex - sx} ${ey - sy}`) : `M${sx} ${sy}` + (dot ? 'h0' : `l${ex - sx} ${ey - sy}`)
        px = ex
        py = ey
      }
      svg += `<path stroke="${hex(cents[c])}" d="${d.replace(/ -/g, '-')}"/>`
    })
    return svg + '</g>'
  }

  // ---- Compact writing (options res, order, fil.chain) ----
  // A stroke [x, y, dx, dy, colour] as a two-point line.
  const asLine = s => ({ pts: [[s[0] - s[2] / 2, s[1] - s[3] / 2], [s[0] + s[2] / 2, s[1] + s[3] / 2]], col: s[4], spots: 1 })

  // Joins strokes that follow the grain into lines. Each spot may join a line if
  // it lies ahead of the line's end (within `gap`), points the same way (within
  // `turn`) and has a similar colour. Spots that join nothing stay short strokes.
  function chainUp(list, c) {
    const cell = c.gap
    const key = (cx, cy) => cx * 100003 + cy
    const grid = new Map()
    list.forEach((s, j) => {
      const kk = key(Math.floor(s[0] / cell), Math.floor(s[1] / cell))
      if (!grid.has(kk)) grid.set(kk, [])
      grid.get(kk).push(j)
    })
    const used = new Uint8Array(list.length)
    const unit = s => { const l = Math.hypot(s[2], s[3]) || 1; return [s[2] / l, s[3] / l] }
    const cosTurn = Math.cos(c.turn)
    const minStep = c.minStep ?? 0
    // Walk on from p heading h. Spots closer than minStep that point the same
    // way are swallowed (they would only add tiny steps). Returns the next spot.
    function next(p, h, col) {
      const cx = Math.floor(p[0] / cell)
      const cy = Math.floor(p[1] / cell)
      let best = -1
      let bs = Infinity
      for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) for (const j of grid.get(key(cx + u, cy + v)) ?? []) {
        if (used[j]) continue
        const s = list[j]
        const vx = s[0] - p[0]
        const vy = s[1] - p[1]
        const dist = Math.hypot(vx, vy)
        if (dist > c.gap) continue
        const d = unit(s)
        const dot = d[0] * h[0] + d[1] * h[1]
        if (Math.abs(dot) < cosTurn) continue
        if (dist < minStep) { if (dist === 0 || (vx * h[0] + vy * h[1]) / dist > 0.3) used[j] = 1; continue }
        if ((vx * h[0] + vy * h[1]) / dist < 0.5) continue
        if (Math.abs(s[4][0] - col[0]) + Math.abs(s[4][1] - col[1]) + Math.abs(s[4][2] - col[2]) > c.colour) continue
        const score = dist * (2 - Math.abs(dot))
        if (score < bs) { bs = score; best = j }
      }
      return best
    }
    const chains = []
    for (let j = 0; j < list.length; j++) {
      if (used[j]) continue
      used[j] = 1
      const s = list[j]
      let pts = [[s[0], s[1]]]
      const col = s[4].slice()
      let n = 1
      const grow = (h0, sink) => {
        let h = h0
        let p = [s[0], s[1]]
        while (n < c.maxLen) {
          const m = next(p, h, col)
          if (m < 0) break
          used[m] = 1
          const t = list[m]
          const d = unit(t)
          const sg = d[0] * h[0] + d[1] * h[1] < 0 ? -1 : 1
          const vx = t[0] - p[0]
          const vy = t[1] - p[1]
          const vl = Math.hypot(vx, vy) || 1
          let hx = d[0] * sg + vx / vl
          let hy = d[1] * sg + vy / vl
          const hl = Math.hypot(hx, hy) || 1
          h = [hx / hl, hy / hl]
          p = [t[0], t[1]]
          sink(p)
          for (let q = 0; q < 3; q++) col[q] += (t[4][q] - col[q]) / (n + 1)
          n++
        }
      }
      const h0 = unit(s)
      const after = []
      grow(h0, p => after.push(p))
      const before = []
      grow([-h0[0], -h0[1]], p => before.push(p))
      pts = [...before.reverse(), ...pts, ...after]
      if (pts.length < 2) { chains.push(asLine(s)); continue }
      for (let pass = 0; pass < (c.smooth ?? 0); pass++) {
        pts = pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : [(pts[i - 1][0] + 2 * p[0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * p[1] + pts[i + 1][1]) / 4]))
      }
      chains.push({ pts, col, spots: pts.length })
    }
    return chains
  }

  // Greedy nearest neighbour: start with the chain nearest the top left, then
  // always go on with whichever unused chain has an end closest to where the
  // pen is, turning it round if it is its far end that is near.
  function orderNearest(chains) {
    const n = chains.length
    if (n < 3) return chains
    const cell = 8
    const key = (cx, cy) => cx * 100003 + cy
    const grid = new Map()
    const add = (p, j, e) => {
      const kk = key(Math.floor(p[0] / cell), Math.floor(p[1] / cell))
      if (!grid.has(kk)) grid.set(kk, [])
      grid.get(kk).push([j, e])
    }
    chains.forEach((c, j) => { add(c.pts[0], j, 0); add(c.pts[c.pts.length - 1], j, 1) })
    const used = new Uint8Array(n)
    const maxR = Math.ceil(Math.max(PW, PH) / cell) + 2
    let start = 0
    chains.forEach((c, j) => { if (c.pts[0][1] + c.pts[0][0] * 0.1 < chains[start].pts[0][1] + chains[start].pts[0][0] * 0.1) start = j })
    const out = []
    let j = start
    let rev = false
    for (let k = 0; k < n; k++) {
      used[j] = 1
      const c = chains[j]
      const pts = rev ? c.pts.slice().reverse() : c.pts
      out.push({ ...c, pts })
      if (k === n - 1) break
      const p = pts[pts.length - 1]
      const cx = Math.floor(p[0] / cell)
      const cy = Math.floor(p[1] / cell)
      let bd = Infinity
      let bj = -1
      let be = 0
      for (let r = 0; r <= maxR; r++) {
        if (bj >= 0 && (r - 1) * cell > Math.sqrt(bd)) break
        for (let v = -r; v <= r; v++) {
          const step = Math.abs(v) === r ? 1 : 2 * r || 1
          for (let u = -r; u <= r; u += step) {
            for (const [m, e] of grid.get(key(cx + u, cy + v)) ?? []) {
              if (used[m]) continue
              const q = chains[m].pts[e ? chains[m].pts.length - 1 : 0]
              const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2
              if (d < bd) { bd = d; bj = m; be = e }
            }
          }
        }
      }
      j = bj
      rev = be === 1
    }
    return out
  }

  // Chains [{ pts, col }] into one <path> per palette colour. Each chain is one
  // relative move then relative steps (after an "m" more pairs are relative
  // lines, so no "l" is written), numbers joined without spaces before a minus.
  function chainsToPaths(chains, { k, width, opacity }) {
    if (!chains.length) return ''
    const q = o.res
    const { cents, lab } = palette(chains.map(c => c.col), Math.min(k, chains.length))
    const groups = cents.map(() => [])
    chains.forEach((c, j) => groups[lab[j]].push(c))
    const join = nums => nums.reduce((s, n, i) => s + (i && n >= 0 ? ' ' : '') + n, '')
    let svg = `<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${fmt(width * q)}" stroke-opacity="${fmt(opacity)}">`
    groups.forEach((g, c) => {
      if (!g.length) return
      g = o.order === 'nearest' ? orderNearest(g) : g.sort((a, b) => a.pts[0][1] - b.pts[0][1] || a.pts[0][0] - b.pts[0][0])
      let px = 0
      let py = 0
      let d = ''
      for (const ch of g) {
        const pts = ch.pts.map(p => [Math.round(p[0] * q), Math.round(p[1] * q)]).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1])
        const nums = [pts[0][0] - px, pts[0][1] - py]
        for (let i = 1; i < pts.length; i++) nums.push(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
        d += 'm' + join(nums) + (pts.length === 1 ? 'h0' : '')
        px = pts[pts.length - 1][0]
        py = pts[pts.length - 1][1]
      }
      svg += `<path stroke="${hex(cents[c])}" d="${d}"/>`
    })
    return svg + '</g>'
  }
  const compact = o.res !== 1 || o.order !== 'reading'
  const write = (strokes, opts) => (compact ? chainsToPaths(strokes.map(asLine), opts) : strokesToPaths(strokes, opts))

  // Underpainting: broad soft strokes along the grain. Dim places get a darker
  // colour rather than fewer strokes, so the edge fades instead of showing
  // round blobs.
  function underpaint({ step, len, r, minL }) {
    const list = []
    for (let y = step / 2; y < PH; y += step) for (let x = step / 2; x < PW; x += step) {
      const jx = x + rr(-step / 3, step / 3)
      const jy = y + rr(-step / 3, step / 3)
      const i = idx(i0(jx), i0(jy))
      const fade = Math.min(1, (Lwide[i] - minL) / (minL * 3))
      if (fade < 0.25) continue
      const a = grain(i)
      list.push([jx, jy, Math.cos(a) * len, Math.sin(a) * len, boost(colourAt(jx, jy, r), o.underSat, fade)])
    }
    return list
  }
  seed = o.underSeed
  const unders = o.under.map(underpaint)

  // Filaments: fine strokes where the photo has bright detail, along the grain.
  const f = o.fil
  seed = o.filSeed
  const filDim = []
  const filBright = []
  for (let y = 1; y < PH; y += f.step) for (let x = 1; x < PW; x += f.step) {
    const jx = x + rr(-f.jitter, f.jitter)
    const jy = y + rr(-f.jitter, f.jitter)
    const i = idx(i0(jx), i0(jy))
    if (Lwide[i] < f.minWide) continue
    const detail = L[i] - Lwide[i]
    const keep = detail * f.detailGain + L[i] * f.lumGain - f.bias
    if (rand() > keep) continue
    const a = grain(i) + rr(-f.turn, f.turn)
    const len = rr(f.len[0], f.len[1])
    const s = [jx, jy, Math.cos(a) * len, Math.sin(a) * len, boost(colourAt(jx, jy, 0), f.sat, f.gain)]
    ;(L[i] > f.brightL || detail > f.brightDetail ? filBright : filDim).push(s)
  }

  // Sparks: the brightest knots, as small dots.
  const sp = o.spark
  const spark = []
  for (let y = 2; y < PH - 2; y++) for (let x = 2; x < PW - 2; x++) {
    const i = y * PW + x
    if (L[i] < sp.minL || L[i] - Lwide[i] < sp.minDetail) continue
    let top = true
    for (let v = -2; v <= 2 && top; v++) for (let u = -2; u <= 2; u++) if (L[idx(x + u, y + v)] > L[i]) { top = false; break }
    if (top) spark.push([x, y, 0, 0, boost(colourAt(x, y, 0), sp.sat, sp.gain)])
  }

  const UNDER = unders.map((list, n) => write(list, o.under[n])).join('')
  let FIL
  let lines = null
  if (f.chain) {
    const dim = chainUp(filDim, f.chain)
    const bright = chainUp(filBright, f.chain)
    FIL = chainsToPaths(dim, f.dim) + chainsToPaths(bright, f.bright)
    lines = dim.length + bright.length
  } else {
    FIL = write(filDim, f.dim) + write(filBright, f.bright)
  }
  const SPARK = write(spark, sp)
  const count = unders.reduce((a, l) => a + l.length, 0) + filDim.length + filBright.length + spark.length
  // unit: scene units per written coordinate unit, for the group's scale.
  return { UNDER, FIL, SPARK, count, PW, PH, unit: 1 / o.res, lines, counts: { under: unders.map(l => l.length), dim: filDim.length, bright: filBright.length, spark: spark.length } }
}
