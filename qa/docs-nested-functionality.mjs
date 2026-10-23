import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { parseDocument, DomUtils } from "htmlparser2";
import { chromium, firefox, webkit } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.TQ_BASE_URL || "http://127.0.0.1:5198";
const origin = new URL(base).origin;
const browsers = ["chromium", "firefox", "webkit"];
const widths = [1440, 390];
const sha = (value) => createHash("sha256").update(value).digest("hex");
const report = {
  suite: "Native documentation navbar nested controls",
  started: new Date().toISOString(),
  pages: [],
  inventory: [],
  checks: [],
  findings: [],
  pageErrors: [],
  missingLocalResources: [],
  limitations: [
    "Supplementary runtime coverage of every live navbar in canonical component/form documentation: responsive parents are revealed through original data controls before nested dropdowns are exercised.",
    "Static anatomy without a native activator is recorded explicitly. Hosted services and application backends are outside this native Bootstrap interaction audit.",
    "Desktop and mobile touch-enabled browser emulation do not replace physical-device or screen-reader testing.",
  ],
};
async function files(dir) {
  const entries = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) entries.push(...(await files(p)));
    else entries.push(p);
  }
  return entries;
}
const hasClass = (e, value) =>
  (e.attribs?.class || "").split(/\s+/).includes(value);
const inContent = (e) => {
  for (let p = e.parent; p; p = p.parent)
    if (hasClass(p, "bd-content")) return true;
  return false;
};
for (const section of ["components", "forms"]) {
  for (const file of await files(path.join(root, "docs/5.3", section))) {
    if (path.basename(file) !== "index.html") continue;
    const html = await fs.readFile(file, "utf8");
    if (/http-equiv=["']refresh/i.test(html)) continue;
    const dom = parseDocument(html);
    const navbars = DomUtils.findAll(
      (e) => e.type === "tag" && hasClass(e, "navbar") && inContent(e),
      dom.children,
    );
    if (navbars.length)
      report.pages.push({
        page:
          "/" +
          path.relative(root, path.dirname(file)).replaceAll("\\", "/") +
          "/",
        sourceNavbars: navbars.length,
      });
  }
}
async function fingerprints() {
  const paths = [
    path.join(root, "qa/docs-nested-functionality.mjs"),
    ...report.pages.map((e) => path.join(root, e.page, "index.html")),
  ];
  for (const dir of ["docs/5.3/assets", "docs/5.3/dist"])
    for (const p of await files(path.join(root, dir)))
      if (/\.(?:css|js)$/.test(p)) paths.push(p);
  return Object.fromEntries(
    await Promise.all(
      paths
        .sort()
        .map(async (p) => [
          path.relative(root, p).replaceAll("\\", "/"),
          sha(await fs.readFile(p)),
        ]),
    ),
  );
}
function check(info, name, pass, detail = {}) {
  const row = { ...info, name, pass, ...detail };
  report.checks.push(row);
  if (!pass) report.findings.push(row);
}
function ensure(ok, message) {
  if (!ok) throw Error(message);
}
async function attempt(info, name, fn) {
  try {
    await fn();
  } catch (e) {
    check(info, name, false, { error: e.message });
  }
}
async function wait(page, fn, arg) {
  await page.waitForFunction(fn, arg, { timeout: 5000 });
}
async function pointerClick(locator) {
  await locator.scrollIntoViewIfNeeded();
  const point = await locator.evaluate((element) => {
    const r = element.getBoundingClientRect();
    const positions = [
      { x: r.width / 2, y: r.height / 2 },
      { x: Math.min(15, r.width / 2), y: Math.min(5, r.height / 2) },
      { x: r.width / 2, y: Math.min(5, r.height / 2) },
      { x: r.width / 2, y: Math.max(1, r.height - 5) },
    ];
    return (
      positions.find((p) => {
        const hit = document.elementFromPoint(r.left + p.x, r.top + p.y);
        return hit === element || element.contains(hit);
      }) || null
    );
  });
  ensure(
    point,
    "No actual visible pointer hit point exists for native trigger",
  );
  await locator.click({ position: point });
  return point;
}
async function prepare(page) {
  return page.evaluate(() => {
    const visible = (e) =>
      !!e.getClientRects().length &&
      getComputedStyle(e).visibility !== "hidden";
    const selector = (e) => {
      if (
        e.id &&
        document.querySelectorAll("#" + CSS.escape(e.id)).length === 1
      )
        return "#" + CSS.escape(e.id);
      const parts = [];
      for (let p = e; p && p !== document.body; p = p.parentElement) {
        const siblings = [...p.parentElement.children].filter(
          (s) => s.tagName === p.tagName,
        );
        parts.unshift(
          p.tagName.toLowerCase() + `:nth-of-type(${siblings.indexOf(p) + 1})`,
        );
      }
      return "body > " + parts.join(" > ");
    };
    window.__nestedSelector = selector;
    return [...document.querySelectorAll(".bd-content .navbar")].map((nav) => ({
      selector: selector(nav),
      parents: [...nav.querySelectorAll(".navbar-collapse,.offcanvas")]
        .filter((e) => e.closest(".navbar") === nav)
        .map((e) => ({
          selector: selector(e),
          kind: e.classList.contains("offcanvas") ? "offcanvas" : "collapse",
          initiallyVisible: visible(e),
          initiallyShown: e.classList.contains("show"),
          staticAnatomy: !!e.closest(".bd-example-offcanvas"),
          triggers: [
            ...nav.querySelectorAll(
              '[data-bs-toggle="collapse"],[data-bs-toggle="offcanvas"]',
            ),
          ]
            .filter((t) => {
              const value =
                t.getAttribute("data-bs-target") || t.getAttribute("href");
              try {
                return (
                  value && [...document.querySelectorAll(value)].includes(e)
                );
              } catch {
                return false;
              }
            })
            .map((t) => ({ selector: selector(t), visible: visible(t) })),
          dropdowns: [...e.querySelectorAll('[data-bs-toggle="dropdown"]')].map(
            (t) => selector(t),
          ),
        })),
      dropdowns: [...nav.querySelectorAll('[data-bs-toggle="dropdown"]')].map(
        (e) => ({
          selector: selector(e),
          initiallyVisible: visible(e),
          disabled: e.disabled || e.classList.contains("disabled"),
        }),
      ),
    }));
  });
}
async function dropdown(page, info, selector, parent) {
  const trigger = page.locator(selector);
  ensure(await trigger.isVisible(), "Revealed dropdown trigger remains hidden");
  const menuSelector = await trigger.evaluate((e) =>
    window.__nestedSelector(bootstrap.Dropdown.getOrCreateInstance(e)._menu),
  );
  const menu = page.locator(menuSelector);
  const activationPoint = await pointerClick(trigger);
  await wait(
    page,
    (s) => document.querySelector(s)?.classList.contains("show"),
    menuSelector,
  );
  ensure(
    (await trigger.getAttribute("aria-expanded")) === "true",
    "Dropdown expanded state missing",
  );
  const items = menu.locator(".dropdown-item:not(.disabled):not(:disabled)");
  const visibleItems = await items.evaluateAll(
    (es) =>
      es.filter(
        (e) =>
          e.getClientRects().length &&
          getComputedStyle(e).visibility !== "hidden",
      ).length,
  );
  if (visibleItems) {
    await trigger.press("ArrowDown");
    ensure(
      await menu.evaluate(
        (e) =>
          e.contains(document.activeElement) &&
          document.activeElement.classList.contains("dropdown-item"),
      ),
      "ArrowDown did not enter nested menu",
    );
  }
  await page.keyboard.press("Escape");
  await wait(
    page,
    (s) => !document.querySelector(s)?.classList.contains("show"),
    menuSelector,
  );
  ensure(
    await trigger.evaluate((e) => document.activeElement === e),
    "Escape did not return focus to nested trigger",
  );
  const autoClose = await trigger.evaluate(
    (e) => bootstrap.Dropdown.getInstance(e)._config.autoClose,
  );
  let insideTested = false;
  if (visibleItems) {
    await pointerClick(trigger);
    await wait(
      page,
      (s) => document.querySelector(s)?.classList.contains("show"),
      menuSelector,
    );
    const item = await items.evaluateAll((es) => {
      const e = es.find(
        (e) =>
          e.getClientRects().length &&
          getComputedStyle(e).visibility !== "hidden",
      );
      return e ? window.__nestedSelector(e) : null;
    });
    await page.locator(item).click();
    const shouldClose = autoClose === true || autoClose === "inside";
    await wait(
      page,
      ({ s, shouldClose }) =>
        document.querySelector(s).classList.contains("show") !== shouldClose,
      { s: menuSelector, shouldClose },
    );
    insideTested = true;
    await trigger.evaluate((e) => bootstrap.Dropdown.getInstance(e).hide());
  }
  await pointerClick(trigger);
  await wait(
    page,
    (s) => document.querySelector(s)?.classList.contains("show"),
    menuSelector,
  );
  const outsideSelector = await trigger.evaluate((e, parent) => {
    const nav = e.closest(".navbar"),
      panel = parent ? document.querySelector(parent) : nav;
    const candidates = [
      ...panel.querySelectorAll(
        ".offcanvas-title,.offcanvas-header,.navbar-brand",
      ),
      ...nav.querySelectorAll(".navbar-brand"),
    ];
    const target = candidates.find(
      (x) =>
        !x.closest(".dropdown") &&
        x.getClientRects().length &&
        getComputedStyle(x).visibility !== "hidden",
    );
    return window.__nestedSelector(target || panel);
  }, parent);
  await page.locator(outsideSelector).click({ position: { x: 2, y: 2 } });
  const outsideCloses = autoClose === true || autoClose === "outside";
  await wait(
    page,
    ({ s, shouldClose }) =>
      document.querySelector(s).classList.contains("show") !== shouldClose,
    { s: menuSelector, shouldClose: outsideCloses },
  );
  await trigger.evaluate((e) => bootstrap.Dropdown.getInstance(e).hide());
  check(
    info,
    "Revealed navbar dropdown pointer, keyboard, focus and autoClose",
    true,
    {
      selector,
      parent,
      menuSelector,
      visibleItems,
      insideTested,
      autoClose,
      outsideSelector,
      activationPoint,
    },
  );
}
report.assetsAtStart = await fingerprints();
for (const browserName of browsers) {
  const browser = await { chromium, firefox, webkit }[browserName].launch({
    headless: true,
  });
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width === 390,
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    await context.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    let current;
    page.on("pageerror", (error) =>
      report.pageErrors.push({ ...current, error: error.message }),
    );
    page.on("response", (response) => {
      if (new URL(response.url()).origin === origin && response.status() >= 400)
        report.missingLocalResources.push({
          ...current,
          url: response.url(),
          status: response.status(),
        });
    });
    for (const entry of report.pages) {
      current = { browser: browserName, width, page: entry.page };
      await attempt(current, "Nested navbar page initialises", async () => {
        await page.goto(base + entry.page, { waitUntil: "load" });
        await page.waitForFunction(
          () =>
            window.bootstrap?.Dropdown && document.querySelector(".bd-content"),
        );
        await page.evaluate(() => document.fonts.ready);
        const navbars = await prepare(page);
        report.inventory.push({ ...current, navbars });
        ensure(
          navbars.length === entry.sourceNavbars,
          "Rendered navbar inventory differs from compiled source",
        );
        const tested = new Set();
        for (const nav of navbars) {
          for (const parent of nav.parents)
            await attempt(
              { ...current, navbar: nav.selector, parent: parent.selector },
              "Responsive navbar parent and nested targets",
              async () => {
                if (parent.staticAnatomy) {
                  check(
                    current,
                    "Static offcanvas anatomy classified without activation",
                    true,
                    { selector: parent.selector },
                  );
                  return;
                }
                const opener = parent.triggers.find((t) => t.visible)?.selector;
                if (!parent.initiallyVisible) {
                  ensure(
                    opener,
                    "Hidden responsive navbar parent has no visible native opener",
                  );
                  await page.locator(opener).click();
                  await wait(
                    page,
                    (s) => {
                      const e = document.querySelector(s),
                        instance =
                          bootstrap[
                            e.classList.contains("offcanvas")
                              ? "Offcanvas"
                              : "Collapse"
                          ].getInstance(e);
                      return (
                        e.classList.contains("show") &&
                        !e.classList.contains("showing") &&
                        !instance?._isTransitioning
                      );
                    },
                    parent.selector,
                  );
                }
                for (const selector of parent.dropdowns) {
                  const disabled = await page
                    .locator(selector)
                    .evaluate(
                      (e) => e.disabled || e.classList.contains("disabled"),
                    );
                  if (disabled) continue;
                  await dropdown(page, current, selector, parent.selector);
                  tested.add(selector);
                }
                if (!parent.initiallyVisible) {
                  if (parent.kind === "offcanvas")
                    await page
                      .locator(
                        parent.selector + ' [data-bs-dismiss="offcanvas"]',
                      )
                      .first()
                      .click();
                  else await page.locator(opener).click();
                  await wait(
                    page,
                    (s) => {
                      const e = document.querySelector(s);
                      return (
                        !e.classList.contains("show") &&
                        !e.classList.contains("collapsing") &&
                        !e.classList.contains("hiding")
                      );
                    },
                    parent.selector,
                  );
                }
                check(
                  current,
                  "Navbar responsive parent restored after nested interaction",
                  true,
                  {
                    selector: parent.selector,
                    kind: parent.kind,
                    initiallyVisible: parent.initiallyVisible,
                    nativeOpener: opener || null,
                    dropdowns: parent.dropdowns.length,
                  },
                );
              },
            );
          for (const d of nav.dropdowns)
            if (!tested.has(d.selector) && d.initiallyVisible && !d.disabled)
              await attempt(
                current,
                "Initially expanded navbar nested dropdown",
                async () => {
                  await dropdown(page, current, d.selector, null);
                  tested.add(d.selector);
                },
              );
        }
        check(
          current,
          "Every enabled navbar dropdown has an actual interaction result",
          navbars
            .flatMap((n) => n.dropdowns)
            .filter((d) => !d.disabled)
            .every((d) => tested.has(d.selector)),
          {
            expected: navbars
              .flatMap((n) => n.dropdowns)
              .filter((d) => !d.disabled)
              .map((d) => d.selector),
            tested: [...tested],
          },
        );
        check(
          current,
          "Nested navbar page has no JavaScript or missing-local-resource errors",
          !report.pageErrors.some(
            (e) =>
              e.browser === browserName &&
              e.width === width &&
              e.page === entry.page,
          ) &&
            !report.missingLocalResources.some(
              (e) =>
                e.browser === browserName &&
                e.width === width &&
                e.page === entry.page,
            ),
        );
      });
      console.log(
        `${browserName} ${width} ${entry.page} nested navbar checked`,
      );
    }
    await context.close();
  }
  await browser.close();
}
report.assetsAtEnd = await fingerprints();
const frozen =
  JSON.stringify(report.assetsAtStart) === JSON.stringify(report.assetsAtEnd);
if (!frozen)
  report.findings.push({
    name: "Product hashes",
    error: "Compiled assets or supplementary harness changed during evaluation",
  });
report.finished = new Date().toISOString();
report.summary = {
  browsers,
  widths,
  canonicalPages: report.pages.length,
  expectedPageVisits: report.pages.length * 6,
  pageVisits: report.inventory.length,
  completeMatrix: report.inventory.length === report.pages.length * 6,
  navbarInstances: report.inventory.reduce((n, e) => n + e.navbars.length, 0),
  parentInstances: report.inventory.reduce(
    (n, e) => n + e.navbars.reduce((v, nav) => v + nav.parents.length, 0),
    0,
  ),
  dropdownInstances: report.inventory.reduce(
    (n, e) => n + e.navbars.reduce((v, nav) => v + nav.dropdowns.length, 0),
    0,
  ),
  checks: report.checks.length,
  passed: report.checks.filter((e) => e.pass).length,
  failed: report.findings.length,
  findings: report.findings.length,
  pageErrors: report.pageErrors.length,
  missingLocalResources: report.missingLocalResources.length,
  assetsFrozen: frozen,
};
await fs.writeFile(
  path.join(root, "qa/results/docs-nested-functionality.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.summary, null, 2));
if (report.findings.length) process.exitCode = 1;
