# Ring Nebula

The Ring Nebula (M57) in Lyra, the glowing shell a dying Sun-like star has blown off, hanging in the upper left of a black star field. It is traced from a real Hubble photograph into brush strokes, the same way as the Crab Nebula scene.

## The picture

- **Source:** "Hubble Messier 57, The Ring Nebula", the Hubble image of the Ring released in May 2013 (also ESA/Hubble heic1310).
  - Page: https://science.nasa.gov/image-detail/ring-nebula-full_jpg/
  - Also shown at: https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-57/
  - File used: the 3179 × 3179 picture on that page, `https://science.nasa.gov/wp-content/uploads/2023/04/ring-nebula-full_jpg-jpg.webp`. Despite its name it is a JPEG.
  - The fallback was the 1998 Hubble Heritage image (https://science.nasa.gov/asset/hubble/the-ring-nebula-m57/), but the 2013 one is sharper and shows the whole ring with its faint outer halo.
- **Credit:** NASA, ESA and the Hubble Heritage (STScI/AURA)-ESA/Hubble Collaboration. As a NASA image it is in the public domain. Keep the credit anyway.
- **Kept where:** the original goes in `sources/ring-hubble-2013-3179.jpg`, which git ignores. `make-picture.cjs` crops it to the ring and a little sky, shrinks it to a 300-pixel grid of colours, fades it to black at the edges, and saves it as `ring-pixels.bin.gz`. That small file is committed, so the scene builds without the original.

## How it is drawn

The app draws no embedded pictures, so the photo is traced into brush strokes by the shared `generators/lib/trace.mjs`, as the Crab is:

1. **Underpainting:** broad, faint strokes that lay down the ring's soft colour: the red-orange rim, the green-gold band and the cyan-blue inside.
2. **Filaments:** thousands of short, fine strokes wherever the photo has detail, each laid along the photo's grain. In the Ring that grain runs round the ring, so the strokes follow its curve, and the dark knots in the rim show as gaps.
3. **Sparks:** the brightest points, as dots.

Each palette colour is one `<path>`. Since session 6 the filaments are continuous lines along the grain, traced from a 450-pixel grid: about 50,000 spots in 3,600 lines fit in about 124,000 characters (the build allows 125,000 for a still drawing with a shader).

## What moves

The drawing is completely still, and a GPU shader plays all the motion over it. This took several tries in the app (November 2026):

1. With stars twinkling on every side of the nebula, in the same SVG, the scene froze within seconds, even when each twinkling star group was kept clear of the nebula. The app seems to redraw one rectangle around everything that changes at once, and that rectangle covered the ~9,000 strokes.
2. With motion on one side only, it ran, but the person wanted twinkling everywhere.
3. With the moving stars in a second, see-through SVG laid on top, it froze again: the app redraws both.
4. With a `Shader` over a still `Svg` it ran fine with stars twinkling everywhere. The app draws the SVG once, and the shader adds its light on the graphics card. It can even draw over the nebula.

So `hooks/scene-<name>.ts` holds no animation at all, and `hooks/shader-<name>.ts` (written by `generators/lib/shader.mjs` from the options in `gen-scene.mjs`) holds all the motion. On the phone, under Reduce Motion, or where shaders don't play, the still drawing shows alone.

What the shader draws:

- **About 400 still stars** are in the drawing; the shader adds **345 twinkling small stars** all over the sky and **27 more** in a band hugging the ring (15 round its lower half, 4 up each side, 4 over the top).
- **The star look** (as the person asked for it): mostly white, some yellow-white, some white-blue and a few orange-gold. Stars never fade right out: each dips to about half and pulses up brighter, holding at its peak a while, on its own 3 to 9 s cycle. About 33 cross stars spread evenly over the sky in rows and columns, bright, with long spikes (15 to 45 points from the centre), drawn as small squares because a shader point can't be wider than 64 pixels.
- **Stars come right up to the nebula.** The zone kept clear of stars is fitted to the nebula's real outline, measured on a render, and a band of extra stars (`around`) hugs it. An oversized clear zone left an empty ring of sky round it.
- **Three stars placed by hand:** a larger slightly yellow one near the bottom left, a larger very faintly blue one near the top of the right half, and a medium yellowish one halfway down the right-hand side.
- **The white dwarf** at the ring's heart is a still point and halo in the drawing, with a steady pale blue-white cross from the shader over it.
- **A comet** crosses the upper right once every 241 s, fading in and out, its tail trailing back the way it came.
- **Two shooting stars** fall on the right side of the sky, on 197 s and 263 s cycles.
- **Still, in the drawing:** a tiny edge-on spiral galaxy just right of the ring, like IC 1296, which lies near M57 in wide photos, and four faint far galaxies.

No filters or blend modes in the SVG.

## Palette and mood

- **Sky:** true black (`#000`), and the frosted glass over it is tinted black too.
- **Ring:** the photo's own colours: a red-orange outer rim (`#c8553d`), a green-gold band, a cyan-blue inside (`#5fc8e0`) and a pale blue centre. Dimmed to about 80 % because it sits behind text.
- **Theme:** accent cyan `#5fc8e0`, the rim red `#c8553d` as a second colour, near-black navy text panels.

The ring sits in the upper left, centred at about x 475, y 330 and about 550 units across. (The plan said x 430 and 560 across, but then the left of the rim fell outside a 16:10 window, which shows only x 200 to 1800.) The middle and the bottom stay dark and calm, where the text and the message box sit.
