import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'
import { chromium, firefox, webkit } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const out = path.join(root, 'qa/results/remediation')
const base = process.env.TQ_BASE || 'http://127.0.0.1:5198'
const sha = value => createHash('sha256').update(value).digest('hex')
const inputs = ['src/js/tq-accessibility.js', 'dist/js/bootstrap.bundle.min.js', 'dist/css/bootstrap.min.css', 'qa/remediation/accessibility-behaviour.mjs']
const fingerprints = async () => Object.fromEntries(await Promise.all(inputs.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])))
const report = { suite: 'Accessibility companion regression: real pointer/keyboard and native public API', started: new Date().toISOString(), pages: [], checks: [], findings: [], assetsAtStart: await fingerprints() }
const compiled = (await build({ entryPoints: [path.join(root, 'src/js/tq-accessibility.js')], bundle: true, write: false, format: 'iife', globalName: 'TQAccessibility', platform: 'browser' })).outputFiles[0].text
const fixture = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Accessibility regression fixture</title><link href="${base}/dist/css/bootstrap.min.css" rel="stylesheet"></head><body class="p-4">
<p id="tip-help">Existing descriptive help.</p><button id="tip" class="btn btn-primary" data-bs-toggle="tooltip" data-bs-title="Persistent descriptive tooltip" aria-describedby="tip-help">Tooltip trigger</button><button id="outside" class="btn btn-secondary">Outside</button>
<button id="interactive" class="btn btn-primary" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="&lt;a href='/help'&gt;Interactive help&lt;/a&gt;">Interactive tooltip rejection</button>
<button id="clicktip" class="btn btn-primary" data-bs-toggle="tooltip" data-bs-trigger="click" data-bs-title="Click tooltip">Click tooltip trigger</button>
<a id="focusPopover" tabindex="0" role="button" class="btn btn-secondary" data-bs-toggle="popover" data-bs-trigger="focus" data-bs-title="Focus description" data-bs-content="Persistent focus description">Focus popover</a>
<span id="hoverPopover" class="d-inline-block" tabindex="0" data-bs-toggle="popover" data-bs-trigger="hover focus" data-bs-content="Persistent hover description"><button type="button" class="btn btn-secondary" disabled>Disabled popover trigger</button></span>
<button id="clickPopover" class="btn btn-secondary" data-bs-toggle="popover" data-bs-content="Native click content">Click popover</button>
<div id="rotation" class="carousel my-4" data-bs-ride="carousel" data-bs-interval="100"><div class="carousel-inner"><div class="carousel-item active"><p class="p-4 bg-primary text-white">First slide <a href="#other" class="link-light">Slide link</a></p></div><div class="carousel-item"><p class="p-4 bg-secondary text-white">Second slide <a href="#other" class="link-light">Other slide link</a></p></div></div><button class="carousel-control-next" type="button" data-bs-target="#rotation" data-bs-slide="next"><span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">Next</span></button></div>
<div id="slidesOnly" class="carousel my-4" data-bs-ride="carousel" data-bs-interval="100"><div class="carousel-inner"><div class="carousel-item active"><p class="p-4 bg-primary text-white">Only slide one</p></div><div class="carousel-item"><p class="p-4 bg-secondary text-white">Only slide two</p></div></div></div>
<form id="validation" class="needs-validation" novalidate><div class="mb-3"><label for="required" class="form-label">Required field</label><input id="required" class="form-control" required aria-describedby="field-help"><div id="field-help">Keep this help.</div><div class="invalid-feedback">Enter a required value.</div></div><div class="mb-3"><label for="email" class="form-label">Email</label><input id="email" type="email" class="form-control" required><div class="invalid-tooltip">Enter a valid email address.</div></div><div class="mb-3"><label for="existing" class="form-label">Existing association</label><input id="existing" required value="Already valid" class="form-control" aria-describedby="existing-feedback"><div id="existing-feedback" class="invalid-feedback">Original described message.</div></div><button type="submit" class="btn btn-primary">Submit</button><button type="reset" class="btn btn-secondary">Reset</button></form>
<script src="${base}/dist/js/bootstrap.bundle.min.js"></script><script>${compiled.replaceAll('</script', '<\\/script')}</script><script>TQAccessibility.init();TQAccessibility.init();TQAccessibility.init();document.querySelector('#validation').addEventListener('submit',event=>event.preventDefault());</script></body></html>`
const assert = (browser, name, pass, details = {}) => {
  report.checks.push({ browser, name, pass, ...details })
  if (!pass) throw new Error(name)
}
await fs.mkdir(out, { recursive: true })
for (const [name, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => (process.env.TQ_A11Y_BROWSERS || 'chromium,firefox,webkit').split(',').includes(name))) {
  const browser = await engine.launch()
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 }, reducedMotion: 'no-preference' })
  await context.route(`${base}/qa/remediation/accessibility-fixture`, route => route.fulfill({ contentType: 'text/html', body: fixture }))
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.setDefaultTimeout(6000)
  const fresh = async () => { await page.goto(`${base}/qa/remediation/accessibility-fixture`, { waitUntil: 'load' }); await page.mouse.move(1000, 850) }
  const run = async (test, task) => {
    try { await fresh(); await task() } catch (error) { report.findings.push({ browser: name, test, error: error.stack || error.message }) }
  }
  await run('tooltip-pointer-persistence-Escape', async () => {
    await page.locator('#tip').hover()
    await page.locator('.tooltip.show').waitFor()
    await page.locator('.tooltip.show').hover()
    await page.waitForTimeout(600)
    assert(name, 'Tooltip stays visible while its content is hovered', await page.locator('.tooltip.show').count() === 1)
    const descriptions = await page.locator('#tip').getAttribute('aria-describedby')
    assert(name, 'Tooltip retains original descriptions while shown', descriptions.split(/\s+/).includes('tip-help') && descriptions.split(/\s+/).length === 2, { descriptions })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
    assert(name, 'Escape dismisses hovered tooltip', await page.locator('.tooltip.show').count() === 0)
    await page.waitForFunction(() => document.querySelector('#tip').getAttribute('aria-describedby') === 'tip-help')
    assert(name, 'Tooltip restores original descriptions after hide', await page.locator('#tip').getAttribute('aria-describedby') === 'tip-help')
    await page.mouse.move(1000, 850)
    await page.waitForTimeout(350)
    await page.locator('#tip').hover()
    await page.locator('.tooltip.show').waitFor()
    assert(name, 'Tooltip reopens after leaving escaped tooltip content', await page.locator('.tooltip.show').count() === 1)
  })
  await run('tooltip-combined-focus-and-hover', async () => {
    await page.locator('#tip').focus()
    await page.locator('.tooltip.show').waitFor()
    await page.waitForTimeout(250)
    const id = await page.locator('.tooltip.show').getAttribute('id')
    await page.locator('#tip').hover()
    await page.waitForTimeout(500)
    assert(name, 'Adding pointer hover to a focused tooltip preserves the same visible tip', await page.locator('.tooltip.show').count() === 1 && await page.locator('.tooltip.show').getAttribute('id') === id)
    await page.locator('#tip').evaluate(element => bootstrap.Tooltip.getInstance(element).setContent({ '.tooltip-inner': 'Updated persistent description' }))
    await page.waitForTimeout(500)
    assert(name, 'Public setContent updates a visible tooltip without premature hide', await page.locator('.tooltip.show').count() === 1 && await page.locator('.tooltip.show .tooltip-inner').textContent() === 'Updated persistent description')
  })
  await run('tooltip-keyboard-public-methods-disposal', async () => {
    await page.locator('#tip').focus()
    await page.locator('.tooltip.show').waitFor()
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
    assert(name, 'Escape keeps keyboard focus on tooltip trigger', await page.locator('#tip').evaluate(element => element === document.activeElement))
    await page.locator('#outside').focus()
    await page.waitForTimeout(300)
    const methods = await page.evaluate(async () => {
      const trigger = document.querySelector('#tip')
      const events = []
      for (const type of ['show', 'shown', 'hide', 'hidden']) trigger.addEventListener(`${type}.bs.tooltip`, () => events.push(type))
      let tooltip = bootstrap.Tooltip.getInstance(trigger)
      const hidden = new Promise(resolve => trigger.addEventListener('hidden.bs.tooltip', resolve, { once: true }))
      const shown = new Promise(resolve => trigger.addEventListener('shown.bs.tooltip', resolve, { once: true }))
      tooltip.show(); await shown; tooltip.update(); tooltip.hide(); await hidden
      tooltip.dispose()
      const cleared = bootstrap.Tooltip.getInstance(trigger) === null
      TQAccessibility.init()
      tooltip = bootstrap.Tooltip.getInstance(trigger)
      return { events, cleared, reinitialised: Boolean(tooltip), identity: tooltip === TQAccessibility.createTooltip(trigger) }
    })
    assert(name, 'Tooltip retains native public show/hide/update events', JSON.stringify(methods.events) === JSON.stringify(['show', 'shown', 'hide', 'hidden']), methods)
    assert(name, 'Tooltip dispose and repeated initialization are safe', methods.cleared && methods.reinitialised && methods.identity, methods)
    await page.locator('#tip').focus()
    await page.locator('.tooltip.show').waitFor()
    assert(name, 'Tooltip works after disposal and reinitialization', await page.locator('.tooltip.show').count() === 1)
  })
  await run('interactive-tooltip-rejected', async () => {
    await page.evaluate(() => { window.interactiveWarning = false; document.querySelector('#interactive').addEventListener('interactive.tq.tooltip', () => { window.interactiveWarning = true }) })
    await page.locator('#interactive').focus()
    await page.waitForFunction(() => window.interactiveWarning)
    await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
    assert(name, 'Interactive tooltip content is rejected in favour of managed help UI', await page.evaluate(() => window.interactiveWarning) && await page.locator('.tooltip.show').count() === 0)
  })
  await run('click-tooltip-public-hide-and-reopen', async () => {
    await page.locator('#clicktip').click()
    await page.locator('.tooltip.show').waitFor()
    assert(name, 'Click-configured tooltip opens through its native trigger interface', await page.locator('.tooltip.show').count() === 1)
    await page.locator('#clicktip').evaluate(async element => {
      const hidden = new Promise(resolve => element.addEventListener('hidden.bs.tooltip', resolve, { once: true }))
      bootstrap.Tooltip.getInstance(element).hide()
      await hidden
    })
    assert(name, 'Native hide() dismisses a click-configured tooltip', await page.locator('.tooltip.show').count() === 0)
    await page.locator('#clicktip').click()
    await page.locator('.tooltip.show').waitFor()
    assert(name, 'Click trigger reopens immediately after native hide()', await page.locator('.tooltip.show').count() === 1)
  })
  await run('focus-hover-popover-dismissal-persistence-public-API', async () => {
    await page.locator('#focusPopover').focus()
    await page.locator('.popover.show').waitFor()
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.popover.show'))
    assert(name, 'Focus-triggered popover supports Escape without moving focus', await page.locator('#focusPopover').evaluate(element => element === document.activeElement))
    await page.locator('#outside').focus(); await page.waitForTimeout(300)
    await page.locator('#hoverPopover').hover()
    await page.locator('.popover.show').waitFor()
    await page.locator('.popover.show').hover(); await page.waitForTimeout(500)
    assert(name, 'Hover-triggered popover persists while its descriptive content is hovered', await page.locator('.popover.show').count() === 1)
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.popover.show'))
    assert(name, 'Hovered popover supports Escape dismissal', await page.locator('.popover.show').count() === 0)
    await page.mouse.move(1000, 850); await page.waitForTimeout(350)
    await page.locator('#hoverPopover').hover(); await page.locator('.popover.show').waitFor()
    assert(name, 'Popover reopens after leaving escaped descriptive content', await page.locator('.popover.show').count() === 1)
    await page.locator('#hoverPopover').focus()
    await page.locator('#hoverPopover').evaluate(element => bootstrap.Popover.getInstance(element).setContent({ '.popover-body': 'Updated persistent popover' }))
    await page.waitForTimeout(500)
    assert(name, 'Popover public setContent remains visible and native', await page.locator('.popover.show .popover-body').textContent() === 'Updated persistent popover')
    const lifecycle = await page.locator('#hoverPopover').evaluate(element => { bootstrap.Popover.getInstance(element).dispose(); const cleared = bootstrap.Popover.getInstance(element) === null; TQAccessibility.init(element); TQAccessibility.init(element); return { cleared, reinitialised: Boolean(bootstrap.Popover.getInstance(element)), identity: bootstrap.Popover.getInstance(element) === TQAccessibility.createPopover(element) } })
    assert(name, 'Popover dispose and repeated initialization remain safe', lifecycle.cleared && lifecycle.reinitialised && lifecycle.identity, lifecycle)
    await page.locator('#outside').focus(); await page.locator('#hoverPopover').focus(); await page.locator('.popover.show').waitFor()
    assert(name, 'Managed popover works after disposal and reinitialization', await page.locator('.popover.show').count() === 1)
  })
  await run('click-only-popover-remains-native', async () => {
    const native = await page.locator('#clickPopover').evaluate(element => { const instance = bootstrap.Popover.getInstance(element); return instance.show === bootstrap.Popover.prototype.show && !element.hasAttribute('data-tq-popover-source') })
    await page.locator('#clickPopover').click()
    await page.waitForFunction(() => document.getElementById(document.querySelector('#clickPopover').getAttribute('aria-describedby'))?.classList.contains('show'))
    assert(name, 'Click-only popover retains native implementation and opens once', native && await page.locator('#clickPopover').evaluate(element => Boolean(document.getElementById(element.getAttribute('aria-describedby'))?.classList.contains('show'))))
    await page.locator('#clickPopover').click()
    await page.waitForFunction(() => !document.getElementById(document.querySelector('#clickPopover').getAttribute('aria-describedby'))?.classList.contains('show'))
    assert(name, 'Click-only popover toggles closed without duplicate listeners', await page.locator('#clickPopover').evaluate(element => !document.getElementById(element.getAttribute('aria-describedby'))?.classList.contains('show')))
  })
  await run('native-selector-delegation-dynamic-children', async () => {
    await page.evaluate(() => {
      const container = document.createElement('div'); container.id='delegate'; document.querySelector('#outside').after(container)
      container.setAttribute('data-bs-config', JSON.stringify({ selector: '.dynamic-tip', trigger: 'hover focus' }))
      window.__delegate = TQAccessibility.createTooltip(container, { title: 'Delegated descriptive tooltip', placement: 'bottom' })
      container.innerHTML='<button id="dynamicTip" class="dynamic-tip btn btn-secondary">Dynamic child</button>'
    })
    await page.locator('#dynamicTip').hover(); await page.locator('.tooltip.show').waitFor()
    assert(name, 'Delegated pointer trigger lazily enhances a dynamically inserted child', await page.locator('#dynamicTip').evaluate(element => Boolean(bootstrap.Tooltip.getInstance(element)) && Boolean(document.getElementById(element.getAttribute('aria-describedby'))?.classList.contains('show'))))
    const delegatedOptions=await page.locator('#dynamicTip').evaluate(element=>({title:bootstrap.Tooltip.getInstance(element)._config.title,placement:bootstrap.Tooltip.getInstance(element)._config.placement}))
    assert(name, 'Delegated native options retain inherited title and placement', await page.locator('.tooltip.show .tooltip-inner').textContent() === 'Delegated descriptive tooltip' && delegatedOptions.placement==='bottom',delegatedOptions)
    await page.locator('.tooltip.show').hover(); await page.waitForTimeout(500)
    assert(name, 'Delegated descriptive popup remains hoverable', await page.locator('.tooltip.show').count() === 1)
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
    await page.mouse.move(1000,850); await page.waitForTimeout(300); await page.locator('#dynamicTip').focus(); await page.locator('.tooltip.show').waitFor()
    assert(name, 'Delegated keyboard focus opens the same native child instance', await page.locator('#dynamicTip').evaluate(element => bootstrap.Tooltip.getInstance(element) === TQAccessibility.createTooltip(element)))
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
    assert(name, 'Delegated Escape keeps keyboard focus on dynamic child', await page.locator('#dynamicTip').evaluate(element => document.activeElement === element))
    const disposed = await page.evaluate(() => { window.__delegate.dispose(); return bootstrap.Tooltip.getInstance(document.querySelector('#delegate')) === null && bootstrap.Tooltip.getInstance(document.querySelector('#dynamicTip')) === null })
    assert(name, 'Delegated disposal removes parent and owned native child instances', disposed)
    await page.locator('#outside').focus(); await page.mouse.move(1000,850)
    await page.locator('#dynamicTip').hover(); await page.waitForTimeout(350)
    assert(name, 'Disposed delegated listeners cannot recreate dynamic children', await page.locator('.tooltip.show').count() === 0)
    await page.evaluate(() => { const config={title:'Reinitialized delegated tooltip'}; TQAccessibility.createTooltip(document.querySelector('#delegate'),config); TQAccessibility.dispose(document.querySelector('#delegate')); TQAccessibility.createTooltip(document.querySelector('#delegate'),config) })
    await page.locator('#outside').focus(); await page.mouse.move(1000,850); await page.locator('#dynamicTip').focus(); await page.locator('.tooltip.show').waitFor()
    assert(name, 'Delegated factory works after scope disposal and reinitialization', await page.locator('.tooltip.show').count() === 1)
  })
  await run('carousel-paused-play-pause-focus-API-disposal', async () => {
    await page.waitForTimeout(450)
    const active = () => page.locator('#rotation .carousel-item').evaluateAll(elements => elements.findIndex(element => element.classList.contains('active')))
    assert(name, 'Native data-bs-ride carousel starts paused after window load', await active() === 0)
    assert(name, 'Carousel has one persistent native button control after repeated init', await page.locator('[data-tq-carousel-controls="rotation"] button').count() === 1)
    assert(name, 'Carousel retains original data-bs attributes', await page.locator('#rotation').getAttribute('data-bs-ride') === 'carousel')
    await page.locator('[data-tq-carousel-controls="rotation"]').getByRole('button', { name: 'Play slides', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('#rotation .carousel-item.active') !== document.querySelector('#rotation .carousel-item'))
    assert(name, 'Explicit Play uses native slide rotation', await active() === 1)
    await page.locator('[data-tq-carousel-controls="rotation"]').getByRole('button', { name: 'Pause slides', exact: true }).click()
    const paused = await active()
    await page.waitForTimeout(450)
    assert(name, 'Persistent Pause stops rotation', await active() === paused)
    await page.locator('[data-tq-carousel-controls="rotation"]').getByRole('button', { name: 'Play slides', exact: true }).click()
    await page.locator('#rotation .active a').focus()
    const focused = await active()
    await page.waitForTimeout(450)
    assert(name, 'Keyboard focus pauses rotation persistently', await active() === focused && await page.locator('[data-tq-carousel-controls="rotation"]').getByRole('button', { name: 'Play slides', exact: true }).count() === 1)
    await page.locator('#outside').focus()
    await page.waitForTimeout(250)
    assert(name, 'Leaving keyboard focus does not silently restart rotation', await active() === focused)
    const result = await page.evaluate(() => {
      const element = document.querySelector('#rotation')
      let carousel = bootstrap.Carousel.getInstance(element)
      let slides = 0
      element.addEventListener('slid.bs.carousel', () => slides++)
      const before = [...element.querySelectorAll('.carousel-item')].findIndex(item => item.classList.contains('active'))
      carousel.next()
      const after = [...element.querySelectorAll('.carousel-item')].findIndex(item => item.classList.contains('active'))
      carousel.dispose()
      const cleared = bootstrap.Carousel.getInstance(element) === null && !document.querySelector('[data-tq-carousel-controls="rotation"]')
      TQAccessibility.init()
      carousel = bootstrap.Carousel.getInstance(element)
      return { before, after, slides, cleared, reinitialised: Boolean(carousel), controls: document.querySelectorAll('[data-tq-carousel-controls="rotation"]').length }
    })
    assert(name, 'Carousel native programmatic method/events are preserved', result.before !== result.after && result.slides === 1, result)
    assert(name, 'Carousel disposal and reinitialization remove duplicate controls', result.cleared && result.reinitialised && result.controls === 1, result)
  })
  await run('carousel-reduced-motion', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => document.querySelector('[data-tq-carousel-controls="rotation"] button').disabled)
    const result = await page.evaluate(() => {
      const element = document.querySelector('#rotation')
      bootstrap.Carousel.getInstance(element).cycle()
      return [...element.querySelectorAll('.carousel-item')].findIndex(item => item.classList.contains('active'))
    })
    await page.waitForTimeout(450)
    assert(name, 'Reduced motion prevents autoplay including public cycle()', await page.locator('#rotation .carousel-item').evaluateAll(elements => elements.findIndex(element => element.classList.contains('active'))) === result)
    assert(name, 'Reduced-motion control explains paused rotation', await page.locator('[data-tq-carousel-controls="rotation"]').getByRole('button', { name: 'Slide rotation off (reduced motion)', exact: true }).isDisabled())
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    assert(name, 'Reduced-motion preference does not modify data/API availability', await page.locator('#rotation').getAttribute('data-bs-ride') === 'carousel')
  })
  await run('slides-only-keyboard-pointer-reduced-motion-disposal', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.waitForFunction(() => document.querySelector('[data-tq-carousel-controls="slidesOnly"] [data-tq-carousel-rotation]').disabled)
    const group = page.locator('[data-tq-carousel-controls="slidesOnly"]')
    const active = () => page.locator('#slidesOnly .carousel-item').evaluateAll(elements => elements.findIndex(element => element.classList.contains('active')))
    assert(name, 'Slides-only carousel has one fallback pair and one rotation control', await group.locator('[data-tq-carousel-step]').count() === 2 && await group.locator('[data-tq-carousel-rotation]').count() === 1)
    assert(name, 'Slides-only reduced-motion default is paused on first slide', await active() === 0 && await group.locator('[data-tq-carousel-rotation]').isDisabled())
    await group.getByRole('button', { name: 'Next slide', exact: true }).click()
    assert(name, 'Slides-only pointer Next reaches the second slide under reduced motion', await active() === 1)
    const previous = group.getByRole('button', { name: 'Previous slide', exact: true })
    await previous.focus(); await previous.press('Enter')
    assert(name, 'Slides-only keyboard Previous returns to first slide under reduced motion', await active() === 0)
    const next = group.getByRole('button', { name: 'Next slide', exact: true })
    await next.focus(); await next.press('Space')
    assert(name, 'Slides-only keyboard Next reaches second slide under reduced motion', await active() === 1)
    await previous.click()
    assert(name, 'Slides-only pointer Previous returns to first slide under reduced motion', await active() === 0)
    const reinitialised = await page.evaluate(() => {
      const element = document.querySelector('#slidesOnly')
      bootstrap.Carousel.getInstance(element).dispose()
      const cleared = !document.querySelector('[data-tq-carousel-controls="slidesOnly"]')
      TQAccessibility.init(element); TQAccessibility.init(element)
      return { cleared, groups: document.querySelectorAll('[data-tq-carousel-controls="slidesOnly"]').length, steps: document.querySelectorAll('[data-tq-carousel-controls="slidesOnly"] [data-tq-carousel-step]').length }
    })
    assert(name, 'Slides-only disposal/reinitialization creates one fallback group', reinitialised.cleared && reinitialised.groups === 1 && reinitialised.steps === 2, reinitialised)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
  })
  await run('persistent-validation-and-reinitialization', async () => {
    assert(name, 'Repeated validation initialization creates one summary', await page.locator('[data-tq-validation-summary]').count() === 1)
    await page.locator('#validation button[type=submit]').click()
    const result = await page.locator('#validation').evaluate(form => {
      const invalid = [...form.elements].filter(field => field.willValidate && !field.validity.valid)
      const summary = form.querySelector('[data-tq-validation-summary]')
      return { count: invalid.length, focus: document.activeElement === summary, live: summary.getAttribute('aria-live'), links: summary.querySelectorAll('a').length, fields: invalid.map(field => ({ id: field.id, invalid: field.getAttribute('aria-invalid'), descriptions: (field.getAttribute('aria-describedby') || '').split(/\s+/).map(id => ({ id, exists: Boolean(document.getElementById(id)), visible: Boolean(document.getElementById(id)?.getClientRects().length), text: document.getElementById(id)?.textContent.trim() })) })) }
    })
    assert(name, 'Invalid submit focuses a live summary with links to each invalid field', result.count === 2 && result.focus && result.live === 'polite' && result.links === 2, result)
    assert(name, 'Every invalid field has an associated persistent visible error', result.fields.every(field => field.invalid === 'true' && field.descriptions.some(description => description.exists && description.visible && /Enter/.test(description.text))), result)
    assert(name, 'Original help associations are retained on invalid fields', result.fields.find(field => field.id === 'required').descriptions.some(description => description.id === 'field-help'), result)
    assert(name, 'Tooltip-style validation becomes persistent inline feedback', await page.locator('#email').evaluate(element => element.parentElement.querySelector('.invalid-feedback.d-block') !== null && element.parentElement.querySelector('.invalid-tooltip') === null))
    await page.locator('[data-tq-validation-summary] a').first().click()
    assert(name, 'Summary links move focus to the affected field', await page.locator('#required').evaluate(element => element === document.activeElement))
    await page.locator('#email').focus()
    assert(name, 'Error stays visible after leaving the affected field', await page.locator('#required').evaluate(element => getComputedStyle(document.getElementById(element.getAttribute('aria-describedby').split(/\s+/).find(id => id !== 'field-help'))).display !== 'none'))
    await page.locator('#required').fill('Corrected')
    assert(name, 'Correcting a field removes its error association but keeps help', await page.locator('#required').getAttribute('aria-describedby') === 'field-help' && await page.locator('#required').getAttribute('aria-invalid') === null)
    assert(name, 'Pre-existing error descriptions are not removed from valid fields', await page.locator('#existing').getAttribute('aria-describedby') === 'existing-feedback')
    await page.locator('#email').fill('valid@example.com')
    assert(name, 'Corrected form hides its error summary', await page.locator('[data-tq-validation-summary]').isHidden())
    await page.locator('#validation button[type=reset]').click()
    assert(name, 'Reset clears validation state and retains original associations', !await page.locator('#validation').evaluate(form => form.classList.contains('was-validated')) && await page.locator('#existing').getAttribute('aria-describedby') === 'existing-feedback')
    const disposed = await page.evaluate(() => {
      const form = document.querySelector('#validation')
      TQAccessibility.enhanceValidation(form).dispose()
      const cleared = !form.querySelector('[data-tq-validation-summary]')
      TQAccessibility.init(form)
      TQAccessibility.init(form)
      return { cleared, summaries: form.querySelectorAll('[data-tq-validation-summary]').length }
    })
    assert(name, 'Validation disposal and reinitialization are safe', disposed.cleared && disposed.summaries === 1, disposed)
    await page.locator('#validation button[type=submit]').click()
    assert(name, 'Validation works after disposal/reinitialization', await page.locator('[data-tq-validation-summary]').isVisible())
  })
  await run('exported-live-markup-fresh-document', async () => {
    await page.locator('#validation button[type=submit]').click()
    await page.locator('#tip').focus()
    await page.locator('.tooltip.show').waitFor()
    const snapshot = await page.evaluate(() => {
      const clone = document.body.cloneNode(true)
      // Native tooltip portals live outside the exported example, just as in StackBlitz.
      clone.querySelectorAll('script,.tooltip,.popover').forEach(element => element.remove())
      return clone.innerHTML
    })
    const exported = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fresh exported example</title><link href="${base}/dist/css/bootstrap.min.css" rel="stylesheet"></head><body>${snapshot}<script src="${base}/dist/js/bootstrap.bundle.min.js"></script><script>${compiled.replaceAll('</script', '<\\/script')}</script><script>TQAccessibility.init();TQAccessibility.init();document.querySelector('#validation').addEventListener('submit',event=>event.preventDefault())</script></body></html>`
    await context.route(`${base}/qa/remediation/accessibility-export`, route => route.fulfill({ contentType: 'text/html', body: exported }))
    await page.goto(`${base}/qa/remediation/accessibility-export`, { waitUntil: 'load' })
    assert(name, 'Fresh exported carousel has exactly one reconstructed control', await page.locator('[data-tq-carousel-controls="rotation"]').count() === 1)
    assert(name, 'Fresh exported slides-only carousel reconstructs one fallback pair', await page.locator('[data-tq-carousel-controls="slidesOnly"]').count() === 1 && await page.locator('[data-tq-carousel-controls="slidesOnly"] [data-tq-carousel-step]').count() === 2)
    assert(name, 'Fresh exported validation has one clean hidden summary', await page.locator('[data-tq-validation-summary]').count() === 1 && await page.locator('[data-tq-validation-summary]').isHidden())
    assert(name, 'Fresh export clears only companion transient validation state', await page.locator('#required').getAttribute('aria-invalid') === null && await page.locator('#required').getAttribute('aria-describedby') === 'field-help' && !await page.locator('#validation').evaluate(form => form.classList.contains('was-validated')))
    assert(name, 'Fresh export retains author feedback associations', await page.locator('#existing').getAttribute('aria-describedby') === 'existing-feedback')
    assert(name, 'Fresh exported tooltip has no stale generated description ID', await page.locator('#tip').getAttribute('aria-describedby') === 'tip-help')
    await page.locator('#tip').focus()
    await page.locator('.tooltip.show').waitFor()
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('.tooltip.show'))
    assert(name, 'Fresh exported tooltip remains keyboard dismissible', await page.locator('#tip').evaluate(element => element === document.activeElement))
    await page.locator('#validation button[type=submit]').click()
    assert(name, 'Fresh exported form revalidates with a single focused error summary', await page.locator('[data-tq-validation-summary]').evaluate(element => !element.hidden && element === document.activeElement))
  })
  await run('preexisting-server-state-disposal', async () => {
    const result = await page.evaluate(() => {
      const form = document.querySelector('#validation')
      TQAccessibility.enhanceValidation(form).dispose()
      const field = document.querySelector('#existing')
      field.classList.add('is-invalid')
      field.setAttribute('aria-invalid', 'true')
      const before = { class: field.className, invalid: field.getAttribute('aria-invalid'), describedby: field.getAttribute('aria-describedby'), id: field.id }
      const validation = TQAccessibility.enhanceValidation(form)
      validation.validate()
      validation.dispose()
      const after = { class: field.className, invalid: field.getAttribute('aria-invalid'), describedby: field.getAttribute('aria-describedby'), id: field.id }
      return { before, after }
    })
    assert(name, 'Pre-existing server invalid classes and ARIA survive enhancement disposal', JSON.stringify(result.before) === JSON.stringify(result.after), result)
  })
  report.checks.push({browser:name,name:'No page JavaScript errors',pass:errors.length===0,errors})
  if(errors.length)report.findings.push({browser:name,test:'No page JavaScript errors',errors})
  report.pages.push({ browser: name, tests: 13, errors })
  await context.close()
  await browser.close()
}
report.finished = new Date().toISOString()
report.assetsAtEnd = await fingerprints()
report.summary = { browsers: report.pages.length, checks: report.checks.length, passed: report.checks.filter(check => check.pass).length, findings: report.findings.length, assetsFrozen: JSON.stringify(report.assetsAtStart) === JSON.stringify(report.assetsAtEnd), scriptFrozen: report.assetsAtStart[inputs.at(-1)] === report.assetsAtEnd[inputs.at(-1)] }
await fs.writeFile(path.join(out, 'accessibility-behaviour.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.summary))
if (report.findings.length || !report.summary.assetsFrozen) process.exitCode = 1
