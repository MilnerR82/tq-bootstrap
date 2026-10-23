import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parseDocument } from 'htmlparser2'
import { chromium, firefox, webkit } from 'playwright'

const root = path.resolve(import.meta.dirname, '../..'), base = 'http://127.0.0.1:5198'
const candidate = process.argv.includes('--candidate'), baseline = process.argv.includes('--baseline')
const tag = candidate ? 'candidate' : baseline ? 'baseline' : 'published'
const routes = ['components/progress', 'examples/cheatsheet', 'examples/cheatsheet-rtl']
const candidatePath = '.cache/remediation-20261022/paint-candidate.css'
const files = ['qa/remediation/progress-forced-utilities.mjs', 'src/scss/_forced-colours.scss', 'dist/css/bootstrap.min.css', 'dist/css/bootstrap.rtl.min.css', ...routes.map(route => `docs/5.3/${route}/index.html`), ...(candidate ? [candidatePath] : [])]
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])))
const luminance = rgb => rgb.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0)
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
const rgb = text => (text.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
const inventory = {}
for (const route of routes) {
  const document = parseDocument(await fs.readFile(path.join(root, `docs/5.3/${route}/index.html`), 'utf8')), classes = []
  const visit = node => { if ((node.attribs?.class || '').split(/\s+/).includes('progress-bar')) classes.push(node.attribs.class); for (const child of node.children || []) visit(child) }
  visit(document); inventory[route] = classes
}
const report = { suite: 'Actual documented Progress fill and label utilities in forced system palettes', started: new Date().toISOString(), candidate, baseline, candidatePath: candidate ? candidatePath : null, inputsAtStart: await hashes(), inventory, environments: [], visits: [], observations: [], findings: [], errors: [], servedStylesheets: [], notes: ['Every actual progress-bar in the Progress documentation and both standalone cheatsheets is measured, including ordinary, bg-*, text-bg-*, striped, animated and stacked variants. No product classes or geometry are replaced. Candidate mode appends only the exact hashed complete candidate stylesheet; published mode uses the authored stylesheet and its original integrity metadata.', 'The capability probe requires both forced-colours media activation and native automatic replacement of authored RGB foreground/background. WebKit media-only emulation is explicitly unsupported rather than passing.', 'Actual composited fill pixels are compared with the same track after temporarily hiding only the fill background/image and restoring its original inline style. Animation is paused at its native current frame and restored; widths, borders and host tracks remain unchanged. Visible labels are checked against the composited solid-core fill using their actual computed foreground.', 'Stacked adjacent segments may share the system fill. This probe verifies fill/track and label contrast only; segment amounts remain available in the separate visible exact text alternatives and semantic values. Zero-width progress is recorded as an empty value rather than a visible fill.'] }
const directory = path.join(root, 'qa/results/remediation'), pictures = `progress-forced-utilities-${tag}`
await fs.mkdir(path.join(directory, pictures), { recursive: true })
const candidateCSS = candidate ? await fs.readFile(path.join(root, candidatePath), 'utf8') : null
const checkpoint = async () => fs.writeFile(path.join(directory, `progress-forced-utilities-${tag}-partial.json`), JSON.stringify({ ...report, runtimeStatus: 'incomplete checkpoint' }, null, 2))
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch()
  try {
    for (const scheme of ['light', 'dark']) for (const theme of ['light', 'dark']) {
      const info = { browser: engine, version: browser.version(), scheme, theme }
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: scheme, forcedColors: 'active', reducedMotion: 'reduce' })
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort())
      const page = await context.newPage(); page.setDefaultTimeout(8000)
      try {
        for (const route of routes) {
          await page.goto(`${base}/docs/5.3/${route}/`, { waitUntil: 'load' })
          await page.evaluate(theme => document.documentElement.setAttribute('data-bs-theme', theme), theme)
          if (candidateCSS) await page.addStyleTag({ content: candidateCSS })
          const capability = await page.evaluate(() => {
            const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;left:-10000px;forced-color-adjust:auto;color:rgb(18,52,86);background:rgb(171,205,239)'; probe.textContent = 'Palette probe'; document.body.append(probe)
            const automatic = getComputedStyle(probe), authoredColour = automatic.color, authoredBackground = automatic.backgroundColor
            probe.style.color = 'CanvasText'; probe.style.backgroundColor = 'Canvas'; const system = getComputedStyle(probe), systemText = system.color, systemCanvas = system.backgroundColor
            const result = { media: matchMedia('(forced-colors: active)').matches, authoredColour, authoredBackground, systemText, systemCanvas, automaticPaletteAdjustment: authoredColour === systemText && authoredBackground === systemCanvas }; probe.remove(); return result
          })
          if (route === routes[0]) report.environments.push({ ...info, capability, supported: capability.media && capability.automaticPaletteAdjustment, ...(!capability.automaticPaletteAdjustment ? { reason: 'Automatic native system-palette substitution unavailable; media-only emulation is not a passing forced-colours environment.' } : {}) })
          if (!capability.media || !capability.automaticPaletteAdjustment) break
          const bars = page.locator('.progress-bar'), count = await bars.count(), actualClasses = await bars.evaluateAll(nodes => nodes.map(node => node.className))
          if (JSON.stringify(actualClasses) !== JSON.stringify(inventory[route])) throw Error(`Actual Progress inventory differs from the packaged page: ${route}`)
          report.visits.push({ ...info, route, count, capability })
          for (const href of await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.href))) {
            const url = new URL(href); if (url.origin !== base) continue
            const file = url.pathname.slice(1), packaged = await fs.readFile(path.join(root, file)), response = await page.request.get(href), served = await response.body()
            if (!files.includes(file)) files.push(file)
            report.inputsAtStart[file] ??= sha(packaged)
            const record = { ...info, route, href, file, diskSHA256: sha(packaged), servedSHA256: sha(served), pass: response.ok() && sha(packaged) === sha(served) }; report.servedStylesheets.push(record)
            if (!record.pass) throw Error(`Served stylesheet differs from packaged bytes: ${href}`)
          }
          for (let index = 0; index < count; index++) {
            const bar = bars.nth(index), metadata = await bar.evaluate(el => { const style = getComputedStyle(el), rect = el.getBoundingClientRect(), track = el.closest('.progress'), semantic = el.closest('[role="progressbar"]'); return { className: el.className, trackClass: track?.className, visibleLabel: el.innerText.trim(), labelColor: style.color, fillColor: style.backgroundColor, backgroundImage: style.backgroundImage, forcedColorAdjust: style.forcedColorAdjust, value: semantic?.getAttribute('aria-valuenow'), name: semantic?.getAttribute('aria-label'), width: rect.width, height: rect.height, stacked: !!el.closest('.progress-stacked') } })
            const row = { ...info, route, selector: '.progress-bar', index, ...metadata }
            if (metadata.width < 1 || metadata.height < 1) { report.observations.push({ ...row, pass: true, classification: 'Zero-size progress has no visible fill; original semantic value retained.' }); continue }
            await bar.scrollIntoViewIfNeeded()
            const original = await bar.getAttribute('style'), before = await bar.boundingBox()
            const animations = await bar.evaluate(el => el.getAnimations().map(animation => { const state = { time: animation.currentTime, playState: animation.playState }; animation.pause(); return state }))
            const actual = await bar.screenshot({ animations: 'allow' })
            await bar.evaluate(el => { el.style.setProperty('background-color', 'transparent', 'important'); el.style.setProperty('background-image', 'none', 'important') })
            const hidden = await bar.screenshot({ animations: 'allow' }), after = await bar.boundingBox()
            await bar.evaluate((el, original) => { if (original === null) el.removeAttribute('style'); else el.setAttribute('style', original) }, original)
            await bar.evaluate((el, states) => el.getAnimations().forEach((animation, i) => { if (!states[i]) return; animation.currentTime = states[i].time; if (states[i].playState === 'running') animation.play() }), animations)
            const samples = await page.evaluate(async ({ actual, hidden }) => {
              const images = await Promise.all([actual, hidden].map(async bytes => { const image = new Image(); image.src = `data:image/png;base64,${bytes}`; await image.decode(); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data } }))
              const [a, b] = images, pairs = new Map()
              for (let i = 0; i < a.data.length; i += 4) { const ink = [...a.data.slice(i, i + 3)], host = [...b.data.slice(i, i + 3)]; if (ink.some((value, j) => Math.abs(value - host[j]) > 3)) { const key = `${ink.join(',')}|${host.join(',')}`; pairs.set(key, (pairs.get(key) || 0) + 1) } }
              return [...pairs].map(([key, count]) => ({ colours: key.split('|').map(text => text.split(',').map(Number)), count })).sort((a, b) => b.count - a.count).slice(0, 20)
            }, { actual: actual.toString('base64'), hidden: hidden.toString('base64') })
            const core = samples.find(sample => sample.count >= 2), ratio = core ? contrast(...core.colours) : 1
            const labelRatio = metadata.visibleLabel && core ? contrast(rgb(metadata.labelColor), core.colours[0]) : null
            const filename = `${engine}-${scheme}-${theme}-${route.replaceAll('/', '-')}-${index}.png`, screenshot = `${pictures}/${filename}`
            await fs.writeFile(path.join(directory, screenshot), actual)
            const geometryUnchanged = JSON.stringify(before) === JSON.stringify(after), fillMatchesSystem = metadata.fillColor === capability.systemText, labelMatchesSystem = !metadata.visibleLabel || metadata.labelColor === capability.systemCanvas
            const observation = { ...row, ratio, labelRatio, fillMatchesSystem, labelMatchesSystem, core, strongestSamples: samples.slice(0, 5), geometryUnchanged, screenshot, screenshotSHA256: sha(actual), classification: metadata.stacked ? 'Stacked fill/track only; adjacent segment identity uses the documented visible text equivalent.' : 'Essential progress fill and any visible numeric label.', pass: ratio >= 3 && (labelRatio === null || labelRatio >= 4.5) && fillMatchesSystem && labelMatchesSystem && geometryUnchanged }
            report.observations.push(observation); if (!observation.pass) report.findings.push(observation)
          }
          await checkpoint()
        }
      } catch (error) { report.errors.push({ ...info, error: String(error), stack: error.stack }) } finally { await context.close() }
    }
  } finally { await browser.close() }
}
report.inputsAtEnd = await hashes(); report.finished = new Date().toISOString()
report.summary = { environments: report.environments.length, supported: report.environments.filter(row => row.supported).length, unsupported: report.environments.filter(row => !row.supported).length, visits: report.visits.length, observations: report.observations.length, expectedObservations: Object.values(inventory).reduce((sum, classes) => sum + classes.length, 0) * 8, passed: report.observations.filter(row => row.pass).length, findings: report.findings.length, errors: report.errors.length, servedStylesheetsPass: report.servedStylesheets.every(row => row.pass), inputsFrozen: JSON.stringify(report.inputsAtStart) === JSON.stringify(report.inputsAtEnd) }
await fs.writeFile(path.join(directory, `progress-forced-utilities-${tag}.json`), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report.summary))
if (report.findings.length || report.errors.length || !report.summary.inputsFrozen || report.summary.environments !== 12 || report.summary.supported !== 8 || report.summary.unsupported !== 4 || report.summary.visits !== 24 || report.summary.observations !== report.summary.expectedObservations || !report.summary.servedStylesheetsPass) process.exitCode = 1
