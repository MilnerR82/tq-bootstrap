// Test preparation only. Never changes page fonts, styles, content or geometry.
export async function waitForFontGeometry(page, {quietMs = 750, timeoutMs = 8000} = {}) {
  return page.evaluate(async ({quietMs, timeoutMs}) => {
    const started = performance.now();
    await document.fonts.ready;
    const stateKey = Symbol.for('tq.qa.font-geometry');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    function read() {
      const fonts = new Map(), metrics = [];
      for (const element of [document.body, ...document.body.querySelectorAll('*')]) {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect();
        const font = style.font || `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        metrics.push([rect.x, rect.y, rect.width, rect.height, font]);
        if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(element.tagName)) continue;
        const text = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim();
        if (!text) continue;
        let entry = fonts.get(font);
        if (!entry) {entry = {glyphs: new Set(), sample: '', canvasFont: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`}; fonts.set(font, entry);}
        const added = [...new Set(text)].filter(character => !entry.glyphs.has(character));
        if (added.length) entry.sample += text.slice(0, 512) + added.join('');
        for (const character of text) entry.glyphs.add(character);
      }
      const signature = JSON.stringify([...fonts].map(([font, entry]) => [font, [...entry.glyphs].sort().join('')]).sort(([a], [b]) => a.localeCompare(b)));
      return {fonts, signature, metrics: JSON.stringify(metrics)};
    }
    function shape(fonts) {
      for (const [font, entry] of fonts) {
        context.font = entry.canvasFont;
        context.measureText(entry.sample);
      }
    }
    let current = read();
    if (document[stateKey]?.signature === current.signature) return {warmed: false, fonts: current.fonts.size, elapsedMs: performance.now() - started, samples: 1, changes: 0};
    shape(current.fonts);
    // Firefox may report FontFaceSet "loaded" while local script/italic
    // fallback is still resolving. Force actual font/geometry reads first,
    // then require a continuous quiet window instead of counting frames.
    let lastMetrics = '', quietSince = performance.now(), samples = 0, changes = 0;
    const deadline = started + timeoutMs;
    while (performance.now() < deadline) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const next = read(); samples++;
      if (next.signature !== current.signature) {shape(next.fonts); quietSince = performance.now(); changes++;}
      if (next.metrics !== lastMetrics || document.fonts.status !== 'loaded') {quietSince = performance.now(); changes++;}
      current = next; lastMetrics = next.metrics;
      if (performance.now() - quietSince >= quietMs) {
        document[stateKey] = {signature: current.signature};
        return {warmed: true, fonts: current.fonts.size, elapsedMs: performance.now() - started, quietMs, samples, changes};
      }
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    throw Error(`Font/geometry did not remain stable for ${quietMs}ms within ${timeoutMs}ms (${samples} samples, ${changes} changes)`);
  }, {quietMs, timeoutMs});
}
