# Scenes for Claude Code

Three animated backdrop themes for the Claude desktop and mobile apps, switched with one slash command.

- **Mars at dusk:** rust-dark ground with ancient rocks, a dusty horizon glow, and a twilight sky whose stars slowly turn.
- **Deep sea:** from the moonlit surface to the abyssal floor, with animals true to each depth that fade in and out: sardines, a turtle, a manta, lanternfish, an anglerfish, a vampire squid, a dumbo octopus and more. Now and then a kayaker paddles by overhead.
- **Rainforest:** a misty Southeast Asian understorey with dappled light, drifting mist, insects in the leaf litter, gibbons, an orangutan, a hornbill, and a tiger that stalks a troop of macaques, pounces and misses.

All three are dark themes, and only the backdrop moves. The animation is CSS only and pauses if your system asks for reduced motion.

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
| `/scene next` | Moves to the next scene |

The session you type it in changes at once. New sessions open on the last scene you picked.
