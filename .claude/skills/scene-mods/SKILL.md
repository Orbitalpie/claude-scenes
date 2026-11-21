---
name: scene-mods
description: Make, change or fix an animated backdrop scene in this scenes repo, the Claude Code mod switched with /scene. Use when someone wants a new scene, changes to a scene's look, creatures or motion, or when a scene freezes or stops moving in the Claude desktop or mobile app.
---

# Scene mods

A scene is one SVG string that the Claude desktop and mobile apps draw as the backdrop behind the conversation. This repo is a Claude Code plugin that carries several scenes and switches between them with `/scene`. Use this skill with the built-in `plugin-authoring` skill, which covers the mod API in general. This skill covers scenes.

Ask the person before you push to GitHub or change their Claude settings.

## The repo

| Path | What it is |
|---|---|
| `generators/<name>/gen-scene.mjs` | Writes `hooks/scene-<name>.ts`, which holds `export const SCENE = "<svg ...>"`. Edit the generator, never the generated file. |
| `generators/<name>/philosophy.md` | The scene's design brief, where there is one. Keep it true to the scene. |
| `build.mjs` | Runs the generators and checks every scene against the limits below. Use `node build.mjs`, or `node build.mjs <name>` for one scene. |
| `hooks/register.tsx` | Each scene's look (theme colours, alt text, and the frosted `glass` over it behind the text), the `/scene` command, and its aliases. |
| `.claude-plugin/plugin.json` | The plugin's name and version. |
| `.claude-plugin/marketplace.json` | Lets people install the plugin straight from this repo. |
| `README.md` | What people see on GitHub, including the list of scenes and `/scene` names. |

The generators are the worked examples. Read one that is close to what you want before you start a new scene:
- **`deep-sea`:** small and readable.
- **`mars-dusk`:** a calm sky and land.
- **`rainforest`:** many creatures, each on its own cycle.
- **`blizzard`:** weather in layers, plus one creature that acts out a story on a long timeline.
- **`library`:** light baked into the drawing, and a jointed creature whose arms are posed by inverse kinematics from where its hands must be. Every second visit it is drawn mirrored, on the other side of the text.

`hooks/register.tsx` and `README.md` have Windows (CRLF) line endings. Keep them: a script that matches `\n` misses, and `sed -i` in Git Bash quietly turns them into LF.

## Making a scene

1. **Write the brief first.** Put it in `generators/<name>/philosophy.md`: what the scene is, what moves, the palette and the mood. Scenes sit behind text, so they should be calm and dark, and hold back.
2. **Copy the shape of an existing generator:**
   - A seeded random function, so every run gives the same picture.
   - `viewBox="0 0 2000 1000"` and `preserveAspectRatio="xMidYMid slice"`, so it fills any window.
   - CSS animation only, inside the SVG's own `<style>`. There are no scripts and no external files.
   - `@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}`.
   - It writes `hooks/scene-<name>.ts`.
3. **Register it.**
   - Add a `look(...)` entry and its aliases to `hooks/register.tsx`.
   - Add it to the `/scene` description, the argument hint and the "no scene called" message.
   - Add it to the README and both descriptions in `.claude-plugin/`.
4. **Build and check** with `node build.mjs`, then render it (see below). Test it in the app before you publish.

## The app's limits

The engine accepts scenes up to 131 072 characters, but the desktop app is stricter. Tests in November 2026 found two limits. Break either one and the whole scene stops moving, usually within 30 seconds. Browser renders do **not** show this freeze; only the app does.

1. **Size:** keep each scene under 110 000 characters. Scenes from about 112 000 up froze.
2. **Speed:** nothing may repeat faster than about once a second. Keep every animation's duration at 1.3 s or longer.
   - Hidden fast motion counts too: `steps()` with many steps, or keyframes that flick back and forth within a long cycle.
   - Fast wings and tails are the usual offenders. Slow them down. If they only ever read as a blur, hold them still.

`build.mjs` runs `scripts/check-scene.mjs`, which catches both. The limits may change as the app changes. If a scene freezes within them, find the cause (see Testing) and update this section.

## Nebula scenes traced from photographs

`ring`, `crab`, `twinjet`, `hourglass` and `helix` are built from real space-telescope photos, and differ from the animated scenes above:

- **No embedded pictures.** The desktop app draws no `<image>` (not even base64). A photo is shrunk to a grid of colours at build time (`generators/lib/make-pixels.cjs`, run from each scene's `make-picture.cjs`, from the full-size original in the git-ignored `sources/`) and traced into brush strokes by `generators/lib/trace.mjs`. Read `generators/ring/gen-scene.mjs` for the knobs.
- **A completely still drawing, a shader for all the motion.** In November 2026 the app froze whenever anything in the SVG changed near thousands of traced strokes (a drift, a breathing glow, a pulsing star, stars twinkling nearby, even a second see-through SVG on top). A `Shader` over a still `Svg` ran fine, so `generators/lib/shader.mjs` writes `hooks/shader-<name>.ts` (twinkling stars, cross stars, comet, shooting stars) and `hooks/register.tsx` draws `<Shader module="./shader-<name>.ts"><Svg .../></Shader>`. On the phone, or under Reduce Motion, the still drawing shows alone.
- **A bigger size limit.** The 110 000-character limit above was found with animated scenes. A still drawing with a `shader-<name>.ts` beside it may be 125 000 characters (the app refuses any single Svg over 131 072); `check-scene.mjs` applies that, and fails such a scene if its SVG animates.
- `generators/lib` is shared code, not a scene: `build.mjs` skips it.

## Motion that reads well and stays within the limits

- **Weather and light:** give each layer its own breathing cycle, each a different prime number of seconds long. The cycles rarely line up, so the scene keeps changing.
- **A creature's story** (arrive, act, leave): put it on one long cycle of a few minutes. Write each moment as a keyframe at `seconds / cycle * 100%`. Pass the start delay in a custom property such as `--d`, so copies can take turns.
- **Big gestures:** a wingbeat is one slow keyframed stroke of a second or more, not a fast infinite loop.
- **Parts that belong to one pose:** fade them in and out with that pose. For example, folded wings shouldn't show while the wings are spread.
- **Jointed creatures:** nest one group per joint, each with a fixed `transform` attribute (where the joint sits) wrapping an inner group whose CSS animates `rotate`. A CSS `transform` replaces the element's own `transform` attribute, so never put both on one element. Work out the angles in the generator: decide where the hands or feet must be at each moment, and solve the two-bone inverse kinematics for each limb. The `library` generator has an `ik()` to copy.
- **A visit on both sides:** rather than a second creature, wrap the one creature in a group that switches to `translate(2000px,0) scale(-1,1)` while it is out of sight. The joints' keyframes then serve both visits.

## Making room

- **Thin by count, not by chance.** Still make every random draw, then skip every second or third item. Then the rest of the picture keeps its place, because the random numbers come from one shared sequence: one extra or missing draw reshuffles everything after it.
- **Write paths as relative steps** (`l`, `q`). They're shorter than absolute coordinates and draw the same shape.
- **Reuse static shapes** with `<symbol>` and `<use>`. Keep animated parts inline, so their CSS and custom properties reach them. A limb's drawing doesn't move inside its own joint group, so it can be a symbol even though the joint animates: the `library` orangutan's arms and legs are each drawn once and used twice.
- **Bake light in.** For lamplight or shade that doesn't move, work out each shape's light level when the scene is built and round it to a few levels. Then every colour at each level shares one `<path>`. That is far smaller than drawing a light overlay, and costs the app nothing to animate.
- **Give new art its own seed, then restore the old one**, so adding something doesn't move what's already there:

  ```js
  const keep = seed
  seed = 4242
  // ...new art...
  seed = keep
  ```

## Drawing rules

- **Give each overlapping shape its own `<path>`.** Overlapping outlines in one path can cancel each other's fill and show what's behind. Layer them in order: twigs, then branches, then the trunk. Many small shapes all wound the same way, such as locks of hair, can share a path, but not a path with the outline they hang from.
- **Clip fine detail to its outline.** Strands of hair or fur that run past a silhouette make it look spiky. Draw them inside a `<clipPath>` that `<use>`s the outline, so the shape isn't repeated.
- **Draw soft edges, like snow, moss and mist, as curves through midpoints**, and taper each patch to nothing at both ends. Straight segments with blunt ends look blocky.
- **Shade with `gradientUnits="userSpaceOnUse"`** when separate shapes must match, like a face and the lids over its eyes.
- **Keep the subject away from the middle and the foot**, where the text and the message box sit. A 16:10 window shows roughly x 200 to 1800 of the 2000-wide view, and a wide window crops the top and bottom.

## Checking the look

`scripts/render.cjs` screenshots a scene at chosen moments.

```bash
node .claude/skills/scene-mods/scripts/render.cjs hooks/scene-<name>.ts <out-folder> <shots.json>
```

- **What it needs:** `playwright-core` (`npm i -D playwright-core`, or set `PLAYWRIGHT_CORE` to an installed copy) and a Chromium-based browser: Edge, Chrome or Playwright's own Chromium. Set `SCENE_BROWSER` to `msedge`, `chrome` or `chromium` to choose one.
- **The shots file:** `shots.json` is a list of `{ "name", "t", "w"?, "h"?, "clip"? }` entries.
  - `t` is the number of seconds into the animation.
  - `clip` is a crop `[x, y, w, h]` in the scene's 2000×1000 units.
- **Sizes:** render at 1440×900 for a 16:10 window, and crop at 3200×1600 to look closely. Compare before and after at the same `t`.

## Testing in the app

Only the app shows the freezes, so test there. Add one thing at a time, and watch each step for about three minutes.

1. **Make sure only one mod draws the backdrop.** Two backdrop mods fight over the screen. Turn off any installed copy of `scenes` (or another theme mod) while you test. Use `/plugin`, or `enabledPlugins` in `~/.claude/settings.json`. Ask the person first, and turn it back on afterwards.
2. **Run your working copy.**
   - **In a terminal:** start Claude Code with `claude --plugin-dir <this repo>`.
   - **In the desktop app:** load the `plugin-authoring` skill, which names a hot-reload folder for the session. In it, make a small test mod, for example `library-test/`, holding:
     - `.claude-plugin/plugin.json`;
     - `hooks/hooks.json`;
     - a copy of `hooks/make-colors.*`;
     - `hooks/scene.ts` (a copy of the scene);
     - a short `hooks/register.tsx` that calls `$.theme.set` with `backdrop: { scene: '<name>-test', glass }` at `session.start`, and draws the scene in a `ui.render` hook on `Backdrop`, as `register.tsx` here does.

     The person is asked once to turn the session's mods on. After that the mod loads, and reloads after each change, when your turn ends. In November 2026 no app restart was needed.
3. **Bring the parts in one stage at a time.** Write the test copy of the scene from the built one with a CSS rule that hides the parts not yet tested, such as `.ape,.magic{display:none}`, put just before `@media`. Start with the still scene and its lightest motion, then add one moving part per stage, and ask the person to watch each stage for about three minutes. A small script that writes stage N keeps this quick.
4. **Afterwards,** delete the test mod and turn the installed scenes back on.
5. **If it freezes, change one thing at a time to find out why.**
   - Hide a part with `display="none"`: the scene is the same size but draws less. That separates size from drawing cost.
   - Stop a single animation. That shows whether one motion is the trigger.
   - Draw an older scene that used to run through the same mod. That shows whether the app has changed.

## Publishing

1. **Bump `version`** in `.claude-plugin/plugin.json`. Installed copies only update when it changes.
2. **Run `node build.mjs`**, then `claude plugin validate .`. Use a Claude Code version at least as new as the app. An older CLI may reject hooks the app accepts. The desktop app keeps its own up-to-date `claude` in its data folder, if the one on your PATH is behind.
3. **Commit, and push** after the person agrees. Anyone who installed from the repo then runs `claude plugin update scenes@<marketplace>`, or updates from the app's plugin settings, and restarts the app.

## Your own copy

To publish your own scenes:
1. Fork this repo.
2. Change `owner` and `name` in `.claude-plugin/marketplace.json`.
3. Change the install lines in the README to your GitHub name and repo.

People then install from `<your-name>/<your-repo>`.
