import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { chromium, firefox } from 'playwright'

const root = path.resolve(import.meta.dirname, '../..'), base = 'http://127.0.0.1:5198'
const candidate = process.argv.includes('--candidate'), baseline = process.argv.includes('--baseline'), tag = candidate ? 'candidate' : baseline ? 'baseline' : 'published'
const routes = ['components/carousel', 'examples/carousel'], candidatePath = '.cache/remediation-20261022/paint-candidate.css'
const files = ['qa/remediation/carousel-indicator-forced.mjs', 'src/scss/_forced-colours.scss', 'dist/css/bootstrap.min.css', ...routes.map(route => `docs/5.3/${route}/index.html`), ...(candidate ? [candidatePath] : [])]
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])))
const luminance = rgb => rgb.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0)
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
const report = { suite: 'Actual Carousel indicator paint against real slide hosts in supported forced palettes', candidate, baseline, candidatePath: candidate ? candidatePath : null, started: new Date().toISOString(), inputsAtStart: await hashes(), visits: [], observations: [], findings: [], errors: [], notes: ['Original actual Carousel documentation and example slide SVGs/images, layout, indicator dimensions and native active/inactive opacity are retained. Candidate mode appends the exact hashed complete candidate CSS; published mode retains original page markup/styles/integrity.', 'Every actual indicator is measured both at rest and after real keyboard focus. Actual centre pixels are compared with the same host after temporarily hiding only that indicator fill. Original inline styles are restored immediately. This is a visible indicator/focus-state paint measurement, not a blanket claim for arbitrary future slide imagery.', 'The eight requested browser/scheme/theme combinations must demonstrate actual automatic native forced-palette substitution. The separate full forced-focus suite records unsupported WebKit palette emulation.'] }
const directory = path.join(root, 'qa/results/remediation'), pictures = `carousel-indicator-forced-${tag}`
await fs.mkdir(path.join(directory, pictures), { recursive: true })
const candidateCSS = candidate ? await fs.readFile(path.join(root, candidatePath), 'utf8') : null
for (const [engine, type] of Object.entries({ chromium, firefox })) {
  const browser = await type.launch()
  try {
    for (const scheme of ['light', 'dark']) for (const theme of ['light', 'dark']) for (const route of routes) {
      const info = { browser: engine, version: browser.version(), scheme, theme, route }, context = await browser.newContext({ viewport: { width: 1184, height: 1002 }, colorScheme: scheme, forcedColors: 'active', reducedMotion: 'reduce' })
      const page = await context.newPage(); page.setDefaultTimeout(8000)
      try {
        await page.goto(`${base}/docs/5.3/${route}/`, { waitUntil: 'load' })
        await page.evaluate(theme => document.documentElement.setAttribute('data-bs-theme', theme), theme)
        if (candidateCSS) await page.addStyleTag({ content: candidateCSS })
        const capability = await page.evaluate(() => { const node = document.createElement('span'); node.style.cssText = 'position:absolute;left:-10000px;forced-color-adjust:auto;color:rgb(18,52,86);background:rgb(171,205,239)'; node.textContent = 'Palette probe'; document.body.append(node); const style = getComputedStyle(node), before = { color: style.color, background: style.backgroundColor }; node.style.color = 'CanvasText'; node.style.backgroundColor = 'Canvas'; const after = { color: style.color, background: style.backgroundColor }; node.remove(); return { media: matchMedia('(forced-colors: active)').matches, before, after, automaticPalette: before.color === after.color && before.background === after.background } })
        if (!capability.media || !capability.automaticPalette) throw Error('Requested automatic forced-palette environment is unsupported')
        for (const href of await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.href))) { const url = new URL(href); if (url.origin !== base) continue; const file = url.pathname.slice(1); if (!files.includes(file)) { files.push(file); report.inputsAtStart[file] = sha(await fs.readFile(path.join(root, file))) } }
        const controls = page.locator('.carousel-indicators [data-bs-target]'), count = await controls.count()
        if (count !== (route === routes[0] ? 9 : 3)) throw Error(`Actual indicator coverage changed: ${route} has ${count}`)
        report.visits.push({ ...info, capability, count })
        for (let index = 0; index < count; index++) {
          const control = controls.nth(index); await control.scrollIntoViewIfNeeded()
          for (const state of ['rest', 'focus']) {
            await page.mouse.move(0, 0); await control.evaluate(el => el.blur())
            if (state === 'focus') { await control.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab') }
            const metadata = await control.evaluate(el => { const s = getComputedStyle(el), group = getComputedStyle(el.parentElement); return { className: el.className, name: el.getAttribute('aria-label'), active: el.classList.contains('active'), focused: document.activeElement === el, focusVisible: el.matches(':focus-visible'), opacity: s.opacity, background: s.backgroundColor, groupBackground: group.backgroundColor, filter: s.filter, outline: { width: s.outlineWidth, style: s.outlineStyle, color: s.outlineColor, offset: s.outlineOffset }, slide: el.closest('.carousel').querySelector('.carousel-item.active')?.innerHTML.slice(0, 650) } })
            const original = await control.getAttribute('style'), before = await control.boundingBox(), actual = await control.screenshot()
            await control.evaluate(el => el.style.setProperty('background-color', 'transparent', 'important'))
            const hidden = await control.screenshot(), after = await control.boundingBox()
            await control.evaluate((el, original) => original === null ? el.removeAttribute('style') : el.setAttribute('style', original), original)
            const pixels = await page.evaluate(async buffers => { const result = []; for (const bytes of buffers) { const image = new Image(); image.src = `data:image/png;base64,${bytes}`; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); const x = Math.floor(image.width / 2), y = Math.floor(image.height / 2); result.push([...context.getImageData(x, y, 1, 1).data].slice(0, 3)) } return result }, [actual, hidden].map(bytes => bytes.toString('base64')))
            const ratio = contrast(...pixels), geometryUnchanged = JSON.stringify(before) === JSON.stringify(after), screenshot = `${pictures}/${engine}-${scheme}-${theme}-${route.replaceAll('/', '-')}-${index}-${state}.png`
            await fs.writeFile(path.join(directory, screenshot), actual)
            const observation = { ...info, selector: '.carousel-indicators [data-bs-target]', index, state, ...metadata, pixels, ratio, geometryUnchanged, screenshot, screenshotSHA256: sha(actual), pass: ratio >= 3 && geometryUnchanged && Number(metadata.opacity) === (metadata.active ? 1 : .5) && (state !== 'focus' || metadata.focused && metadata.focusVisible) }
            report.observations.push(observation); if (!observation.pass) report.findings.push(observation)
            if (state === 'focus') {
              const rect = await control.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height } })
              const clip = { x: Math.max(0, Math.floor(rect.x - 6)), y: Math.max(0, Math.floor(rect.y - 6)), width: Math.ceil(rect.width + 12), height: Math.ceil(rect.height + 12) }
              const ringActual = await page.screenshot({ clip })
              await control.evaluate(el => el.style.setProperty('outline-style', 'none', 'important'))
              const ringHidden = await page.screenshot({ clip })
              await control.evaluate((el, original) => original === null ? el.removeAttribute('style') : el.setAttribute('style', original), original)
              const pairs = await page.evaluate(async buffers => {
                const images = []
                for (const bytes of buffers) { const image = new Image(); image.src = `data:image/png;base64,${bytes}`; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); images.push(ctx.getImageData(0, 0, canvas.width, canvas.height).data) }
                const [a, b] = images, pairs = new Map()
                for (let i = 0; i < a.length; i += 4) { const ink = [...a.slice(i, i + 3)], host = [...b.slice(i, i + 3)]; if (ink.some((value, j) => Math.abs(value - host[j]) > 3)) { const key = `${ink.join(',')}|${host.join(',')}`; pairs.set(key, (pairs.get(key) || 0) + 1) } }
                return [...pairs].map(([key, count]) => ({ colours: key.split('|').map(text => text.split(',').map(Number)), count }))
              }, [ringActual, ringHidden].map(bytes => bytes.toString('base64')))
              const samples = pairs.map(pair => ({ ...pair, ratio: contrast(...pair.colours) })).sort((a, b) => b.ratio - a.ratio), core = samples.find(row => row.count >= 2)
              const ringScreenshot = screenshot.replace('.png', '-focus-ring.png'); await fs.writeFile(path.join(directory, ringScreenshot), ringActual)
              const ring = { ...info, selector: '.carousel-indicators [data-bs-target]', index, state, sampleKind: 'focus-ring', name: metadata.name, focused: metadata.focused, focusVisible: metadata.focusVisible, opacity: metadata.opacity, outline: metadata.outline, ratio: core?.ratio || 1, core, strongestPaintSamples: samples.slice(0, 5), geometryUnchanged, screenshot: ringScreenshot, screenshotSHA256: sha(ringActual), pass: metadata.focused && metadata.focusVisible && geometryUnchanged && !!core && core.ratio >= 3 }
              report.observations.push(ring); if (!ring.pass) report.findings.push(ring)
            }
          }
        }
        await fs.writeFile(path.join(directory, `carousel-indicator-forced-${tag}-partial.json`), JSON.stringify({ ...report, runtimeStatus: 'incomplete checkpoint' }, null, 2))
      } catch (error) { report.errors.push({ ...info, error: String(error), stack: error.stack }) } finally { await context.close() }
    }
  } finally { await browser.close() }
}
report.inputsAtEnd = await hashes(); report.finished = new Date().toISOString(); report.summary = { visits: report.visits.length, observations: report.observations.length, expectedObservations: 288, fillChecks: report.observations.filter(row => row.sampleKind !== 'focus-ring').length, focusRingChecks: report.observations.filter(row => row.sampleKind === 'focus-ring').length, passed: report.observations.filter(row => row.pass).length, findings: report.findings.length, errors: report.errors.length, minimumContrast: Math.min(...report.observations.map(row => row.ratio)), inputsFrozen: JSON.stringify(report.inputsAtStart) === JSON.stringify(report.inputsAtEnd) }
await fs.writeFile(path.join(directory, `carousel-indicator-forced-${tag}.json`), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report.summary))
if (report.findings.length || report.errors.length || report.summary.visits !== 16 || report.summary.observations !== 288 || report.summary.fillChecks !== 192 || report.summary.focusRingChecks !== 96 || !report.summary.inputsFrozen) process.exitCode = 1
