import { chromium, firefox, webkit } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const root = resolve(process.argv[2]);
const results = [];
const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs')], { env: { ...process.env, PORT: '5217' }, windowsHide: true });
await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error(`Preview exited ${code}`))); });
try {
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    // Windows WebKit cannot navigate file URLs here. Use the included local
    // server for that engine and block every non-local network request.
    const served = name === 'webkit';
    const context = await browser.newContext({ offline: !served });
    if (served) await context.route('**/*', route => new URL(route.request().url()).origin === 'http://127.0.0.1:5217' ? route.continue() : route.abort());
    const url = file => served ? `http://127.0.0.1:5217/${file}` : pathToFileURL(join(root, file)).href;
    const page = await context.newPage();
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:5217') requests.push(request.url()); });
    await page.goto(url('starter.html'));
    assert.equal(await page.locator('h1').innerText(), 'TQ Bootstrap starter');
    await page.getByRole('button', { name: 'Open example dialog' }).click();
    await page.getByRole('dialog').waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.activeElement === document.getElementById('exampleModal'));
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Explore', exact: true }).click();
    assert.equal(await page.getByRole('link', { name: 'Typography lesson' }).isVisible(), true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('data-bs-theme'), 'dark');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.fonts.check('16px bootstrap-icons')), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.goto(url('lessons/typography/index.html'));
    await page.locator('h1').waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    results.push({ browser: name, access: served ? 'local server; external requests blocked' : 'file URL; offline context', modal: true, dropdown: true, theme: true, icons: true, lessonLoads: true, errors, externalRequests: requests });
    await context.close();
  } finally { await browser.close(); }
}
} finally { server.kill(); }
await writeFile('qa/results/standalone-consumer.json', JSON.stringify({ date: new Date().toISOString(), scope: 'Extracted standalone ZIP, no installed runtime dependencies; Chromium/Firefox file URLs offline, Windows WebKit local server with external requests blocked.', results }, null, 2));
console.log(JSON.stringify(results));
