import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium, firefox, webkit } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.join(root, 'qa/results/remediation')
const base = process.env.TQ_BASE || 'http://127.0.0.1:5198'
const routes = ['components/tooltips', 'components/popovers', 'components/carousel', 'forms/validation', 'examples/carousel', 'examples/checkout', 'examples/checkout-rtl', 'examples/cheatsheet', 'examples/cheatsheet-rtl', 'examples/sidebars']
const sha = value => createHash('sha256').update(value).digest('hex')
const inputs = new Set(['src/js/tq-accessibility.js', 'dist/tq/tq-accessibility.min.js', 'qa/remediation/accessibility-production.mjs'])
for (const route of routes) {
  const file = `docs/5.3/${route}/index.html`
  inputs.add(file)
  const html = await fs.readFile(path.join(root, file), 'utf8')
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)) {
    const url = new URL(match[1], `${base}/docs/5.3/${route}/`)
    if (url.origin === new URL(base).origin) inputs.add(decodeURIComponent(url.pathname.slice(1)))
  }
}
const fingerprints = async () => Object.fromEntries(await Promise.all([...inputs].sort().map(async file => [file, sha(await fs.readFile(path.join(root, file)))])))
const report = { suite: 'Published-page accessibility behaviour remediation', started: new Date().toISOString(), assetsAtStart: await fingerprints(), checks: [], visits: [], findings: [], notes: ['Real production pages are loaded without injecting or altering product JavaScript/CSS. Tests exercise the shipped companion through pointer, keyboard and public Bootstrap methods. Private _interval is read only as a timer observation, never modified.', 'External hosted services are blocked. These pages do not require those services for the tested core interactions.', 'This targeted regression evidence is not an assistive-technology test or a WCAG conformance certificate.'] }
await fs.mkdir(out, { recursive: true })
const assert = (browser, route, name, pass, details = {}) => {
  report.checks.push({ browser, route, name, pass, ...details })
  if (!pass) throw new Error(name)
}
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'no-preference' })
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort())
  for (const route of routes) {
    const page = await context.newPage()
    page.setDefaultTimeout(8000)
    const errors = []
    const missing = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) missing.push({ url: response.url(), status: response.status() }) })
    try {
      await page.goto(`${base}/docs/5.3/${route}/`, { waitUntil: 'load' })
      await page.waitForFunction(() => window.TQAccessibility?.version && (window.bootstrap || !document.querySelector('.carousel,[data-bs-toggle="tooltip"]')))
      await page.evaluate(() => {
        window.__tqShownTooltips = new WeakSet()
        document.addEventListener('shown.bs.tooltip', event => window.__tqShownTooltips.add(event.target))
        document.addEventListener('hidden.bs.tooltip', event => window.__tqShownTooltips.delete(event.target))
      })
      const shownTooltip = async trigger => {
        const handle = await trigger.elementHandle()
        await page.waitForFunction(element => window.__tqShownTooltips.has(element) && (element.getAttribute('aria-describedby') || '').split(/\s+/).some(id => document.getElementById(id)?.matches('.tooltip.show')), handle)
        const id = await trigger.evaluate(element => (element.getAttribute('aria-describedby') || '').split(/\s+/).find(id => document.getElementById(id)?.matches('.tooltip.show')))
        return page.locator(`#${id}`)
      }
      assert(name, route, 'Published companion is available', await page.evaluate(() => Boolean(window.TQAccessibility?.init && window.TQAccessibility?.enhanceValidation)))
      if (route === 'components/tooltips') {
        const trigger = page.locator('.tooltip-demo [data-bs-toggle="tooltip"]').nth(1)
        await trigger.focus()
        await shownTooltip(trigger)
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
        assert(name, route, 'Obscuring inline tooltip dismisses with Escape without moving focus', await trigger.evaluate(element => element === document.activeElement))
        await page.locator('h1').focus().catch(() => {})
        await trigger.evaluate(element => element.blur())
        await page.mouse.move(1400, 900)
        await page.waitForTimeout(350)
        await trigger.hover()
        const tip = await shownTooltip(trigger)
        await tip.hover()
        await page.waitForTimeout(500)
        assert(name, route, 'Inline tooltip persists when hovered', await tip.evaluate(element => element.classList.contains('show')))
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
        await page.mouse.move(2, 998)
        await page.waitForTimeout(350)
        await trigger.hover()
        const reopened = await shownTooltip(trigger)
        assert(name, route, 'Inline tooltip reopens after Escape from its content', await reopened.isVisible())
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
        await page.mouse.move(2, 998)
        await page.waitForTimeout(350)
        const copy = page.locator('.btn-clipboard').first()
        await copy.focus()
        const copyTip = await shownTooltip(copy)
        assert(name, route, 'Programmatic copy-button tooltip uses the companion', await copy.evaluate(element => Boolean(bootstrap.Tooltip.getInstance(element)) && element.hasAttribute('data-tq-tooltip-source')))
        await page.keyboard.press('Escape')
        await copyTip.waitFor({ state: 'detached' })
        assert(name, route, 'Copy-button tooltip supports Escape', await copy.evaluate(element => element === document.activeElement))
      }
      if (route === 'components/popovers') {
        const trigger=page.locator('[data-bs-toggle="popover"][data-bs-trigger="focus"]').first()
        await trigger.focus()
        await page.waitForFunction(element=>Boolean(document.getElementById(element.getAttribute('aria-describedby'))?.matches('.popover.show')),await trigger.elementHandle())
        assert(name,route,'Focus popover uses native instance with managed descriptive persistence',await trigger.evaluate(element=>Boolean(bootstrap.Popover.getInstance(element))&&element.hasAttribute('data-tq-popover-source')))
        await page.keyboard.press('Escape')
        await page.waitForFunction(element=>!document.getElementById(element.getAttribute('aria-describedby'))?.matches('.popover.show'),await trigger.elementHandle())
        assert(name,route,'Focus popover dismisses through Escape and retains trigger focus',await trigger.evaluate(element=>document.activeElement===element))
        await trigger.evaluate(element=>element.blur());await page.mouse.move(2,998);await page.waitForTimeout(350)
        const hover=page.locator('[data-bs-toggle="popover"][data-bs-trigger="hover focus"]').first()
        await hover.hover()
        await page.waitForFunction(element=>Boolean(document.getElementById(element.getAttribute('aria-describedby'))?.matches('.popover.show')),await hover.elementHandle())
        const id=await hover.getAttribute('aria-describedby'),popup=page.locator(`#${id}`)
        await popup.hover();await page.waitForTimeout(500)
        assert(name,route,'Popover description stays visible while hovered',await popup.evaluate(element=>element.classList.contains('show')))
        await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.popover.show'))
        assert(name,route,'Hovered popover dismisses through Escape',await page.locator('.popover.show').count()===0)
        const click=page.locator('[data-bs-toggle="popover"]:not([data-bs-trigger])').first()
        await click.click()
        await page.waitForFunction(element=>Boolean(document.getElementById(element.getAttribute('aria-describedby'))?.matches('.popover.show')),await click.elementHandle())
        assert(name,route,'Click-only documentation popover keeps native public show method',await click.evaluate(element=>bootstrap.Popover.getInstance(element).show===bootstrap.Popover.prototype.show&&!element.hasAttribute('data-tq-popover-source')))
        await click.click()
      }
      if (route.includes('carousel') || route.includes('cheatsheet')) {
        const carousels = await page.locator('.carousel').count()
        assert(name, route, 'Every carousel has one pause/play control', carousels > 0 && await page.locator('[data-tq-carousel-rotation]').count() === carousels, { carousels })
        const timers = await page.locator('.carousel').evaluateAll(elements => elements.map(element => ({ id: element.id, running: Boolean(bootstrap.Carousel.getInstance(element)?._interval), live: element.getAttribute('aria-live') })))
        assert(name, route, 'All carousels start paused after native load initialization', timers.every(timer => !timer.running && timer.live === 'polite'), { timers })
        const first = page.locator('.carousel').first()
        const id = await first.getAttribute('id')
        const control = page.locator(`[data-tq-carousel-controls="${id}"] [data-tq-carousel-rotation]`)
        await control.click()
        assert(name, route, 'Explicit Play starts native rotation with a persistent pause action', await first.evaluate(element => Boolean(bootstrap.Carousel.getInstance(element)._interval)) && /Pause|إيقاف/.test(await control.textContent()))
        await first.locator('button,a[href],[tabindex]').first().focus()
        assert(name, route, 'Keyboard focus stops native rotation', !await first.evaluate(element => Boolean(bootstrap.Carousel.getInstance(element)._interval)))
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.waitForFunction(() => [...document.querySelectorAll('[data-tq-carousel-rotation]')].every(button => button.disabled))
        await first.evaluate(element => bootstrap.Carousel.getInstance(element).cycle())
        assert(name, route, 'Reduced motion disables optional rotation even through cycle()', !await first.evaluate(element => Boolean(bootstrap.Carousel.getInstance(element)._interval)) && await control.isDisabled())
        if (route === 'components/carousel') {
          const slides = page.locator('#carouselExampleSlidesOnly')
          const fallback = page.locator('[data-tq-carousel-controls="carouselExampleSlidesOnly"]')
          const index = () => slides.locator('.carousel-item').evaluateAll(elements => elements.findIndex(element => element.classList.contains('active')))
          assert(name, route, 'Slides-only variant has one enabled fallback pair under reduced motion', await fallback.locator('[data-tq-carousel-step]').count() === 2 && await fallback.locator('[data-tq-carousel-step="prev"]').isEnabled() && await fallback.locator('[data-tq-carousel-step="next"]').isEnabled())
          await fallback.getByRole('button', { name: 'Next slide', exact: true }).click()
          await page.waitForFunction(() => document.querySelector('#carouselExampleSlidesOnly .active') === document.querySelectorAll('#carouselExampleSlidesOnly .carousel-item')[1])
          assert(name, route, 'Slides-only pointer Next reaches slide2 under reduced motion', await index() === 1)
          const previous = fallback.getByRole('button', { name: 'Previous slide', exact: true })
          await previous.focus(); await previous.press('Enter')
          await page.waitForFunction(() => document.querySelector('#carouselExampleSlidesOnly .active') === document.querySelectorAll('#carouselExampleSlidesOnly .carousel-item')[0])
          assert(name, route, 'Slides-only keyboard Previous reaches slide1 under reduced motion', await index() === 0)
          const next = fallback.getByRole('button', { name: 'Next slide', exact: true })
          await next.focus(); await next.press('Space')
          await page.waitForFunction(() => document.querySelector('#carouselExampleSlidesOnly .active') === document.querySelectorAll('#carouselExampleSlidesOnly .carousel-item')[1])
          assert(name, route, 'Slides-only keyboard Next reaches slide2 under reduced motion', await index() === 1)
          await previous.click()
          await page.waitForFunction(() => document.querySelector('#carouselExampleSlidesOnly .active') === document.querySelectorAll('#carouselExampleSlidesOnly .carousel-item')[0])
          assert(name, route, 'Slides-only pointer Previous reaches slide1 under reduced motion', await index() === 0)
        }
      }
      if (route === 'forms/validation' || route.includes('checkout')) {
        const count = await page.locator('form.needs-validation').count()
        assert(name, route, 'Custom-validation forms have exactly one summary each', count > 0 && await page.locator('[data-tq-validation-summary]').count() === count, { forms: count })
        for (let index = 0; index < count; index++) {
          const form = page.locator('form.needs-validation').nth(index)
          await form.locator('[type="submit"]').click()
          const state = await form.evaluate(element => {
            const invalid = [...element.elements].filter(field => field.willValidate && !field.validity.valid)
            const summary = element.querySelector('[data-tq-validation-summary]')
            return { count: invalid.length, links: summary.querySelectorAll('a').length, focused: summary === document.activeElement, visible: !summary.hidden, fields: invalid.map(field => ({ id: field.id, invalid: field.getAttribute('aria-invalid'), feedback: (field.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)).filter(Boolean).map(node => ({ id: node.id, visible: Boolean(node.getClientRects().length), text: node.textContent.trim(), error: node.classList.contains('invalid-feedback') })) })) }
          })
          assert(name, route, `Form ${index + 1}: invalid submit focuses a linked summary`, state.count > 0 && state.links === state.count && state.focused && state.visible, state)
          assert(name, route, `Form ${index + 1}: each invalid control has a persistent associated error`, state.fields.every(field => field.id && field.invalid === 'true' && field.feedback.some(feedback => feedback.error && feedback.visible && feedback.text)), state)
          const errorLink = form.locator('[data-tq-validation-summary] a').first()
          const target = await errorLink.evaluate(element => decodeURIComponent(new URL(element.href).hash.slice(1)))
          await errorLink.click()
          await page.waitForFunction(id => document.activeElement?.id === id, target, { timeout: 2000 })
          const focus = await form.evaluate(element => ({ target: document.activeElement.id, tag: document.activeElement.tagName, inside: element.contains(document.activeElement) }))
          assert(name, route, `Form ${index + 1}: error summary link focuses its exact field`, focus.inside && focus.target === target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(focus.tag), focus)
        }
      }
      if (route.includes('cheatsheet') || route === 'examples/sidebars') {
        const trigger = page.locator('[data-bs-toggle="tooltip"]').first()
        await trigger.focus()
        await shownTooltip(trigger)
        await page.keyboard.press('Escape')
        await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
        assert(name, route, 'Standalone example tooltip is keyboard dismissible', await trigger.evaluate(element => document.activeElement === element))
      }
      assert(name, route, 'No JavaScript errors or missing local assets', errors.length === 0 && missing.length === 0, { errors, missing })
    } catch (error) { report.findings.push({ browser: name, route, error: error.stack || error.message, errors, missing }) }
    report.visits.push({ browser: name, route, errors, missing })
    await page.close()
  }
  await context.close()
  await browser.close()
}
report.finished = new Date().toISOString()
report.assetsAtEnd = await fingerprints()
report.summary = { browsers: 3, routes: routes.length, visits: report.visits.length, checks: report.checks.length, passed: report.checks.filter(check => check.pass).length, findings: report.findings.length, assetsFrozen: JSON.stringify(report.assetsAtStart) === JSON.stringify(report.assetsAtEnd), scriptFrozen: report.assetsAtStart['qa/remediation/accessibility-production.mjs'] === report.assetsAtEnd['qa/remediation/accessibility-production.mjs'] }
await fs.writeFile(path.join(out, 'accessibility-production.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.summary))
if (report.findings.length || !report.summary.assetsFrozen) process.exitCode = 1
