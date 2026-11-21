// Makes generators/ring/ring-pixels.bin.gz, the small copy of the Hubble photo
// that the Ring Nebula scene is traced from, out of the full-size original in
// sources/ (git-ignored; see philosophy.md for where to download it). Only
// needed when the source picture should change: the scene's generator reads
// the committed .gz file, so a fresh copy of the repo builds without it.
//
//   node generators/ring/make-picture.cjs [size] [preview.jpg]
//
// The work is done by ../lib/make-pixels.cjs; this file holds the Ring's crop.
const path = require('path')
const makePixels = require('../lib/make-pixels.cjs')

makePixels({
  // NASA serves it as "ring-nebula-full_jpg-jpg.webp", but the file is a JPEG.
  src: path.join(__dirname, '../../sources/ring-hubble-2013-3179.jpg'),
  out: path.join(__dirname, 'ring-pixels.bin.gz'),
  // The whole ring and its faint outer halo, with a little sky round it, as
  // fractions of the 3179 x 3179 original.
  crop: { x: 0.05, y: 0.06, w: 0.9, h: 0.9 },
  // The ring is wider than it is tall and fills most of the crop, so the fade
  // only starts near the edge: full picture inside r0, black beyond r1
  // (fractions of half the width).
  fade: { r0: 0.9, r1: 1.12 },
  size: Number(process.argv[2] ?? 450),
  preview: process.argv[3],
}).catch(e => { console.error(e); process.exit(1) })
