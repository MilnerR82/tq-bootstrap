import fs from 'node:fs/promises'
import path from 'node:path'
import http from 'node:http'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium, firefox, webkit } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.join(root, 'qa/results/remediation')
const sha = value => createHash('sha256').update(value).digest('hex')
const files = [process.env.TQ_FOCUS_CSS || 'dist/css/bootstrap.min.css', 'upstream/bootstrap/dist/css/bootstrap.min.css', 'qa/remediation/forced-focus-state.mjs', 'dist/js/bootstrap.bundle.min.js', 'qa/remediation/focus-surface-inventory.json']
const pictureDirectory = `forced-focus-${process.env.TQ_FOCUS_TAG || 'final'}`
const hashes = async () => Object.fromEntries(await Promise.all(files.map(async file => [file, sha(await fs.readFile(path.join(root, file)))])))
const html = (mode, theme) => `<!doctype html><html lang="en" data-bs-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Forced-colours focus and native states</title><link rel="stylesheet" href="/${mode}.css"><style>main{padding:24px;max-width:1000px}.samples{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:12px}.sample{min-height:44px;padding:8px}.host{padding:20px;margin:6px}pre{max-width:360px;overflow:auto}#system{color:CanvasText;background:Canvas;position:absolute;inset-inline-start:-10000px}#forced-palette-probe{forced-color-adjust:auto;color:rgb(18,52,86);background:rgb(171,205,239);position:absolute;inset-inline-start:-10000px}</style></head><body><main><h1 class="h3">Keyboard focus and control-state fixture</h1><button id="start" type="button" tabindex="-1">Reset focus position</button><span id="system">System colour measurement</span><span id="forced-palette-probe">Automatic palette capability</span><div class="samples">
<div class="sample"><button id="primary" type="button" class="btn btn-primary">Primary</button></div>
<div class="sample"><button id="close" type="button" class="btn-close" aria-label="Close"></button></div>
<div class="sample navbar"><button id="toggle" type="button" class="navbar-toggler" aria-label="Toggle navigation"><span class="navbar-toggler-icon" aria-hidden="true"></span></button></div>
<div class="sample nav"><a id="nav" class="nav-link" href="#end" tabindex="0">Navigation</a></div>
<div class="sample accordion"><button id="accordion" class="accordion-button collapsed" type="button">Accordion</button></div>
<div class="sample"><nav aria-label="Fixture pagination"><ul class="pagination mb-0"><li class="page-item"><a id="page" class="page-link" href="#end" tabindex="0">2</a></li></ul></nav></div>
<div class="sample"><label for="input" class="form-label">Text input</label><input id="input" class="form-control"></div>
<div class="sample"><label for="select" class="form-label">Select</label><select id="select" class="form-select"><option>First</option><option>Second</option></select></div>
<div class="sample"><label for="plaintext" class="form-label">Readonly plaintext</label><input id="plaintext" class="form-control-plaintext" readonly value="Readonly content"></div>
<div class="sample form-check"><input id="check" class="form-check-input" type="checkbox"><label class="form-check-label" for="check">Checkbox</label></div>
<div class="sample form-check"><input id="radio" class="form-check-input" type="radio" name="radio"><label class="form-check-label" for="radio">Radio</label></div>
<div class="sample"><label for="range" class="form-label">Range</label><input id="range" class="form-range" type="range" min="0" max="100" step="1" value="50"></div>
<div class="sample"><input id="btn-check" type="checkbox" class="btn-check" autocomplete="off"><label id="btn-check-label" class="btn btn-outline-primary" for="btn-check">Check toggle</label></div>
<div class="sample"><a id="helper" href="#end" tabindex="0" class="focus-ring focus-ring-primary d-inline-block p-2">Focus helper</a></div>
<div class="sample carousel" id="focus-carousel"><div class="carousel-inner"><div class="carousel-item active" style="height:80px;background:#777"><span class="visually-hidden">First</span></div><div class="carousel-item" style="height:80px;background:#777"><span class="visually-hidden">Second</span></div></div><button id="previous" class="carousel-control-prev" type="button" data-bs-target="#focus-carousel" data-bs-slide="prev"><span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="visually-hidden">Previous</span></button><button id="next" class="carousel-control-next" type="button" data-bs-target="#focus-carousel" data-bs-slide="next"><span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">Next</span></button></div>
<div class="sample"><a id="plain" href="#end" tabindex="0">Plain link</a></div><div class="sample"><a id="dropdown" class="dropdown-item" href="#end" tabindex="0">Dropdown item</a></div><div class="sample"><pre id="pre" tabindex="0" role="region" aria-label="Scrollable code"><code>Long code content that can be reached and horizontally scrolled using a keyboard rather than a pointer.</code></pre></div>
<div class="sample form-check form-switch"><input id="switch" class="form-check-input" type="checkbox" role="switch"><label class="form-check-label" for="switch">Switch</label></div>
</div><div class="form-check"><input id="radio-peer" class="form-check-input" type="radio" name="radio"><label for="radio-peer">Alternate radio for pointer selection</label></div><div id="states"><button id="pressed" class="btn btn-primary" type="button" data-bs-toggle="button" aria-pressed="false">Toggle selection</button><nav class="nav nav-tabs my-3"><button id="tab-state" class="nav-link" type="button">Tab section</button></nav><nav class="nav nav-pills my-3"><button id="pill-state" class="nav-link" type="button">Section</button></nav><div class="list-group"><button id="list-state" class="list-group-item list-group-item-action">Item</button></div><ul class="pagination my-3"><li id="page-state" class="page-item"><a id="page-state-link" class="page-link" href="#end">2</a></li></ul><div class="dropdown-menu position-static d-block"><button id="dropdown-state" class="dropdown-item" type="button">Choice</button></div><div id="progress-state" class="progress my-3" role="progressbar" aria-label="Progress" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:50%"><span class="visually-hidden">50%</span></div></div><div id="grow-state" class="spinner-grow" role="status"><span class="visually-hidden">Loading</span></div><div class="carousel" style="height:60px"><div class="carousel-indicators"><button id="indicator-state" class="active" type="button" data-bs-target="#focus-carousel" data-bs-slide-to="0" aria-label="Slide 1"></button></div></div></div><div class="my-3"><label for="select-small">Small select</label><select id="select-small" class="form-select form-select-sm"><option>First</option></select><label for="select-large">Large select</label><select id="select-large" class="form-select form-select-lg"><option>First</option></select><label for="select-multiple">Multiple select</label><select id="select-multiple" class="form-select" multiple><option>First</option><option>Second</option><option>Third</option></select><label for="select-size">Sized select</label><select id="select-size" class="form-select" size="3"><option>First</option><option>Second</option><option>Third</option></select></div><div id="contexts"></div><div id="end">End of examples</div></main><script src="/bootstrap.js"></script></body></html>`
const report = { suite: 'Independent focus/state surfaces in system forced colours', started: new Date().toISOString(), inputsAtStart: await hashes(), fixtureSHA256: {}, environments: [], checks: [], observations: [], findings: [], notes: ['Keyboard focus is reached by actual Tab from a programmatically focused sentinel; sixteen repaired selector families include the rendered hidden-button-check label, generic focus helper, readonly plaintext and native carousel arrows. Normal carousel focus retains native opacity; its keyboard interaction and forced outline are tested separately.', 'The unmodified same-version native Bootstrap CSS is loaded in a separate page to compare outer dimensions and retained UA focus for plain links, dropdown items and PRE regions.', 'PNG pixel samples inspect actual composited focus rings after opacity/filter effects. Essential glyphs, selected states and progress/loading indicators are measured independently. These are emulated system colours, not an actual Windows high-contrast or assistive-technology session.', 'A forced-colours environment requires active media AND actual automatic substitution of authored RGB foreground/background with CanvasText/Canvas. Media-only emulation is recorded as unsupported system-palette emulation, not a passing environment.', 'Selected classes for pagination, list and menu examples are fixture markup states; hidden check toggles and pressed buttons use real pointer activation and the native Bootstrap button data API. The grow spinner is sampled at its native animation midpoint, without replacing its animation.'] }
const repaired = ['primary', 'close', 'toggle', 'nav', 'accordion', 'page', 'input', 'select', 'plaintext', 'check', 'radio', 'range', 'btn-check', 'helper', 'previous', 'next']
const unchanged = ['plain', 'dropdown', 'pre']
const focusOrder = [...repaired, ...unchanged]
const check = (info, name, pass, detail = {}) => { report.checks.push({ ...info, name, pass, ...detail }); if (!pass) report.findings.push({ ...info, name, ...detail }) }
await fs.mkdir(path.join(output, pictureDirectory), { recursive: true })

function decodePNG(buffer) {
  let offset = 8, width, height, channels, interlace, chunks = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset), type = buffer.toString('ascii', offset + 4, offset + 8), data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); if (data[8] !== 8) throw Error('Unsupported screenshot bit depth'); channels = data[9] === 6 ? 4 : data[9] === 2 ? 3 : 0; interlace = data[12] }
    if (type === 'IDAT') chunks.push(data)
    offset += length + 12
  }
  if (!channels || interlace) throw Error('Unsupported screenshot PNG format')
  const packed = zlib.inflateSync(Buffer.concat(chunks)), stride = width * channels, pixels = Buffer.alloc(stride * height)
  const paeth = (a, b, c) => { const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c }
  for (let y = 0; y < height; y++) {
    const filter = packed[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0, b = y ? pixels[(y - 1) * stride + x] : 0, c = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0
      const value = packed[y * (stride + 1) + x + 1] + (filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : filter === 4 ? paeth(a, b, c) : 0)
      pixels[y * stride + x] = value & 255
    }
  }
  return { width, height, channels, pixels, at: (x, y) => [...pixels.subarray((y * width + x) * channels, (y * width + x) * channels + 3)] }
}
const rgb = value => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
const near = (a, b) => a.every((value, index) => Math.abs(value - b[index]) <= 3)
const luminance = color => color.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05)
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  if(url.pathname==='/bootstrap.js'){res.writeHead(200,{'content-type':'text/javascript'});res.end(await fs.readFile(path.join(root,files[3])));return}
  if (url.pathname.endsWith('.css')) { const file = url.pathname === '/native.css' ? files[1] : files[0]; res.writeHead(200, { 'content-type': 'text/css' }); res.end(await fs.readFile(path.join(root, file))); return }
  const body = html(url.searchParams.get('css') || 'themed', url.searchParams.get('theme') || 'light')
  report.fixtureSHA256[`${url.searchParams.get('css')}-${url.searchParams.get('theme')}`] = sha(body)
  res.writeHead(200, { 'content-type': 'text/html' }); res.end(body)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
try {
  for (const [browserName, engine] of Object.entries({ chromium, firefox, webkit }).filter(([name]) => (process.env.TQ_FOCUS_BROWSERS || 'chromium,firefox,webkit').split(',').includes(name))) {
    const browser = await engine.launch()
    try {
      for (const forced of ['none', 'active']) for (const scheme of ['light', 'dark']) for (const theme of forced === 'active' ? ['light', 'dark'] : [scheme]) {
        if (process.env.TQ_FOCUS_CASES && !process.env.TQ_FOCUS_CASES.split(',').includes(`${forced}:${scheme}:${theme}`)) continue
        const info = { browser: browserName, version: browser.version(), forced, scheme, theme }
        let context
        try {
          context = await browser.newContext({ viewport: { width: 1100, height: 1600 }, deviceScaleFactor: 1, colorScheme: scheme, forcedColors: forced, reducedMotion: 'reduce' })
          const reference = {}
          for (const mode of ['native', 'themed']) {
            const page = await context.newPage(); page.setDefaultTimeout(5000)
            await page.goto(`${origin}/?css=${mode}&theme=${theme}`, { waitUntil: 'load' })
            const capability = await page.evaluate(() => {const probe=getComputedStyle(document.querySelector('#forced-palette-probe')),system=getComputedStyle(document.querySelector('#system'));return{mediaQueryActive:matchMedia('(forced-colors: active)').matches,authoredColour:probe.color,authoredBackground:probe.backgroundColor,systemText:system.color,systemCanvas:system.backgroundColor,automaticPaletteAdjustment:probe.color===system.color&&probe.backgroundColor===system.backgroundColor}})
            if (forced === 'active' && (!capability.mediaQueryActive || !capability.automaticPaletteAdjustment)) { report.environments.push({ ...info, supported: false, capability, reason: capability.mediaQueryActive?'Forced-colours CSS media emulation is active, but automatic native forced-palette substitution is unavailable. Actual system-colour emulation is pending; this is not a passing forced-colours environment.':'matchMedia forced-colors remained inactive' }); await page.close(); break }
            if (mode === 'themed') report.environments.push({ ...info, supported: true, capability, keyboardKey:'Tab', fixtureLinks:'Explicit tabindex=0 on controlled anchors in native and themed pages; WebKit default keyboard preference otherwise skips links, including with Alt+Tab in this build.' })
            const dimensions = await page.locator('#range,#check,#radio,#switch,#close,#toggle,#accordion,#select, #plaintext,#previous,#next,#select-small,#select-large,#select-multiple,#select-size').evaluateAll(elements => Object.fromEntries(elements.map(element => { const rect = element.getBoundingClientRect(); return [element.id, { width: rect.width, height: rect.height }] })))
            await page.locator('#start').focus()
            const readings = {}
            for (const id of focusOrder) {
              await page.keyboard.press('Tab')
              const observed = await page.locator(`#${id}`).evaluate(element => {
                const surface = element.id === 'btn-check' ? element.nextElementSibling : element, style = getComputedStyle(surface), rect = surface.getBoundingClientRect(), system = getComputedStyle(document.querySelector('#system'))
                return { active: document.activeElement.id, focusVisible: element.matches(':focus-visible'), color:style.color, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset, outlineColor: style.outlineColor, boxShadow: style.boxShadow, filter: style.filter, opacity: style.opacity, systemText: system.color, systemBackground: system.backgroundColor, rect: { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height } }
              })
              readings[id] = observed
              if (mode === 'native') continue
              check(info, `Real Tab reaches ${id}`, observed.active === id && observed.focusVisible, observed)
              if (repaired.includes(id) && (forced === 'active' || !['range','previous','next'].includes(id))) {
                if (forced === 'active') check(info, `Forced outline geometry ${id}`, observed.outlineStyle === 'solid' && observed.outlineWidth === '2px' && observed.outlineOffset === '2px', observed)
                const r = observed.rect, clip = { x: Math.max(0, Math.floor(r.x - 7)), y: Math.max(0, Math.floor(r.y - 7)), width: Math.ceil(r.width + 14), height: Math.ceil(r.height + 14) }
                const bytes = await page.screenshot({ clip }), pixels = decodePNG(bytes), text = rgb(observed.systemText), background = rgb(observed.systemBackground)
                let visible = 0, outside = 0
                const colours = new Map(), localBackground = pixels.at(0, 0)
                for (let y = 0; y < pixels.height; y++) for (let x = 0; x < pixels.width; x++) {
                  const px = clip.x + x, py = clip.y + y
                  if (px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height) continue
                  outside++
                  if (contrast(pixels.at(x, y),localBackground) >= 3) visible++
                  const color = pixels.at(x, y)
                  if (!near(color, localBackground)) { const key = color.join(','); colours.set(key, (colours.get(key) || 0) + 1) }
                }
                const screenshot = `${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-${id}.png`
                await fs.writeFile(path.join(output, screenshot), bytes)
                if (forced === 'active') check(info, `Actual composited forced ring visible ${id}`, visible >= Math.max(4, (r.width + r.height) * .15), { visibleContrastingPixels: visible, outsidePixels: outside, minimum: Math.max(4, (r.width + r.height) * .15), screenshot, filter: observed.filter, opacity: observed.opacity })
                else {
                  const dominant = [...colours].sort((a, b) => b[1] - a[1])[0], paint = dominant ? dominant[0].split(',').map(Number) : localBackground
                  const ratio = contrast(paint, localBackground)
                  check(info, `Normal composited focus-ring contrast ${id}`, Boolean(dominant) && dominant[1] >= 4 && ratio >= 3, { ratio, dominantPixels: dominant?.[1] || 0, paint, localBackground, screenshot, filter: observed.filter, opacity: observed.opacity })
                }
              }
              if(forced==='none'&&['previous','next'].includes(id))check(info,`Native normal carousel focus opacity ${id}`,Number(observed.opacity)>.5,observed)
              if (unchanged.includes(id)){const native=reference.readings[id],samePaint=observed.outlineColor===native.outlineColor||(observed.outlineColor===observed.color&&native.outlineColor===native.color);check(info, `Native UA focus geometry and paint source preserved ${id}`, ['outlineStyle', 'outlineWidth', 'outlineOffset','boxShadow'].every(property => observed[property] === native[property])&&samePaint, { actual: observed, reference: native, samePaint, paintComparison:'Exact native outline paint, or the same native currentColor relationship after the intentional TQ foreground substitution.' })}
            }
            if (mode === 'native') { reference.dimensions = dimensions; reference.readings = readings; await page.close(); continue }
            // A dark native close filter also applies on an explicitly white
            // host. Inspect the final pixels, not its pre-filter computed ink.
            const closeContexts = await page.evaluate(({forced,theme}) => {
              const hosts = ['bg-body', 'bg-body-secondary', 'bg-body-tertiary', 'bg-white', 'bg-dark', 'bg-primary', 'bg-secondary', 'bg-success', 'bg-info', 'bg-warning', 'bg-danger', 'bg-light']
              const container = document.querySelector('#contexts')
              const ids = []
              for (const host of hosts) for (const variant of ['native', 'white']) {
                if(forced==='none'&&variant==='white'&&!['bg-dark','bg-primary','bg-secondary','bg-success','bg-danger'].includes(host)&&!(theme==='dark'&&['bg-body','bg-body-secondary','bg-body-tertiary'].includes(host)))continue
                const panel = document.createElement('div'); panel.className=`host ${host}`
                const close = document.createElement('button'); close.type='button'; close.id=`close-${host}-${variant}`; close.className=`btn-close${variant === 'white' ? ' btn-close-white' : ''}`; close.setAttribute('aria-label', `Close in ${host}`)
                panel.append(close); container.append(panel); ids.push(close.id)
              }
              return ids
            },{forced,theme})
            for (const id of closeContexts) {
              const control = page.locator(`#${id}`); await control.focus(); await control.scrollIntoViewIfNeeded()
              const r = await control.evaluate(element => {const rect=element.getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height,filter:getComputedStyle(element).filter}})
              const clip={x:Math.floor(r.x-7),y:Math.floor(r.y-7),width:Math.ceil(r.width+14),height:Math.ceil(r.height+14)}
              const bytes=await page.screenshot({clip,fullPage:true}), pixels=decodePNG(bytes), background=pixels.at(0,0), colours=new Map()
              for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++){const px=clip.x+x,py=clip.y+y;if(px>=r.x&&px<r.x+r.width&&py>=r.y&&py<r.y+r.height)continue;const colour=pixels.at(x,y);if(!near(colour,background)){const key=colour.join(',');colours.set(key,(colours.get(key)||0)+1)}}
              const dominant=[...colours].sort((a,b)=>b[1]-a[1])[0],paint=dominant?dominant[0].split(',').map(Number):background,ratio=contrast(paint,background),screenshot=`${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-${id}.png`
              await fs.writeFile(path.join(output,screenshot),bytes)
              check(info,`Filtered close ring contrasts on ${id}`,Boolean(dominant)&&dominant[1]>=4&&ratio>=3,{ratio,paint,background,filter:r.filter,screenshot})
              if(forced==='active'){
                const glyph=decodePNG(await control.screenshot());let visible=0
                for(let y=0;y<glyph.height;y++)for(let x=0;x<glyph.width;x++)if(contrast(glyph.at(x,y),background)>=3)visible++
                check(info,`Forced close glyph remains visible ${id}`,visible>=4,{visibleGlyphPixels:visible,background})
              }
            }
            {
              const samples = await page.evaluate(({theme,forced}) => {
                const roles=['primary','secondary','success','info','warning','danger','light','dark'], hosts=forced==='active'?['bg-body']:['bg-body','bg-body-secondary','bg-body-tertiary','bg-white','bg-dark','bg-primary','bg-secondary','bg-success','bg-info','bg-warning','bg-danger','bg-light'],samples=[]
                const container=document.querySelector('#contexts');container.innerHTML=''
                for(const host of hosts)for(const role of ['generic',...roles]){
                  // Native bright info/warning/light role helpers require a
                  // documented dark host; the supported semantic panels adapt
                  // all roles through the closest host's shared context ink.
                  if(forced==='none'&&(host==='bg-white'||(theme==='light'&&['bg-body','bg-body-secondary','bg-body-tertiary'].includes(host)))&&['info','light'].includes(role))continue
                  if(forced==='none'&&theme==='light'&&['bg-body-secondary','bg-body-tertiary'].includes(host)&&role==='warning')continue
                  const panel=document.createElement('div');panel.className=`host ${host}`
                  const link=document.createElement('a');link.id=`ring-${host}-${role}`;link.href='#end';link.className=`d-inline-block p-2 focus-ring${role==='generic'?'':` focus-ring-${role}`}`;link.textContent=`${role} focus helper`
                  panel.append(link);container.append(panel);samples.push({id:link.id,host,role})
                }
                return samples
              },{theme,forced})
              for(const sample of samples){
                const control=page.locator(`#${sample.id}`);await control.focus();await control.scrollIntoViewIfNeeded()
                const r=await control.evaluate(element=>{const rect=element.getBoundingClientRect(),style=getComputedStyle(element);return{x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height,shadow:style.boxShadow,ring:style.getPropertyValue('--bs-focus-ring-color'),opacity:style.getPropertyValue('--bs-focus-ring-opacity')}})
                const clip={x:Math.floor(r.x-7),y:Math.floor(r.y-7),width:Math.ceil(r.width+14),height:Math.ceil(r.height+14)},bytes=await page.screenshot({clip,fullPage:true}),pixels=decodePNG(bytes),background=pixels.at(0,0),colours=new Map()
                for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++){const px=clip.x+x,py=clip.y+y;if(px>=r.x&&px<r.x+r.width&&py>=r.y&&py<r.y+r.height)continue;const colour=pixels.at(x,y);if(!near(colour,background)){const key=colour.join(',');colours.set(key,(colours.get(key)||0)+1)}}
                const dominant=[...colours].sort((a,b)=>b[1]-a[1])[0],paint=dominant?dominant[0].split(',').map(Number):background,ratio=contrast(paint,background)
                check(info,`Actual focus helper ${sample.role} on ${sample.host}`,Boolean(dominant)&&dominant[1]>=4&&ratio>=3,{...sample,ratio,paint,background,...r})
                if(!dominant||ratio<3)await fs.writeFile(path.join(output,`${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-${sample.id}.png`),bytes)
              }
            }
            await page.locator('#next').focus();await page.keyboard.press('Enter')
            await page.waitForFunction(()=>document.querySelector('#focus-carousel .active')===document.querySelectorAll('#focus-carousel .carousel-item')[1])
            check(info,'Native carousel Enter on Next reaches second slide',true)
            await page.locator('#previous').focus();await page.keyboard.press('Space')
            await page.waitForFunction(()=>document.querySelector('#focus-carousel .active')===document.querySelectorAll('#focus-carousel .carousel-item')[0])
            check(info,'Native carousel Space on Previous returns to first slide',true)
            if(forced==='active'){
              await page.locator('#start').focus()
              const background=rgb(await page.locator('#system').evaluate(element=>getComputedStyle(element).backgroundColor))
              for(const [name,selector,pseudo] of [['Close','#close'],['Menu','.navbar-toggler-icon'],['Accordion','#accordion',true],['Select','#select','select'],['Carousel previous','.carousel-control-prev-icon'],['Carousel next','.carousel-control-next-icon']]){
                const bounds=await page.locator(selector).evaluate((element,pseudo)=>{let r=element.getBoundingClientRect(),s=getComputedStyle(element);if(pseudo===true){const p=getComputedStyle(element,'::after'),w=parseFloat(p.width),h=parseFloat(p.height);return{x:r.right-parseFloat(s.paddingRight)-w+scrollX,y:r.top+(r.height-h)/2+scrollY,width:w,height:h}}if(pseudo==='select')return{x:r.right-26+scrollX,y:r.top+4+scrollY,width:22,height:r.height-8};return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}},pseudo)
                const bytes=await page.screenshot({clip:{x:Math.floor(bounds.x),y:Math.floor(bounds.y),width:Math.ceil(bounds.width),height:Math.ceil(bounds.height)},fullPage:true}),pixels=decodePNG(bytes);let visible=0
                for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++)if(contrast(pixels.at(x,y),background)>=3)visible++
                const screenshot=`${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-glyph-${name.replaceAll(' ','-')}.png`;await fs.writeFile(path.join(output,screenshot),bytes)
                check(info,`Essential forced ${name} glyph visible`,visible>=4,{visibleGlyphPixels:visible,background,screenshot})
              }
              const changedPixels=(a,b)=>{let changed=0;for(let y=0;y<Math.min(a.height,b.height);y++)for(let x=0;x<Math.min(a.width,b.width);x++)if(!near(a.at(x,y),b.at(x,y)))changed++;return changed}
              for(const [id,kind] of [['btn-check-label','check'],['pressed','pressed'],['pill-state','class'],['tab-state','class'],['list-state','class'],['dropdown-state','class'],['page-state-link','page']]){
                const control=page.locator(`#${id}`);await page.locator('#start').focus();const resting=decodePNG(await control.screenshot())
                if(kind==='check'||kind==='pressed')await control.click()
                else await control.evaluate((element,kind)=>{(kind==='page'?element.parentElement:element).classList.add('active')},kind)
                await page.locator('#start').focus();const selectedBytes=await control.screenshot(),selected=decodePNG(selectedBytes),changed=changedPixels(resting,selected)
                const screenshot=`${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-selected-${id}.png`;await fs.writeFile(path.join(output,screenshot),selectedBytes)
                check(info,`Forced selected state visibly differs for ${id}`,changed>=4,{changedPixels:changed,activation:kind==='check'||kind==='pressed'?'actual pointer activation':'native selected markup state',screenshot})
                const paint=await control.evaluate(element=>{const style=getComputedStyle(element);return{color:style.color,background:style.backgroundColor}}),ratio=contrast(rgb(paint.color),rgb(paint.background))
                check(info,`Forced selected label contrast ${id}`,ratio>=4.5,{...paint,ratio})
                if(kind==='check')check(info,'Forced hidden button-check pointer selection is checked',await page.locator('#btn-check').isChecked())
                if(kind==='pressed')check(info,'Forced native button toggle retains aria-pressed',await control.getAttribute('aria-pressed')==='true')
              }
              const progress=decodePNG(await page.locator('#progress-state').screenshot()),fill=progress.at(Math.floor(progress.width*.25),Math.floor(progress.height/2)),track=progress.at(Math.floor(progress.width*.75),Math.floor(progress.height/2))
              check(info,'Forced progress value fill contrasts with remaining track',contrast(fill,track)>=3,{fill,track,ratio:contrast(fill,track)})
              await page.locator('#grow-state').evaluate(element=>{for(const animation of element.getAnimations()){animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)*.5}})
              for(const id of ['grow-state','indicator-state']){const bytes=await page.locator(`#${id}`).screenshot(),pixels=decodePNG(bytes);let visible=0;for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++)if(contrast(pixels.at(x,y),background)>=3)visible++;const screenshot=`${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-${id}.png`;await fs.writeFile(path.join(output,screenshot),bytes);check(info,`Forced ${id} remains visible`,visible>=4,{visiblePixels:visible,background,screenshot,animationSample:id==='grow-state'?'paused at native midpoint visibility frame':null})}
            }
            for (const [id, value] of Object.entries(dimensions)) check(info, `Native outer dimensions preserved ${id}`, value.width === reference.dimensions[id].width && value.height === reference.dimensions[id].height, { actual: value, native: reference.dimensions[id] })
            for (const id of ['check', 'radio', 'switch']) {
              const control = page.locator(`#${id}`)
              await control.focus(); await page.keyboard.press('Space')
              check(info, `Keyboard Space checks ${id}`, await control.isChecked())
              await page.locator('#start').focus()
              const checked = await control.screenshot()
              if (id === 'radio') { await page.locator('#radio-peer').click(); await control.click() } else await control.click()
              check(info, `Pointer activation changes ${id} state`, id === 'radio' ? await control.isChecked() : !await control.isChecked())
              if (id === 'radio') await page.locator('#radio-peer').click()
              await page.locator('#start').focus()
              const unchecked = await control.screenshot(), a = decodePNG(checked), b = decodePNG(unchecked)
              let changed = 0
              for (let y = 0; y < Math.min(a.height, b.height); y++) for (let x = 0; x < Math.min(a.width, b.width); x++) if (!near(a.at(x, y), b.at(x, y))) changed++
              const prefix = `${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-${id}`
              await fs.writeFile(path.join(output, `${prefix}-checked.png`), checked); await fs.writeFile(path.join(output, `${prefix}-unchecked.png`), unchecked)
              check(info, `Checked glyph has visible pixel difference ${id}`, changed >= 3, { changedPixels: changed, checked: `${prefix}-checked.png`, unchecked: `${prefix}-unchecked.png`, appearance: await control.evaluate(element => getComputedStyle(element).appearance) })
            }
            const range = page.locator('#range'), initial = Number(await range.inputValue())
            await range.focus(); await page.keyboard.press('ArrowRight')
            check(info, 'Range responds to keyboard ArrowRight', Number(await range.inputValue()) > initial)
            const rect = await range.boundingBox(); await page.mouse.click(rect.x + rect.width * .75, rect.y + rect.height / 2)
            check(info, 'Range responds to pointer position', Number(await range.inputValue()) > 55)
            await page.locator('#start').focus()
            const rangeBytes = await range.screenshot(), rangePixels = decodePNG(rangeBytes), systemColors = await page.locator('#system').evaluate(element => ({ text: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }))
            if (forced === 'active') {
              const text = rgb(systemColors.text), background = rgb(systemColors.background)
              let trackPixels = 0, thumbCanvasPixels = 0
              const value = Number(await range.inputValue()), centre = 8 + (rangePixels.width - 16) * value / 100
              for (let x = 0; x < rangePixels.width; x++) for (let y = 0; y < rangePixels.height; y++) { if (near(rangePixels.at(x, y), text)) trackPixels++; if (Math.abs(x - centre) <= 3 && Math.abs(y - rangePixels.height / 2) <= 2 && near(rangePixels.at(x, y), background)) thumbCanvasPixels++ }
              check(info, 'Forced range has painted track and contrasting thumb interior', trackPixels >= rangePixels.width && thumbCanvasPixels >= 10, { trackPixels, thumbCanvasPixels, value, centre, systemColors })
            }
            const rangeScreenshot = `${pictureDirectory}/${browserName}-${forced}-${scheme}-${theme}-range.png`; await fs.writeFile(path.join(output, rangeScreenshot), rangeBytes)
            report.observations.push({ ...info, dimensions, readings, rangeScreenshot })
            await page.close()
          }
        } catch (error) { report.findings.push({ ...info, error: error.stack || error.message }) } finally { await context?.close() }
      }
    } finally { await browser.close() }
  }
} finally { await new Promise(resolve => server.close(resolve)) }
report.finished = new Date().toISOString(); report.inputsAtEnd = await hashes()
report.summary = { environments: report.environments.length, supportedForcedEnvironments: report.environments.filter(item => item.forced === 'active' && item.supported).length, unsupportedForcedEnvironments: report.environments.filter(item => item.forced === 'active' && !item.supported).length, checks: report.checks.length, passed: report.checks.filter(item => item.pass).length, findings: report.findings.length, inputsFrozen: JSON.stringify(report.inputsAtStart) === JSON.stringify(report.inputsAtEnd) }
await fs.writeFile(path.join(root, process.env.TQ_FOCUS_REPORT || 'qa/results/remediation/forced-focus-state.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report.summary))
if (report.findings.length || !report.summary.inputsFrozen) process.exitCode = 1




