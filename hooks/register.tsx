import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE as MARS } from './scene-mars'
import { SCENE as DEEP } from './scene-deep-sea'
import { SCENE as RAIN } from './scene-rainforest'

// All the looks in one mod, switched with /scene. The choice is kept in the
// mod's store, so new sessions open on the last scene picked.

type Look = {
  name: string
  label: string
  svg: string
  alt: string
  look: ThemeSetArgs
  problems: readonly string[]
}

function look(
  name: string,
  label: string,
  svg: string,
  alt: string,
  roles: { accent: string; danger: string; success: string; warning: string; pro: string },
  anchors: { 'surface-0': string; 'text-primary': string } & Record<string, string>,
  tint: string,
  opacity: number,
): Look {
  const { theme, problems } = makeColors({ label, only: 'dark', roles, dark: { gray: { anchors } } })
  // A lighter frost than before (blur 18 -> 10) so more of the scene shows
  // through the middle panel.
  const set: ThemeSetArgs = { colors: theme, backdrop: { scene: name, glass: { blur: 10, tint, opacity } } }

  return { name, label, svg, alt, look: set, problems }
}

const LOOKS: Look[] = [
  look(
    'mars-dusk',
    'Mars at dusk',
    MARS,
    'A Martian dusk: rust ground, a dusty horizon glow and a slowly turning sky',
    { accent: '#d9783a', danger: '#d8404f', success: '#8fae5a', warning: '#e0a83a', pro: '#a586d9' },
    {
      'surface-0': '#130909', 'surface-1': '#1a0d0c', 'surface-2': '#211110', 'surface-3': '#281513',
      'text-primary': '#f5e8db', 'text-secondary': '#d9c3b0', 'text-muted': '#b89f8b',
    },
    '#140808',
    0.6,
  ),
  look(
    'deep-sea',
    'Deep sea',
    DEEP,
    'The ocean from the surface to the abyssal floor, with deep-sea animals slowly appearing and fading',
    { accent: '#3fc6d8', danger: '#e0566a', success: '#4fbf8f', warning: '#e2b44a', pro: '#9a7cf0' },
    {
      'surface-0': '#03070d', 'surface-1': '#070d16', 'surface-2': '#0b1320', 'surface-3': '#0f1828',
      'text-primary': '#e6f0f6', 'text-secondary': '#b5c7d4', 'text-muted': '#8ca3b4',
    },
    '#02060c',
    0.56,
  ),
  look(
    'rainforest',
    'Rainforest',
    RAIN,
    'A misty rainforest understorey where insects, gibbons, a hornbill and a stalking tiger come and go',
    { accent: '#8fcf6a', danger: '#e0574f', success: '#4fbfa0', warning: '#e3b13c', pro: '#b28be0' },
    {
      'surface-0': '#060a07', 'surface-1': '#0a100b', 'surface-2': '#0e160f', 'surface-3': '#131c14',
      'text-primary': '#e9efe2', 'text-secondary': '#c1ccb9', 'text-muted': '#98a690',
    },
    '#050906',
    0.56,
  ),
]

// Short names people may type.
const ALIASES: Record<string, string> = {
  mars: 'mars-dusk', dusk: 'mars-dusk', 'mars-dusk': 'mars-dusk',
  deep: 'deep-sea', sea: 'deep-sea', ocean: 'deep-sea', 'deep-sea': 'deep-sea',
  rainforest: 'rainforest', jungle: 'rainforest', forest: 'rainforest', rain: 'rainforest',
}
const DEFAULT = 'rainforest'
const find = (name: unknown) => LOOKS.find(l => l.name === name)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'scene',
      description: 'Switch the backdrop scene: mars, deep or rainforest (no name lists them)',
      argumentHint: '[mars|deep|rainforest|next]',
    })
    const chosen = find(await $.store.get('scene')) ?? find(DEFAULT)!
    const unpainted = chosen.problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(chosen.look)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const current = find(await $.store.get('scene')) ?? find(DEFAULT)!
    const word = e.args.trim().toLowerCase()
    const list = LOOKS.map(l => `${l.name === current.name ? '●' : '○'} ${l.label}`).join('\n')

    if (word === '') {
      return { text: `Scenes (/scene <name>, or /scene next):\n${list}` }
    }
    const target =
      word === 'next'
        ? LOOKS[(LOOKS.indexOf(current) + 1) % LOOKS.length]!
        : find(ALIASES[word])

    if (target === undefined) {
      return { text: `No scene called "${word}". Try mars, deep or rainforest.\n${list}` }
    }
    await $.store.set('scene', target.name)
    const set = await $.theme.set(target.look)

    return {
      text: set.isDrawn
        ? `Scene: ${target.label}. New sessions open on it too; other open sessions change when they restart.`
        : `Scene set to ${target.label}, but this surface can't draw it: ${set.reason}`,
    }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const chosen = find(e.props.scene)

    if (chosen === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={chosen.svg} alt={chosen.alt} isInteractive />
  })
}
