# Scenes for Claude Code

Four animated backdrop themes for the Claude desktop and mobile apps, switched with one slash command.

- **Mars at dusk:** rust-dark ground with ancient rocks, a dusty horizon glow, and a twilight sky whose stars slowly turn.
- **Deep sea:** from the moonlit surface to the abyssal floor, with animals true to each depth that fade in and out: sardines, a turtle, a manta, lanternfish, an anglerfish, a vampire squid, a dumbo octopus and more. Now and then a kayaker paddles by overhead.
- **Rainforest:** a misty Southeast Asian understorey with dappled light, drifting mist, insects in the leaf litter, gibbons, an orangutan, a hornbill, and a tiger that stalks a troop of macaques, pounces and misses.
- **Blizzard:** a gloomy storm in a fog-bound pine forest, seen from among two snow-plastered trees. Snow falls at several depths while sheets of heavier snow sweep across, easing to flurries and thickening into gusts and whiteouts. Every few minutes a snowy owl glides in out of the storm, lands, dozes, blinks slowly and flies off again.

All four are dark themes, and only the backdrop moves. The animation is CSS only and pauses if your system asks for reduced motion.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install scenes --marketplace evillibrary/claude-scenes
```

Answer `y` to add the marketplace, then press Enter to install for your user.

From a shell:

```
claude plugin install scenes --marketplace evillibrary/claude-scenes
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `evillibrary/claude-scenes`, then **Add plugin**.

## Use

| Type | Does |
|---|---|
| `/scene` | Lists the scenes and marks the current one |
| `/scene mars` | Mars at dusk |
| `/scene deep` | Deep sea |
| `/scene rainforest` | Rainforest |
| `/scene blizzard` | Blizzard |
| `/scene next` | Moves to the next scene |

The session you type it in changes at once. New sessions open on the last scene you picked.

## Make your own scene

Every scene is drawn by a small generator script, and this repo comes with a Claude Code skill that knows how to write one.

1. Fork this repo and clone your fork.
2. Open the folder in Claude Code, in the desktop app or with `claude` in a terminal, and describe the scene you want. For example: "Add a scene of a lighthouse on a stormy coast at night, with a slow sweeping beam." The `scene-mods` skill loads when the task calls for it, or type `/scene-mods` to start with it.
3. Claude writes a design brief and a generator under `generators/<name>/`, builds the scene with `node build.mjs`, and checks it against the app's limits. It then helps you try it out in your app before you publish it to your fork.

The four scenes here are the worked examples. Their generators and design notes are in `generators/`. To change an existing scene, ask for the change; Claude edits its generator, never the generated file.

**Two limits matter more than anything else.** The desktop app stops a scene's animation if it is much over 110 000 characters, or if anything in it repeats faster than about once a second. `node build.mjs` checks both.

To publish your own copy: change `owner` and `name` in `.claude-plugin/marketplace.json`, and the install lines above, to your GitHub name and repo.
