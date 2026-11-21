// Makes generators/crab/crab-pixels.bin.gz, the small copy of the NASA photo
// that the Crab Nebula scene is traced from, out of the full-size original in
// sources/ (git-ignored; see philosophy.md for where to download it). Only
// needed when the source picture should change: the scene's generator reads
// the committed .gz file, so a fresh copy of the repo builds without it.
//
//   node generators/crab/make-picture.cjs [size] [preview.jpg]
//
// The work is done by ../lib/make-pixels.cjs; this file holds the Crab's crop.
const path = require('path')
const makePixels = require('../lib/make-pixels.cjs')

makePixels({
  src: path.join(__dirname, '../../sources/crab-hubble-3864.jpg'),
  out: path.join(__dirname, 'crab-pixels.bin.gz'),
  // The whole nebula with a little sky round it, as fractions of the original.
  crop: { x: 0.0, y: 0.02, w: 0.98, h: 0.96 },
  // Full picture inside r0, black beyond r1 (fractions of half the width).
  fade: { r0: 0.66, r1: 1.02 },
  size: Number(process.argv[2] ?? 600),
  preview: process.argv[3],
}).catch(e => { console.error(e); process.exit(1) })
