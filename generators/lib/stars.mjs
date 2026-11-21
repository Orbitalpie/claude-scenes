// Shared by the nebula scenes (crab, ring, ...): the star field around a heavy,
// still drawing. Not a scene: build.mjs skips this folder.
//
//   const STARS = starField({ rand, box: BOX, behind, moves: () => false, relocate, big: 0 })
//   // STARS.defs in <defs>, STARS.SMALL and STARS.MEDIUM in the picture,
//   // behind the nebula.
//
// The nebula scenes use it for their still stars only (moves: () => false):
// the twinkling ones, and the big cross stars, come from the GPU shader that
// ../lib/shader.mjs writes, because any change in the SVG near the nebula froze
// the app (November 2026). Its twinkle, layered and one-sided options are from
// the tries before that, kept for a lighter scene that animates its stars in CSS.
//
// - rand: the scene's seeded random function (set its seed first).
// - box: [x0, y0, x1, y1], the square the nebula's strokes fill.
// - behind(x, y): true where no star should be: the nebula and its glow,
//   fitted to its real outline (measure it on a render).
// - moves(x, y, pad): true where a star may twinkle in CSS.
// - relocate(): a new [x, y] for a big star that landed in the square.
// - small, medium, big: how many of each.
//
// Colours: mostly white, some yellow-white, about one in eight a white-blue and
// about one in ten a vivid orange-gold. Coloured dots are drawn a little larger
// and at full strength, and the big stars glow in their own colour. The
// brightest big stars carry a cross of light, like the spikes in telescope
// photos.

const i0 = n => Math.round(n)
const r1 = n => Math.round(n * 10) / 10

export const STAR_COLS = ['#f4f6ff', '#fff0c4', '#b4d0ff', '#ffa64d']
const WEIGHTS = [0.6, 0.17, 0.13, 0.1]
const GLOW = ['sh', 'shy', 'shb', 'sho']
const TW = [3.1, 3.7, 4.3, 4.7, 5.3, 5.9, 6.1, 6.7, 7.3, 7.9, 8.3, 8.9]

const grad = (id, col, a) => `<radialGradient id="${id}"><stop offset="0" stop-color="${col}" stop-opacity="${a}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient>`

export function starField({ rand, box, behind, moves, relocate, layered = false, small = 520, medium = 110, big = 18 }) {
  const rr = (a, b) => a + rand() * (b - a)
  const pick = weights => {
    let u = rand() * weights.reduce((a, b) => a + b, 0)
    for (let k = 0; k < weights.length; k++) if ((u -= weights[k]) < 0) return k
    return weights.length - 1
  }
  const inBox = (x, y, pad = 0) => x > box[0] - pad && x < box[2] + pad && y > box[1] - pad && y < box[3] + pad
  // In a layered scene the moving stars are a drawing of their own over the
  // still one, so they may twinkle anywhere, the nebula's square included.
  const held = (x, y, pad) => (layered ? false : inBox(x, y, pad)) || !moves(x, y, pad)

  // Small dots: one <path> per colour and twinkle cycle.
  function dotStars(n, width, opacity) {
    const buckets = {}
    for (let k = 0; k < n; k++) {
      const x = rand() * 2000
      const y = rand() * 1000
      const col = pick(WEIGHTS)
      let cls = rand() < 0.35 ? '' : `k${Math.floor(rand() * TW.length)}`
      if (behind(x, y)) continue
      // A star dot has some width, so keep a little margin.
      if (held(x, y, 3)) cls = ''
      const key = `${col}|${cls}`
      buckets[key] = (buckets[key] ?? '') + `M${i0(x)} ${i0(y)}h0`
    }
    const group = paths => (paths ? `<g fill="none" stroke-linecap="round" stroke-width="${width}" stroke-opacity="${opacity}">${paths}</g>` : '')
    let still = ''
    let moving = ''
    for (const [key, d] of Object.entries(buckets)) {
      const [col, cls] = key.split('|')
      const tint = col === '2' || col === '3' ? ` stroke-width="${width + 0.8}" stroke-opacity="1"` : ''
      const p = `<path d="${d}" stroke="${STAR_COLS[col]}"${tint}${cls ? ` class="${cls}"` : ''}/>`
      if (cls) moving += p
      else still += p
    }
    return { all: group(still + moving), still: group(still), moving: group(moving) }
  }
  const small_ = dotStars(small, 2, 0.85)
  const medium_ = dotStars(medium, 3, 1)

  // Big stars with a glow in their own colour; the brightest get a cross of
  // light: two thin tapering spikes, as in telescope photos.
  let bigStill = ''
  let bigMoving = ''
  for (let k = 0; k < big; k++) {
    let x = rr(60, 1940)
    let y = rr(30, 970)
    if (inBox(x, y, 16)) [x, y] = relocate()
    const c = pick(WEIGHTS)
    const r = rr(1.2, 1.8)
    const tw = Math.floor(rand() * TW.length)
    const X = i0(x)
    const Y = i0(y)
    let spikes = ''
    if (r > 1.45) {
      const L = i0(r * 9)
      const w = r1(r * 0.4)
      spikes = `<path d="M${X - L} ${Y}l${L}-${w} ${L} ${w}-${L} ${w}zM${X} ${Y - L}l${w} ${L}-${w} ${L}-${w}-${L}z" fill="${STAR_COLS[c]}" opacity=".6"/>`
    }
    const cls = held(x, y, 16) ? '' : ` class="k${tw}"`
    const g = `<g${cls}><circle cx="${X}" cy="${Y}" r="${r1(r * 5)}" fill="url(#${GLOW[c]})"/>${spikes}<circle cx="${X}" cy="${Y}" r="${r1(r)}" fill="${STAR_COLS[c]}"/></g>`
    if (cls) bigMoving += g
    else bigStill += g
  }

  const css =
    `@keyframes tw{0%,100%{opacity:1}50%{opacity:.12}}` +
    TW.map((s, k) => `.k${k}{animation:tw ${s}s ease-in-out infinite;animation-delay:-${r1((k * 2.3) % s)}s}`).join('') + '\n'
  // "sh" is the white glow, also used for shooting stars' heads.
  const defs = grad('sh', '#dfe8ff', '.75') + grad('shy', '#ffeab0', '.8') + grad('shb', '#a8c8ff', '.85') + grad('sho', '#ffa64d', '.85') + '\n'
  return {
    // One drawing: every star, in three layers.
    SMALL: small_.all,
    MEDIUM: medium_.all,
    BIG: bigStill + bigMoving,
    // Two drawings: the still stars, and the moving ones for a layer on top.
    STILL: { SMALL: small_.still, MEDIUM: medium_.still, BIG: bigStill },
    MOVING: small_.moving + medium_.moving + bigMoving,
    css,
    defs,
  }
}
