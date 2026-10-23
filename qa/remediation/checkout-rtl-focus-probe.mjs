import fs from 'node:fs/promises'
import { webkit } from 'playwright'
const report = { observations: [], errors: [] }
const browser = await webkit.launch()
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } })
  page.on('pageerror', error => report.errors.push(error.message))
  await page.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:5198' ? route.continue() : route.abort())
  await page.goto('http://127.0.0.1:5198/docs/5.3/examples/checkout-rtl/', { waitUntil: 'load' })
  const form = page.locator('form.needs-validation')
  await form.locator('[type=submit]').click()
  await page.evaluate(() => {
    window.focusEvents = []
    for (const name of ['pointerdown', 'pointerup', 'click', 'focusin', 'focusout']) document.addEventListener(name, event => window.focusEvents.push({ type: name, id: event.target.id, tag: event.target.tagName, active: document.activeElement.id, defaultPrevented: event.defaultPrevented }), true)
  })
  const link = form.locator('[data-tq-validation-summary] a').first()
  const before = await link.evaluate(element => ({ href: element.href, target: element.hash, text: element.textContent, active: document.activeElement.outerHTML.slice(0, 200), outer: element.outerHTML }))
  await link.click()
  const immediate = await page.evaluate(() => ({ active: document.activeElement.outerHTML.slice(0, 300), id: document.activeElement.id, tag: document.activeElement.tagName, events: window.focusEvents }))
  await page.waitForTimeout(300)
  const later = await page.evaluate(() => ({ active: document.activeElement.outerHTML.slice(0, 300), id: document.activeElement.id, tag: document.activeElement.tagName, events: window.focusEvents }))
  report.observations.push({ width, before, immediate, later })
  await page.close()
}
await browser.close()
await fs.writeFile(new URL('../results/remediation/checkout-rtl-focus-probe.json', import.meta.url), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report))
