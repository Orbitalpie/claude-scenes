// Makes generators/hourglass/hourglass-pixels.bin.gz, the small copy of the
// Hubble photo that the Hourglass Nebula scene is traced from, out of the
// full-size original in sources/ (git-ignored; see philosophy.md for where to
// download it). Only needed when the source picture should change: the scene's
// generator reads the committed .gz file, so a fresh copy of the repo builds
// without the original.
//
//   node generators/hourglass/make-picture.cjs [size] [preview.jpg]
//
// The work is done by ../lib/make-pixels.cjs; this file holds the crop.
const path = require('path')
const PINK = Number(process.env.PINK ?? 0.6)
const makePixels = require('../lib/make-pixels.cjs')

makePixels({
  src: path.join(__dirname, '../../sources/hourglass-hubble-full.jpg'),
  out: path.join(__dirname, 'hourglass-pixels.bin.gz'),
  // The photo is 2061 x 2557 (NASA's full-size file, with a caption below the
  // picture) and the nebula fills x 620-1472, y 333-1792 of it, centred at
  // (1046, 1062). Crop a margin of dark sky round it, centred on the same
  // point: x 501-1591, y 202-1922 (the picture ends at y 2042, above the caption).
  crop: { x: 501 / 2061, y: 202 / 2557, w: 1090 / 2061, h: 1720 / 2557 },
  // The nebula nearly fills the crop, so it fades out only in the last bit.
  fade: { x: { r0: 0.86, r1: 1.0 }, y: { r0: 0.9, r1: 1.02 } },
  // The photo's walls are orange-red and its eye green-cyan; the scene wants
  // pink-red walls (#e0607a) and a teal-blue eye (#5fb8c8). Lend strong reds a
  // share of blue (the dim olive haze between them, where red is no more than
  // green, is left alone), and take a little off every colour so the grainy
  // sky of the photo comes out black and the cyan a little more blue.
  grade: `r -= 12; g -= 12; b -= 12; return [r, g, b + (${PINK}) * Math.max(0, r - 1.05 * g) + 0.1 * g]`,
  size: Number(process.argv[2] ?? 350),
  preview: process.argv[3],
}).catch(e => { console.error(e); process.exit(1) })
