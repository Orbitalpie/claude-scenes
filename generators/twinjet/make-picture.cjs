// Makes generators/twinjet/twinjet-pixels.bin.gz, the small copy of the Hubble
// photo that the Twin Jet Nebula scene is traced from, out of the full-size
// original in sources/ (git-ignored; see philosophy.md for where to download
// it). Only needed when the source picture should change: the scene's
// generator reads the committed .gz file, so a fresh copy of the repo builds
// without the original.
//
//   node generators/twinjet/make-picture.cjs [size] [preview.jpg]
//
// The work is done by ../lib/make-pixels.cjs; this file holds the crop.
const path = require('path')
const makePixels = require('../lib/make-pixels.cjs')

makePixels({
  src: path.join(__dirname, '../../sources/twinjet-heic1518a.jpg'),
  out: path.join(__dirname, 'twinjet-pixels.bin.gz'),
  // The photo is 988 x 826 and the two lobes run right off its left and right
  // edges, across the middle band: keep the whole width and that band
  // (y 282 to 572 of 826). That leaves out the bright star with spikes above
  // the nebula (y 254), which the scene draws as a proper star instead.
  crop: { x: 0, y: 282 / 826, w: 1, h: 290 / 826 },
  // The lobes' open ends fade out softly (x), and the band's top and bottom
  // edges, which are dark sky, barely fade at all (y).
  fade: { x: { r0: 0.22, r1: 0.98 }, y: { r0: 0.92, r1: 1.02 } },
  size: Number(process.argv[2] ?? 700),
  preview: process.argv[3],
}).catch(e => { console.error(e); process.exit(1) })
