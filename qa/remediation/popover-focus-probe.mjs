import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium, firefox, webkit } from 'playwright'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.join(root, 'qa/results/remediation')
const base = 'http://127.0.0.1:5198'
const inputs = ['qa/remediation/popover-focus-probe.mjs', 'docs/5.3/components/popovers/index.html', 'docs/5.3/dist/js/bootstrap.bundle.min.js', 'docs/5.3/dist/tq/tq-accessibility.min.js']
for(const match of (await fs.readFile(path.join(root,inputs[1]),'utf8')).matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)){const url=new URL(match[1],`${base}/docs/5.3/components/popovers/`);if(url.origin===base&&!inputs.includes(url.pathname.slice(1)))inputs.push(url.pathname.slice(1))}
const hashes = async () => Object.fromEntries(await Promise.all(inputs.map(async file => [file, createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex') ])))
const report = { started: new Date().toISOString(), inputsAtStart: await hashes(), observations: [], errors: [] }
await fs.mkdir(out, { recursive: true })
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch()
  for (const width of [1440, 390]) for (const triggerType of ['focus', 'hover focus']) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } })
    page.setDefaultTimeout(5000)
    await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort())
    try {
      await page.goto(`${base}/docs/5.3/components/popovers/`, { waitUntil: 'load' })
      const trigger = page.locator(`[data-bs-toggle="popover"][data-bs-trigger="${triggerType}"]`).first()
      await trigger.scrollIntoViewIfNeeded()
      await trigger.focus()
      await page.waitForFunction(element=>Boolean(document.getElementById(element.getAttribute('aria-describedby'))?.matches('.popover.show')),await trigger.elementHandle())
      await page.waitForTimeout(250)
      const id = await trigger.getAttribute('aria-describedby')
      const popup = page.locator(`#${id}`)
      const initial = await trigger.evaluate(element => {
        const popup = document.getElementById(element.getAttribute('aria-describedby'))
        const box = popup.getBoundingClientRect(), overlaps = [], walker = document.createTreeWalker(document.querySelector('.bd-content'), NodeFilter.SHOW_TEXT)
        let node
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim() || element.contains(node) || popup.contains(node) || node.parentElement.closest('[aria-hidden="true"]')) continue
          const range = document.createRange(); range.selectNodeContents(node)
          for (const rect of range.getClientRects()) if (Math.min(rect.right, box.right) > Math.max(rect.left, box.left) && Math.min(rect.bottom, box.bottom) > Math.max(rect.top, box.top)) overlaps.push(node.textContent.trim().slice(0, 120))
        }
        return { focus: document.activeElement === element, popup: { x: box.x, y: box.y, width: box.width, height: box.height }, overlaps: [...new Set(overlaps)] }
      })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
      const visibleAfterEscape = await page.evaluate(id => Boolean(document.getElementById(id)?.classList.contains('show')), id)
      const focusRetained = await trigger.evaluate(element => document.activeElement === element)
      if (name === 'chromium') await page.screenshot({ path: path.join(out, `popover-${triggerType.replace(' ', '-')}-${width}-after-Escape.png`) })
      let visibleOnHover = null
      if (triggerType.includes('hover')) {
        await trigger.evaluate(element => element.blur())
        await page.mouse.move(2, 998); await page.waitForTimeout(400)
        await trigger.hover(); await page.waitForTimeout(400)
        const popupId = await trigger.getAttribute('aria-describedby')
        const box = await page.locator(`#${popupId}`).boundingBox()
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
        await page.waitForTimeout(400)
        visibleOnHover = await page.evaluate(id => Boolean(document.getElementById(id)?.classList.contains('show')), popupId)
      }
      report.observations.push({ browser: name, width, triggerType, ...initial, visibleAfterEscape, focusRetained, visibleOnHover, obscuringEscapeFailure: initial.overlaps.length > 0 && visibleAfterEscape, hoverFailure: visibleOnHover === false })
    } catch (error) { report.errors.push({ browser: name, width, triggerType, error: error.message }) }
    await page.close()
  }
  await browser.close()
}
report.inputsAtEnd = await hashes()
report.summary = { observations: report.observations.length, errors: report.errors.length, allEscapeDismissals: report.observations.filter(item=>!item.visibleAfterEscape&&item.focusRetained).length, obscuringEscapeFailures: report.observations.filter(item => item.obscuringEscapeFailure).length, hoverFailures: report.observations.filter(item => item.hoverFailure).length, inputsFrozen: JSON.stringify(report.inputsAtStart) === JSON.stringify(report.inputsAtEnd) }
await fs.writeFile(path.join(out, 'popover-focus-probe.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.summary))
if(report.summary.observations!==12||report.summary.errors||report.summary.allEscapeDismissals!==12||report.summary.hoverFailures||!report.summary.inputsFrozen)process.exitCode=1
