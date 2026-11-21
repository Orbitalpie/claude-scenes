# Scenes

A Claude Code plugin of animated backdrop scenes for the Claude desktop and mobile apps, switched with `/scene`.

- For any work on a scene (a new one, a change to one, or one that freezes), use the `scene-mods` skill in `.claude/skills/scene-mods/`. It explains the layout, the app's limits, and how to test and publish.
- Each scene's source is `generators/<name>/gen-scene.mjs`. `hooks/scene-*.ts` files are generated: never edit them by hand.
- `node build.mjs` regenerates every scene and checks them. Run it before committing.
- The nebula scenes (`ring`, `crab`, `twinjet`, `hourglass`, `helix`) are traced from photos into a completely still drawing, with a generated `hooks/shader-<name>.ts` playing all the motion; `generators/lib/` holds their shared code. See the "Nebula scenes" section of the skill. `hooks/shader-*.ts` files are generated too.
- Ask before pushing, or before changing the person's Claude settings.
