# Helix Nebula

The Helix Nebula (NGC 7293) in Aquarius, the nearest big planetary nebula: the shell of gas a dying star has blown off, seen almost face-on, so that it looks like a great eye. A deep red outer ring, a gold-and-teal inner ring and a blue-green centre with the star itself, a faint white dwarf, at its heart. It fills the RIGHT side of a black star field. It is traced from a real Hubble photograph into brush strokes, the same way as the Ring Nebula scene.

## The picture

- **Source:** the Hubble/Kitt Peak mosaic "Iridescent Glory of Nearby Helix Nebula" (released 9 May 2003).
  - Page: https://science.nasa.gov/asset/hubble/iridescent-glory-of-nearby-helix-nebula/
  - File used: NASA's largest JPEG of it, `https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2003/05/STScI-01EVVJWKRYYZQXFFJQAA0TBRRD.tif/jcr:content/renditions/16000x16000.jpg`, **16000 × 16000 pixels, 8.6 MB** (the page also lists the 286 MB TIFF it comes from, not used).
- **Credit (as the page gives it):** NASA, NOAO, ESA, the Hubble Helix Nebula Team, M. Meixner (STScI), and T.A. Rector (NRAO). (The first brief had a slightly different line, with C.R. O'Dell and P. McCullough; the page's own line is the one used.) NASA images are public domain; the credit stays with it anyway (README and here).
- **Kept where:** the original goes in `sources/helix-hubble-full.jpg`, which git ignores. `make-picture.cjs` crops it to x 0.143-0.883, y 0.16-0.84 of the picture (the nebula nearly fills that, with a margin of black sky), shrinks that to a 680 × 625 grid of colours, fades the edges to black and saves `helix-pixels.bin.gz` (555 KB). That small file is committed, so the scene builds without the original.
- **Colour:** the photo's own colours are close to the scene's palette, so the grade is gentle: it takes 12 off each channel (the photo's faint sky haze comes out black), applies a gamma of 0.9, and lifts the eye's dim blue and turns it a little towards teal (`TEAL` 0.45, `LIFT` 0.35 in `make-picture.cjs`). Without that the eye traced as dull navy.

## How it is drawn

As the Ring, with the same compact brushwork of session 6:

1. **Underpainting:** broad, faint strokes laying down the soft colour.
2. **Filaments:** continuous lines of relative steps that follow the photo's grain (`fil.chain`), `res: 2`, `order: 'nearest'`; a pixel of the grid is 1.43 scene units. About 21,000 spots in 4,500 lines; the filament step is 1.53 (the Ring needs 0.76): the Helix is the biggest nebula so far (about 780 units across) and the same budget of about 124,000 characters (the build allows 125,000 for a still drawing with a shader) is spread over more sky, so the brushwork is a little looser.
3. **Sparks:** the brightest points, as dots.
4. **Cometary knots:** the real Helix has thousands of small knots of gas along the inner rim of its ring, each a bright head with a tail pointing away from the star. The trace is too coarse to show them, so 56 are added in vectors (still): a tiny bright head and a faint tapering tail on the rim of the dark eye, one `<path>` of heads and one of tails.

Each palette colour is one `<path>`. The picture is 975 units wide and 895 tall, centred at x 1465, y 450 (the nebula itself about 780 × 700).

## What moves

The drawing is completely still (see the Ring's philosophy for why: anything changing in the SVG near thousands of traced strokes froze the app). A GPU shader written by `generators/lib/shader.mjs` plays all the motion over it:

- **Twinkling stars all over the sky**, mostly white, some yellow-white, white-blue and a few orange-gold, each dipping to about half and pulsing up brighter on its own cycle; about 33 bright cross stars spread over the sky, and a band of small stars hugging the nebula.
- **The clear zone** is an ellipse 395 × 355 units round the nebula (measured on a render: the traced nebula and its faint outer glow span about x 1090-1850, y 107-800).
- **The white dwarf** in the eye is a small still point and halo in the drawing, with a steady pale cross from the shader.
- **Four cross stars placed by hand:** a smaller golden-orange one at the top left (asked for by the person; a large golden one at the bottom left was removed), a larger faintly blue one at the top middle, a white and a slightly orange one on the middle left.
- **A slow comet** crosses the upper left of the sky every 241 s, well clear of the nebula.
- **Two shooting stars** fall on the left side of the sky, on 223 s and 289 s cycles.
- **Still, in the drawing:** about 460 faint stars, a faint far spiral galaxy (lower left) and four faint far galaxies on the left.

No filters or blend modes in the SVG. On the phone, under Reduce Motion, or where shaders don't play, the still drawing shows alone.

## Palette and mood

- **Sky:** true black (`#000`), and the frosted glass over it is tinted black too.
- **Nebula:** deep red-orange outer ring, gold and a warm grey-rose inner ring, a teal-blue eye, a white point. Dimmed to about 80 % because it sits behind text.
- **Theme:** accent gold `#e0b04a`, teal `#4fb0b0` as a second colour, near-black navy text panels.

It sits on the right, in the middle of that side (the plan had it on the left; the person said it could go at the middle of the right side). Its lower edge fades out about y 770, clear of the message box, and its right edge runs a little past the edge of a 16:10 window.
