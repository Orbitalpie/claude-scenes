// Makes generators/helix/helix-pixels.bin.gz, the small copy of the Hubble
// photo that the Helix Nebula scene is traced from, out of the full-size
// original in sources/ (git-ignored; see philosophy.md for where to download
// it). Only needed when the source picture should change: the scene's generator
// reads the committed .gz file, so a fresh copy of the repo builds without it.
//
//   node generators/helix/make-picture.cjs [size] [preview.jpg]
//
// The work is done by ../lib/make-pixels.cjs; this file holds the crop.
const path = require('path')
const makePixels = require('../lib/make-pixels.cjs')
const TAKE = Number(process.env.TAKE ?? 12)
const GAMMA = Number(process.env.GAMMA ?? 0.9)
const TEAL = Number(process.env.TEAL ?? 0.45)
const LIFT = Number(process.env.LIFT ?? 0.35)

makePixels({
  src: path.join(__dirname, '../../sources/helix-hubble-full.jpg'),
  out: path.join(__dirname, 'helix-pixels.bin.gz'),
  // The photo is 16000 x 16000. The nebula (its bright ring; the faint outer arc
  // on the left hardly shows) fills about x 0.22-0.81, y 0.24-0.76 of it, centred
  // near (0.51, 0.50). Crop a margin of dark sky round that.
  crop: { x: 0.143, y: 0.16, w: 0.74, h: 0.68 },
  // The nebula nearly fills the crop; it fades out in the last part of each side.
  fade: { x: { r0: 0.88, r1: 1.0 }, y: { r0: 0.84, r1: 1.0 } },
  // Take a little off every colour, so the photo's faint sky haze comes out
  // black, lift the dim blue of the eye (a gamma), and turn that blue a little
  // towards the scene's teal.
  grade: `const f = c => 255 * Math.pow(Math.max(0, c - ${TAKE}) / 255, ${GAMMA}); r = f(r); g = f(g); b = f(b); const up = ${LIFT} * Math.max(0, b - r); return [r, g + up + ${TEAL} * Math.max(0, b - g), b + up]`,
  size: Number(process.argv[2] ?? 680),
  preview: process.argv[3],
}).catch(e => { console.error(e); process.exit(1) })
