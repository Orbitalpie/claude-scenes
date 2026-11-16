// Generates hooks/scene-deep-sea.ts for the scenes mod: the deep-sea backdrop as one SVG string.
// Run from the repo root: node generators/deep-sea/gen-scene.mjs (or node build.mjs for all).
// An optional path argument writes somewhere else instead.
//
// The water column from the surface (top of the app) to the abyssal floor
// (bottom). Each zone holds animals that really live at that depth. Every
// animal has its own long cycle (prime-ish lengths, random offsets), so they
// seem to come and go at random: fade in, drift a little, fade out.
import { writeFileSync } from 'node:fs'

const out = process.argv[2] ?? new URL('../../hooks/scene-deep-sea.ts', import.meta.url)
const W = 2000
const H = 1000
const SURFACE = 60

let seed = 1912
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const r1 = n => Math.round(n * 10) / 10
const pick = a => a[Math.floor(rand() * a.length)]

// Cycle lengths in seconds. An animal is seen for about a third of its cycle.
const CYCLES = [67, 71, 79, 83, 89, 97, 101, 107, 113, 127, 131, 139]

// Every animal is drawn this much bigger, and moves this much faster.
const SIZE = 1.3
const SPEED = 1.1

// Brighter animals: lift each colour and each opacity in a drawing.
function brighten(src) {
  return src
    .replace(/#([0-9a-f]{6})\b/gi, (_, hex) => {
      const c = [0, 2, 4].map(i => Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * 1.45 + 8)))
      return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`
    })
    .replace(/(fill|stroke)-opacity="([\d.]+)"/g, (_, k, v) => `${k}-opacity="${Math.min(1, r1(Number(v) * 1.45 * 100) / 100)}"`)
}

// One animal: placed at (x, y), sized and faced, fading in and out on its own
// cycle while it drifts. `drift` names a keyframe set below.
function animal(x, y, body, { s = 1, flip = false, drift = 'dR', cycle, vis = 'ap', rot = 0, raw = false } = {}) {
  const dur = Math.round((cycle ?? pick(CYCLES)) / SPEED)
  const delay = -Math.round(rand() * dur)
  const anim = drift ? `${vis} ${dur}s ${delay}s infinite,${drift} ${dur}s ${delay}s linear infinite` : `${vis} ${dur}s ${delay}s infinite`
  const k = raw ? s : s * SIZE
  const face = `${rot ? `rotate(${rot}) ` : ''}scale(${r1((flip ? -k : k) * 100) / 100} ${r1(k * 100) / 100})`
  return `<g transform="translate(${r1(x)} ${r1(y)})"><g class="a" style="animation:${anim}"><g transform="${face}">${raw ? body : brighten(body)}</g></g></g>`
}

// A group of one symbol, scattered in a loose oval, each member bobbing a little
// and beating its tail out of step with the others (--d feeds the symbol's own
// animation delays).
function group(sym, n, rx, ry, { size = 1, sizeJit = 0.25 } = {}) {
  let g = ''
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2
    const d = Math.sqrt(rand())
    const x = Math.cos(a) * rx * d
    const y = Math.sin(a) * ry * d
    const k = size * (1 - sizeJit / 2 + rand() * sizeJit)
    g += `<g transform="translate(${r1(x)} ${r1(y)}) scale(${r1(k * 10) / 10})"><use href="#${sym}" class="bob" style="animation-delay:${-r1(rand() * 6)}s;--d:${-r1(rand() * 3)}s"/></g>`
  }
  return g
}

// A part that swings about a hinge point (its local px), e.g. a fin or a fluke.
const hinge = (cls, x, y, body, delay = 0) =>
  `<g class="${cls}" style="transform-origin:${x}px ${y}px${delay ? `;animation-delay:${delay}s` : ''}">${body}</g>`

// ---------- Animal drawings: each faces right, centred on its origin ----------

// Sunlit zone
// Turtle: front flippers sweep in turn, back flippers paddle gently.
const TURTLE = `<g fill="#0a2233" stroke="#4b93b3" stroke-opacity=".45" stroke-width="1">
${hinge('finA', 14, -10, '<path d="M12 -12 Q30 -44 46 -48 Q34 -28 22 -8Z"/>')}${hinge('finB', 14, 10, '<path d="M12 12 Q30 44 46 48 Q34 28 22 8Z"/>')}
${hinge('finB', -22, -8, '<path d="M-22 -12 Q-36 -24 -42 -20 Q-36 -10 -26 -5Z"/>', -1.5)}${hinge('finA', -22, 8, '<path d="M-22 12 Q-36 24 -42 20 Q-36 10 -26 5Z"/>', -1.5)}
<ellipse cx="36" cy="0" rx="11" ry="7"/><ellipse rx="31" ry="21"/>
<path d="M-18 -8 L0 -14 L18 -8 L18 8 L0 14 L-18 8Z M0 -14 V14" fill="none" stroke-opacity=".25"/></g>`

// Manta: wings flap slowly, the tail trails and sways.
const MANTA = `<g fill="#081d2c" stroke="#4b93b3" stroke-opacity=".4"><g class="flap"><path d="M40 0 Q22 -16 -8 -82 Q-14 -40 -30 -10 L-36 0 L-30 10 Q-14 40 -8 82 Q22 16 40 0Z"/></g>
<path d="M38 -5 Q52 -10 50 -2Z M38 5 Q52 10 50 2Z"/>${hinge('sway', -36, 0, '<path d="M-36 0 L-110 1" fill="none" stroke="#0b2738" stroke-width="2" stroke-opacity="1"/>')}</g>`

// Moon jelly: the bell pulses, the tentacles trail and sway behind it.
const JELLY = `<g class="pulse"><path d="M-22 0 Q-22 -24 0 -24 Q22 -24 22 0 Q11 -4 0 -2 Q-11 -4 -22 0Z" fill="#bfe6f5" fill-opacity=".22" stroke="#d8f2ff" stroke-opacity=".5"/>
<g fill="none" stroke="#e6c7ef" stroke-opacity=".45"><circle cx="-7" cy="-11" r="3.5"/><circle cx="7" cy="-11" r="3.5"/><circle cx="0" cy="-16" r="3.5"/><circle cx="0" cy="-6" r="3.5"/></g></g>
<g class="tent" style="transform-origin:0 0"><g fill="none" stroke="#cfeaf5" stroke-opacity=".28" stroke-width=".8"><path d="M-18 -1 q-4 20 1 42"/><path d="M-8 -2 q3 24 -2 50"/><path d="M4 -2 q-4 22 2 46"/><path d="M16 -1 q4 18 -1 38"/></g></g>`

// Small schooling fish: the tail beats about its root, each fish in its own time.
const SARDINE = `<path d="M17 0 Q6 -6 -9 -2 L-9 2 Q6 6 17 0Z" fill="#7fa9c0" fill-opacity=".42"/>
<g class="tail" style="transform-origin:-8px 0"><path d="M-8 -2 L-17 -7 L-15 0 L-17 7 L-8 2Z" fill="#7fa9c0" fill-opacity=".38"/></g>`

// Sperm whale: the flukes beat slowly up and down, the flipper rows.
const WHALE = `<g fill="#061724" stroke="#3a7c99" stroke-opacity=".35" stroke-width="1.2">
${hinge('fluke', -108, 0, '<path d="M-106 -4 L-150 -22 L-142 0 L-150 22 L-106 4Z"/>')}
<path d="M130 -8 Q133 -32 98 -33 L10 -28 Q-60 -22 -112 -4 L-112 4 Q-60 22 10 25 L96 26 Q132 26 130 8Z"/>
<path d="M120 12 L40 18" fill="none"/>${hinge('finA', 54, 22, '<path d="M60 22 Q50 42 30 46 Q40 32 44 22Z"/>')}</g>
<circle cx="96" cy="-6" r="2" fill="#3a7c99" fill-opacity=".5"/>`

// Twilight zone
const LANTERN = `<path d="M15 0 Q6 -6 -8 -2 L-8 2 Q6 6 15 0Z" fill="#11243a"/>
<g class="tail" style="transform-origin:-7px 0"><path d="M-7 -2 L-15 -6 L-13 0 L-15 6 L-7 2Z" fill="#11243a"/></g>
<g fill="#7fe8ff"><circle cx="8" cy="2.6" r=".9"/><circle cx="3" cy="3.2" r=".9"/><circle cx="-2" cy="3" r=".9"/><circle cx="-7" cy="2" r=".9"/><circle cx="11" cy="-1" r="1.4" fill-opacity=".8"/></g>`

const HATCHET = `<path d="M11 -2 Q5 -10 -6 -7 L-10 -3 L-10 3 Q-2 11 6 7 Q11 3 11 -2Z" fill="#3d5a70" fill-opacity=".45"/>
<g class="tail" style="transform-origin:-9px 0"><path d="M-9 -3 L-15 -6 L-14 0 L-15 5 L-9 3Z" fill="#3d5a70" fill-opacity=".4"/></g>
<g fill="#8ad8ff"><circle cx="4" cy="6" r=".8"/><circle cx="0" cy="7" r=".8"/><circle cx="-4" cy="6" r=".8"/></g><circle cx="7" cy="-2" r="2" fill="#cfe9f5" fill-opacity=".5"/>`

// Firefly squid: the arms trail and flex behind the mantle.
const SQUID = `<g class="tail" style="transform-origin:-10px 0"><path d="M-10 -1 L-18 -3 M-10 0 L-20 0 M-10 1 L-18 3" fill="none" stroke="#2a4458" stroke-width="1"/></g><path d="M16 0 L2 -4 Q-6 -4 -10 -1" fill="none" stroke="#2a4458" stroke-width="1"/>
<path d="M16 0 L2 -4 Q-6 -4 -9 0 Q-6 4 2 4Z" fill="#1a2c3c"/>
<circle cx="-4" cy="0" r="7" fill="url(#gB)" class="tw"/><g fill="#7cc8ff"><circle cx="-19" cy="-3" r="1.2"/><circle cx="-20" cy="0" r="1.2"/><circle cx="-19" cy="3" r="1.2"/><circle cx="6" cy="0" r=".9"/></g>`

function siphonophore() {
  let d = 'M0 0'
  let s = ''
  for (let i = 1; i <= 16; i++) {
    const x = -i * 17
    const y = Math.sin(i * 0.6) * 8
    d += ` L${x} ${r1(y)}`
    s += `<g transform="translate(${x} ${r1(y)})"><circle r="9" fill="url(#gC)" class="ripple" style="animation-delay:${-r1(i * 0.35)}s"/><ellipse rx="4" ry="3" fill="#bfeeff" fill-opacity=".35"/></g>`
  }
  return `<path d="${d}" fill="none" stroke="#9fdcff" stroke-opacity=".25" stroke-width=".8"/>${s}<circle r="5" fill="#d7f6ff" fill-opacity=".5"/><circle r="14" fill="url(#gC)"/>`
}

// Midnight zone
// Anglerfish: a lazy tail beat, the lure rod nodding.
const ANGLER = `<g fill="#0a0f14" stroke="#24333f" stroke-width="1">
${hinge('tailS', -29, 2, '<path d="M-28 -4 L-44 -14 L-42 4 L-46 18 L-28 8Z"/>')}
<path d="M30 4 Q34 -18 6 -26 Q-22 -26 -30 -4 L-30 8 Q-20 26 8 24 Q26 22 30 4Z"/>
${hinge('finA', 2, 10, '<path d="M4 8 Q-6 14 -8 22 Q0 18 8 14Z"/>')}
<path d="M-6 -24 Q-2 -34 4 -26" fill="none"/></g>
<path d="M31 2 L27 8 L25 1 L22 9 L19 2 L16 9 L13 3" fill="none" stroke="#9fb4c0" stroke-opacity=".55" stroke-width=".9"/>
<circle cx="18" cy="-8" r="2.4" fill="#1c2833"/><path d="M8 -24 Q26 -52 44 -36" fill="none" stroke="#2c3a46" stroke-width="1.2"/>
<circle cx="44" cy="-34" r="18" fill="url(#gC)" class="lure"/><circle cx="44" cy="-34" r="2.8" fill="#dffbff"/>`

const VAMPIRE = `<g fill="#2a0a12" stroke="#4a1a26" stroke-width=".8">
${hinge('finA', -24, -7, '<path d="M-24 -8 Q-34 -22 -30 -6Z"/>')}${hinge('finB', -24, 7, '<path d="M-24 8 Q-34 22 -30 6Z"/>')}<ellipse cx="-12" cy="0" rx="17" ry="11"/>
<g class="cape" style="transform-origin:2px 0"><path d="M2 -10 Q28 -30 42 -6 L36 0 L42 6 Q28 30 2 10Z"/></g></g>
<circle cx="0" cy="-4" r="2.4" fill="#76c9ff"/><circle cx="0" cy="-4" r="7" fill="url(#gB)" class="tw"/>
<circle cx="42" cy="-6" r="8" fill="url(#gB)" class="lure"/><circle cx="42" cy="6" r="8" fill="url(#gB)" class="lure" style="animation-delay:-1.3s"/>`

// Gulper eel: the long whip tail sways slowly, its pink light swinging with it.
const GULPER = `<g class="sway" style="transform-origin:-6px 0;animation-duration:8s">
<path d="M-6 0 Q-60 -8 -110 4 T-210 0" fill="none" stroke="#0c1218" stroke-width="3"/>
<path d="M-6 0 Q-60 -8 -110 4 T-210 0" fill="none" stroke="#24323d" stroke-width=".6"/>
<circle cx="-210" cy="0" r="12" fill="url(#gP)" class="lure"/><circle cx="-210" cy="0" r="2.2" fill="#ffc2dc"/></g>
<path d="M46 -2 Q42 -24 12 -17 Q0 -9 -10 -4 L-10 4 Q0 10 14 17 Q44 20 46 -2Z" fill="#0b1117" stroke="#24333e"/>
<path d="M46 -2 Q30 2 12 0" fill="none" stroke="#2c3c48"/><circle cx="34" cy="-11" r="1.6" fill="#2a3a46"/>`

const ATOLLA = `<circle r="24" fill="#3a0814" fill-opacity=".75"/><circle r="12" fill="#5a0d1e" fill-opacity=".8"/>
<g stroke="#4a1220" stroke-width="1">${Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2
  return `<path d="M${r1(Math.cos(a) * 24)} ${r1(Math.sin(a) * 24)} L${r1(Math.cos(a) * 34)} ${r1(Math.sin(a) * 34)}"/>`
}).join('')}</g>
<circle r="27" fill="none" stroke="#4fb8ff" stroke-width="3.5" stroke-dasharray="7 35" stroke-linecap="round" class="wheel"/>
<circle r="27" fill="none" stroke="#4fb8ff" stroke-opacity=".25" stroke-width="10" stroke-dasharray="7 35" class="wheel"/>`

const COMB = `<ellipse rx="14" ry="22" fill="#cfe9ff" fill-opacity=".07" stroke="#cfe9ff" stroke-opacity=".2"/>
<g fill="none" stroke="url(#rb)" stroke-width="1.6" stroke-dasharray="2 3" class="comb">
<path d="M-9 -16 Q-13 0 -9 16"/><path d="M-3 -21 Q-4 0 -3 21"/><path d="M3 -21 Q4 0 3 21"/><path d="M9 -16 Q13 0 9 16"/></g>`

// Abyss
const DUMBO = `<g fill="#c18f9d" fill-opacity=".35" stroke="#e2b9c4" stroke-opacity=".35" stroke-width=".8">
<g class="ear"><ellipse cx="-20" cy="-18" rx="11" ry="4.5" transform="rotate(-32 -20 -18)"/></g><g class="ear"><ellipse cx="20" cy="-18" rx="11" ry="4.5" transform="rotate(32 20 -18)"/></g>
<path d="M0 -30 Q14 -30 15 -12 Q16 2 0 4 Q-16 2 -15 -12 Q-14 -30 0 -30Z"/>
<g class="web" style="transform-origin:0 0"><path d="M-15 0 Q-34 18 -32 28 Q-24 24 -16 31 Q-8 25 0 32 Q8 25 16 31 Q24 24 32 28 Q34 18 15 0Z" fill-opacity=".18"/></g></g>
<circle cx="-9" cy="-4" r="1.6" fill="#2a1a20"/><circle cx="9" cy="-4" r="1.6" fill="#2a1a20"/>`

const TRIPOD = `<g fill="none" stroke="#2b3742" stroke-width=".9"><path d="M6 2 L2 40 M-6 2 L-16 40 M-32 0 Q-40 20 -46 40"/>
${hinge('feel', 11, -2, '<path d="M12 -2 Q30 -28 50 -38 M10 -2 Q26 -32 42 -46"/>')}</g>
<path d="M30 0 Q10 -6 -20 -3 L-33 -2 L-33 2 L-20 3 Q10 6 30 0Z" fill="#16202a" stroke="#2b3742" stroke-width=".8"/>`

const SEAPIG = `<ellipse rx="13" ry="6" fill="#d3a3b0" fill-opacity=".3" stroke="#e8c4ce" stroke-opacity=".3" stroke-width=".7"/>
<path d="M7 -5 L9 -12 M10 -4 L13 -10" stroke="#e8c4ce" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/>
<g fill="#d3a3b0" fill-opacity=".35"><circle cx="-8" cy="6" r="1.4"/><circle cx="-3" cy="6.5" r="1.4"/><circle cx="2" cy="6.5" r="1.4"/><circle cx="7" cy="6" r="1.4"/></g>`

const SPONGE = `<g fill="none" stroke="#a8c8d6" stroke-opacity=".16" stroke-width=".8">
<path d="M-10 0 Q-16 -40 -8 -80 Q0 -88 8 -80 Q16 -40 10 0Z"/>
${Array.from({ length: 7 }, (_, i) => `<path d="M${-13 + i * 0.4} ${-10 - i * 10} H${13 - i * 0.4}"/>`).join('')}
<path d="M-12 -8 L10 -78 M12 -8 L-10 -78 M-14 -30 L6 -80 M14 -30 L-6 -80"/></g>`

// The boat: one person in a kayak, paddling.
const BOAT = `<ellipse cx="0" cy="4" rx="44" ry="5" fill="#020a12" fill-opacity=".55"/>
<path d="M-46 -3 Q0 7 46 -3 L42 -6 Q0 -1 -42 -6Z" fill="#05090f"/>
<path d="M-4 -5 L-3 -19 L3 -19 L4 -5Z" fill="#05090f"/><circle cx="0" cy="-23" r="4" fill="#05090f"/>
<g class="paddle"><path d="M-26 -22 L26 -8" stroke="#05090f" stroke-width="1.6"/><path d="M-30 -24 L-23 -21 L-24 -19 L-31 -22Z M30 -6 L23 -9 L24 -11 L31 -8Z" fill="#05090f"/></g>
<g fill="none" stroke="#7fb6cf" stroke-opacity=".35" class="ripple"><path d="M-60 2 q6 -2 12 0"/><path d="M-80 3 q8 -2 16 0"/></g>`

// ---------- The scene ----------
const animals = []

// Sunlit zone (surface to 200 m)
animals.push(animal(1050, 150, group('sar', 22, 80, 26), { drift: 'dR' }))
animals.push(animal(1500, 205, TURTLE, { s: 0.8, flip: true, drift: 'dL' }))
animals.push(animal(600, 235, MANTA, { s: 0.9, drift: 'dR', cycle: 149 }))
animals.push(animal(1800, 150, `<g transform="translate(-30 10) scale(.8)">${JELLY}</g><g transform="translate(18 -6)">${JELLY}</g><g transform="translate(40 30) scale(.6)">${JELLY}</g>`, { drift: 'dU' }))
animals.push(animal(200, 200, WHALE, { s: 0.75, rot: 18, drift: 'dD', cycle: 211 }))

// Twilight zone (200 to 1 000 m)
animals.push(animal(1250, 330, group('lan', 14, 70, 28), { drift: 'dR' }))
animals.push(animal(450, 445, group('hat', 6, 40, 16, { size: 0.9 }), { flip: true, drift: 'dL' }))
animals.push(animal(1700, 470, group('sq', 7, 55, 22), { drift: 'dR' }))
animals.push(animal(880, 385, siphonophore(), { s: 0.9, drift: 'dS', cycle: 173 }))

// Midnight zone (1 000 to 4 000 m)
animals.push(animal(1100, 640, ANGLER, { s: 0.9, flip: true, drift: 'dS2' }))
animals.push(animal(500, 600, VAMPIRE, { s: 0.9, drift: 'dS' }))
animals.push(animal(1480, 735, GULPER, { s: 0.7, flip: true, drift: 'dL' }))
animals.push(animal(1820, 570, ATOLLA, { s: 0.8, drift: 'dU', cycle: 137 }))
animals.push(animal(220, 710, COMB, { s: 0.9, drift: 'dU' }))

// Abyss (4 000 m to the floor)
animals.push(animal(1000, 850, DUMBO, { s: 0.9, drift: 'dU' }))
animals.push(animal(1560, 932, TRIPOD, { s: 0.8, drift: null, cycle: 157 }))
animals.push(animal(400, 957, `<g transform="translate(-30 2)"><use href="#pig"/></g><g transform="translate(0 -2) scale(.9)"><use href="#pig"/></g><g transform="translate(28 3) scale(1.1)"><use href="#pig"/></g><g transform="translate(52 0) scale(.8)"><use href="#pig"/></g>`, { drift: 'dS', cycle: 181 }))
animals.push(animal(1250, 968, SPONGE, { drift: null, cycle: 191, vis: 'apL' }))

// The boat at the surface, now and then.
const boat = animal(680, SURFACE, BOAT, { s: 0.9, drift: 'dB', cycle: 233, vis: 'apB', raw: true })

// Marine snow: slow specks falling through the whole column, two tiles stacked.
let snow = ''
for (let i = 0; i < 110; i++) {
  snow += `<circle cx="${Math.round(rand() * W)}" cy="${Math.round(SURFACE + rand() * (H - SURFACE))}" r="${r1(0.5 + rand() * 0.9)}"/>`
}

// Light from the surface: a few faint shafts that slowly brighten and fade.
let rays = ''
for (let i = 0; i < 8; i++) {
  const x = 120 + i * 240 + rand() * 80
  const w = 30 + rand() * 50
  rays += `<path d="M${Math.round(x)} ${SURFACE} L${Math.round(x + w)} ${SURFACE} L${Math.round(x + w + 140)} 330 L${Math.round(x + 60)} 330Z" fill="url(#ray)" class="ray" style="animation-delay:${-Math.round(rand() * 40)}s"/>`
}

// Faint stars above the surface.
let stars = ''
for (let i = 0; i < 40; i++) {
  stars += `<circle cx="${Math.round(rand() * W)}" cy="${Math.round(rand() * (SURFACE - 8))}" r="${r1(0.4 + rand() * 0.7)}" opacity="${r1(0.3 + rand() * 0.5)}"/>`
}

// Seafloor: a low, soft rise.
let floor = `M0 ${H}`
for (let x = 0; x <= W; x += 60) floor += ` L${x} ${r1(966 + Math.sin(x / 170) * 8 + Math.sin(x / 61) * 3)}`
floor += ` L${W} ${H}Z`

const depth = (y, label) =>
  `<path d="M${W - 70} ${y} H${W - 10}" stroke="#8fb8cc" stroke-opacity=".18"/><text x="${W - 12}" y="${y - 5}" text-anchor="end" font-family="system-ui,sans-serif" font-size="11" fill="#8fb8cc" fill-opacity=".28">${label}</text>`

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<style>
.a{opacity:0}
@keyframes ap{0%{opacity:0}6%{opacity:1}28%{opacity:1}36%,100%{opacity:0}}
@keyframes apB{0%{opacity:0}5%{opacity:1}40%{opacity:1}46%,100%{opacity:0}}
@keyframes apL{0%{opacity:0}10%{opacity:1}55%{opacity:1}65%,100%{opacity:0}}
@keyframes dR{to{transform:translateX(300px)}}
@keyframes dL{to{transform:translateX(-300px)}}
@keyframes dS{to{transform:translateX(110px)}}
@keyframes dS2{to{transform:translateX(-110px)}}
@keyframes dU{to{transform:translateY(-150px)}}
@keyframes dD{to{transform:translate(520px,300px)}}
@keyframes dB{to{transform:translateX(900px)}}
.bob{animation:bob 5.5s ease-in-out infinite alternate}
@keyframes bob{to{transform:translate(3px,2px)}}
.flap,.ear,.pulse,.paddle{transform-box:fill-box;transform-origin:center}
.flap{animation:flap 5s ease-in-out infinite alternate}
@keyframes flap{to{transform:scaleY(.72)}}
.pulse{animation:pulse 3.1s ease-in-out infinite}
@keyframes pulse{50%{transform:scale(1.08,.86)}}
.finA{animation:finA 2.9s ease-in-out infinite alternate}
@keyframes finA{from{transform:rotate(-16deg)}to{transform:rotate(12deg)}}
.finB{animation:finB 2.9s ease-in-out infinite alternate}
@keyframes finB{from{transform:rotate(16deg)}to{transform:rotate(-12deg)}}
.tail{animation:tail 1.4s ease-in-out var(--d,0s) infinite alternate}
@keyframes tail{from{transform:rotate(-20deg)}to{transform:rotate(20deg)}}
.tailS{animation:tail 2.4s ease-in-out infinite alternate}
.fluke{animation:fluke 4.4s ease-in-out infinite alternate}
@keyframes fluke{from{transform:rotate(-11deg)}to{transform:rotate(11deg)}}
.sway{animation:sway 4s ease-in-out infinite alternate}
@keyframes sway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
.tent{animation:tent 3.1s ease-in-out infinite}
@keyframes tent{50%{transform:skewX(9deg) scaleY(.94)}}
.cape{animation:cape 4.6s ease-in-out infinite alternate}
@keyframes cape{to{transform:scale(.9,.72)}}
.web{animation:web 2.4s ease-in-out infinite alternate}
@keyframes web{to{transform:scale(1.06,.86)}}
.feel{animation:sway 3.6s ease-in-out infinite alternate}
.ear{animation:ear 2.4s ease-in-out infinite alternate}
@keyframes ear{to{transform:scaleY(.4)}}
.paddle{animation:paddle 3.2s ease-in-out infinite alternate}
@keyframes paddle{from{transform:rotate(-18deg)}to{transform:rotate(18deg)}}
.lure{animation:lure 4.5s ease-in-out infinite}
@keyframes lure{50%{opacity:.35}}
.tw{animation:lure 2.8s ease-in-out infinite}
.ripple{animation:lure 2.2s ease-in-out infinite}
.wheel{animation:wheel 2.4s linear infinite}
@keyframes wheel{to{stroke-dashoffset:-84}}
.comb{animation:comb 1.4s linear infinite}
@keyframes comb{to{stroke-dashoffset:-10}}
.ray{animation:ray 23s ease-in-out infinite alternate}
@keyframes ray{from{opacity:.35}to{opacity:1}}
.snow{animation:snow 420s linear infinite}
@keyframes snow{to{transform:translateY(${H - SURFACE}px)}}
.swell{animation:swell 14s ease-in-out infinite alternate}
@keyframes swell{to{transform:translateX(-40px)}}
@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}.a{opacity:.6}}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03070f"/><stop offset="1" stop-color="#0b1a2c"/></linearGradient>
<linearGradient id="sea" x1="0" y1="${SURFACE}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#1c5a77"/><stop offset=".07" stop-color="#14465f"/><stop offset=".21" stop-color="#0b2b42"/>
<stop offset=".33" stop-color="#071c2e"/><stop offset=".49" stop-color="#03101c"/><stop offset=".63" stop-color="#02080f"/>
<stop offset=".77" stop-color="#010408"/><stop offset="1" stop-color="#000102"/></linearGradient>
<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff" stop-opacity=".09"/><stop offset="1" stop-color="#bfe9ff" stop-opacity="0"/></linearGradient>
<linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ff"/><stop offset=".33" stop-color="#f7f"/><stop offset=".66" stop-color="#ff7"/><stop offset="1" stop-color="#7f9"/></linearGradient>
<radialGradient id="gC"><stop offset="0" stop-color="#9ff3ff" stop-opacity=".9"/><stop offset=".35" stop-color="#4fd6ef" stop-opacity=".32"/><stop offset="1" stop-color="#4fd6ef" stop-opacity="0"/></radialGradient>
<radialGradient id="gB"><stop offset="0" stop-color="#8fd0ff" stop-opacity=".8"/><stop offset=".4" stop-color="#3f8fff" stop-opacity=".26"/><stop offset="1" stop-color="#3f8fff" stop-opacity="0"/></radialGradient>
<radialGradient id="gP"><stop offset="0" stop-color="#ffa6cf" stop-opacity=".9"/><stop offset=".4" stop-color="#ff5fa8" stop-opacity=".28"/><stop offset="1" stop-color="#ff5fa8" stop-opacity="0"/></radialGradient>
<radialGradient id="moon"><stop offset="0" stop-color="#dfe9f5" stop-opacity=".35"/><stop offset="1" stop-color="#dfe9f5" stop-opacity="0"/></radialGradient>
<clipPath id="water"><rect y="${SURFACE}" width="${W}" height="${H - SURFACE}"/></clipPath>
<symbol id="sar" overflow="visible">${brighten(SARDINE)}</symbol>
<symbol id="lan" overflow="visible">${brighten(LANTERN)}</symbol>
<symbol id="hat" overflow="visible">${brighten(HATCHET)}</symbol>
<symbol id="sq" overflow="visible">${brighten(SQUID)}</symbol>
<symbol id="pig" overflow="visible">${brighten(SEAPIG)}</symbol>
</defs>
<rect width="${W}" height="${SURFACE + 2}" fill="url(#sky)"/>
<g fill="#dfe9f5">${stars}</g>
<circle cx="1820" cy="6" r="110" fill="url(#moon)"/>
<rect y="${SURFACE}" width="${W}" height="${H - SURFACE}" fill="url(#sea)"/>
<g class="swell"><path d="M-40 ${SURFACE} ${Array.from({ length: 36 }, (_, i) => `q${30} ${i % 2 ? 3 : -3} 60 0`).join(' ')} V${SURFACE + 8} H-40Z" fill="#3d86a6" fill-opacity=".22"/></g>
<path d="M1740 ${SURFACE + 2} h160 l-30 4 h-100Z M1760 ${SURFACE + 9} h110 l-20 3 h-70Z" fill="#cfe3f0" fill-opacity=".12" class="ray"/>
<g>${rays}</g>
<g fill="#cfe3ee" fill-opacity=".22" clip-path="url(#water)"><g class="snow"><g>${snow}</g><g transform="translate(0 ${-(H - SURFACE)})">${snow}</g></g></g>
${depth(260, '200 m')}${depth(520, '1 000 m')}${depth(780, '4 000 m')}
<path d="${floor}" fill="#04070a"/>
${animals.join('\n')}
${boat}
</svg>`

// The engine allows 131 072 characters, but on 16 November 2026 the desktop
// app froze scenes from about 112 000 up, and any motion repeating faster
// than about once a second froze it too (this scene's 0.8 s tail beat
// included). Keep under both.
const BUDGET = 110000
if (svg.length > BUDGET) throw new Error(`scene too long: ${svg.length} of ${BUDGET}`)
writeFileSync(
  out,
  `// Generated by generators/deep-sea/gen-scene.mjs: the deep-sea backdrop.\nexport const SCENE = ${JSON.stringify(svg)}\n`,
)
console.log(`scene: ${svg.length} of ${BUDGET} characters`)
