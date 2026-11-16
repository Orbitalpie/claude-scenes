// Screenshots a generated scene at chosen moments in its animation.
//   node render.cjs <hooks/scene-name.ts> <out-folder> <shots.json>
// shots.json: [{ "name", "t" (seconds in), "w"?, "h"?, "clip"?: [x, y, w, h] in the 2000x1000 view }]
//
// Needs playwright-core (npm i -D playwright-core, or PLAYWRIGHT_CORE=<path to
// an installed copy>) and a Chromium-based browser. SCENE_BROWSER picks one:
// msedge, chrome or chromium. Unset, it tries them in that order.
const fs = require('fs')
const path = require('path')

const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core')

async function launch() {
  const wanted = process.env.SCENE_BROWSER ? [process.env.SCENE_BROWSER] : ['msedge', 'chrome', 'chromium']
  for (const b of wanted) {
    try {
      return await chromium.launch(b === 'chromium' ? {} : { channel: b })
    } catch {}
  }
  throw new Error(`no browser found among: ${wanted.join(', ')}`)
}

const [scenePath, outDir, shotsPath] = process.argv.slice(2)
const src = fs.readFileSync(scenePath, 'utf8')
const svg = JSON.parse(src.slice(src.indexOf('=') + 1).trim())
const shots = JSON.parse(fs.readFileSync(shotsPath, 'utf8'))
fs.mkdirSync(outDir, { recursive: true })

;(async () => {
  const browser = await launch()
  for (const s of shots) {
    const w = s.w ?? 1600
    const h = s.h ?? 800
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    await page.setContent(`<html><body style="margin:0;background:#000">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</body></html>`)
    // Every animation to the same moment, paused there.
    await page.evaluate(t => {
      for (const a of document.getAnimations()) {
        a.pause()
        a.currentTime = t * 1000
      }
    }, s.t)
    await page.waitForTimeout(150)
    const opts = { path: path.join(outDir, `${s.name}.png`) }
    if (s.clip) {
      // The view fills the page like preserveAspectRatio slice: scaled to cover, centred.
      const k = Math.max(w / 2000, h / 1000)
      const ox = (w - 2000 * k) / 2
      const oy = (h - 1000 * k) / 2
      const [x, y, cw, ch] = s.clip
      opts.clip = { x: ox + x * k, y: oy + y * k, width: cw * k, height: ch * k }
    }
    await page.screenshot(opts)
    await page.close()
    console.log(opts.path)
  }
  await browser.close()
})()
