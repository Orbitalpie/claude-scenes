# Crab Nebula

The Crab Nebula (M1), the wreck of a star that exploded in 1054, hanging on the right of a dark star field. It is traced from a real photograph and gently brought to life.

## The picture

- **Source:** "A Giant Hubble Mosaic of the Crab Nebula", released 1 December 2005.
  - Page: https://science.nasa.gov/asset/hubble/a-giant-hubble-mosaic-of-the-crab-nebula/
  - Also at: https://hubblesite.org/contents/media/images/2005/37/1823-Image.html
  - File used: the 3864 × 3864 JPEG rendition on that page (`.../STScI-01EVT7YTWSRJ9Y430R55VM6TP6.tif/jcr:content/renditions/3864x3864.jpg`).
- **Credit:** NASA, ESA, J. Hester and A. Loll (Arizona State University). As a NASA image it is in the public domain. Keep the credit anyway.
- **Kept where:** the original goes in `sources/crab-hubble-3864.jpg`, which git ignores. `make-picture.cjs` shrinks it to a 400-pixel grid of colours, faded to black at the edges, in `crab-pixels.bin.gz`. That small file is committed, so the scene builds without the original.

## Why it is traced, not embedded

The plan was to embed the photo as a base64 JPEG. In November 2026 the desktop app drew none of it: no `<image>` at all, at any size, as JPEG or PNG, with `href` or `xlink:href`. Vector shapes in the same test drew fine. So the generator traces the photo instead, in three layers of round-capped strokes:

1. **Underpainting:** broad, faint strokes in two sizes that lay down the nebula's soft colour.
2. **Filaments:** (since session 6, continuous lines of about 22,000 spots, traced from a 600-pixel grid, filling about 124,000 characters; before that a few thousand short strokes) fine strokes wherever the photo has bright detail. Each one lies along the photo's own grain, the direction its threads run, worked out from the brightness (a structure tensor). They come in a dim set and a bright set.
3. **Sparks:** the brightest knots, as dots.

Each layer's colours are reduced to a small palette (k-means), and each palette colour is one `<path>`. The result reads like a painting of the photograph: the true outline, threads and colours, in brush strokes.

## What moves

The drawing is completely still, and a GPU shader plays all the motion over it. This took several tries in the app (November 2026):

1. With stars twinkling on every side of the nebula, in the same SVG, the scene froze within seconds, even when each twinkling star group was kept clear of the nebula. The app seems to redraw one rectangle around everything that changes at once, and that rectangle covered the ~9,000 strokes.
2. With motion on one side only, it ran, but the person wanted twinkling everywhere.
3. With the moving stars in a second, see-through SVG laid on top, it froze again: the app redraws both.
4. With a `Shader` over a still `Svg` it ran fine with stars twinkling everywhere. The app draws the SVG once, and the shader adds its light on the graphics card. It can even draw over the nebula.

So `hooks/scene-<name>.ts` holds no animation at all, and `hooks/shader-<name>.ts` (written by `generators/lib/shader.mjs` from the options in `gen-scene.mjs`) holds all the motion. On the phone, under Reduce Motion, or where shaders don't play, the still drawing shows alone.

What the shader draws:

- **About 400 still stars** are in the drawing; the shader adds **345 twinkling small stars** all over the sky and **23 more** in a band hugging the nebula (15 round its lower half, 4 up each side).
- **The star look** (as the person asked for it): mostly white, some yellow-white, some white-blue and a few orange-gold. Stars never fade right out: each dips to about half and pulses up brighter, holding at its peak a while, on its own 3 to 9 s cycle. About 33 cross stars spread evenly over the sky in rows and columns, bright, with long spikes (15 to 45 points from the centre), drawn as small squares because a shader point can't be wider than 64 pixels.
- **Stars come right up to the nebula.** The zone kept clear of stars is fitted to the nebula's real outline, measured on a render, and a band of extra stars (`around`) hugs it. An oversized clear zone left an empty ring of sky round it.
- **Three stars placed by hand,** mirroring the Ring's: a larger slightly yellow one under the nebula, a larger very faintly blue one near the top of the left half, and a medium yellowish one halfway down the left-hand side.
- **The pulsar** at the heart is a still blue-white point and glow in the drawing, with a steady cross from the shader over it. (It once pulsed every 1.7 s and sent out rings, in the SVG; in daily use that froze the app.)
- **Two shooting stars** cross the upper left, far from the nebula, on 197 s and 263 s cycles.
- **Still, in the drawing:** the soft halo, the blue-white core glow, and four faint far galaxies at the upper left. The planned slow drift and breathing glow both froze the app, so the nebula itself holds still.

No filters or blend modes in the SVG.

## Palette and mood

- **Sky:** true black (`#000`), and the frosted glass over it is tinted black too.
- **Nebula:** the photo's own colours, which come out as orange-red filaments (`#d9653a`), greens, and a blue-white core (`#9ec8ff`). Dimmed to 82 % because it sits behind text.
- **Theme:** accent orange-red `#d9653a`, the core blue `#9ec8ff` as a second colour, dark navy text panels.

The middle and the bottom stay dark and calm, where the text and the message box sit. The nebula's centre is at about x 1450, y 380, and it spans about 760 units.
