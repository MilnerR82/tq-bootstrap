import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chromium, firefox, webkit } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.TQ_BASE_URL || "http://127.0.0.1:5198",
  origin = new URL(base).origin;
const browsers = (
  process.env.TQ_DOCS_BROWSERS || "chromium,firefox,webkit"
).split(",");
const widths = (process.env.TQ_DOCS_WIDTHS || "1440,390")
  .split(",")
  .map(Number);
const selected = (process.env.TQ_DOCS_PAGES || "").split(",").filter(Boolean);
const sha = (body) => createHash("sha256").update(body).digest("hex");
const report = {
  suite: "Live native documentation example functionality",
  started: new Date().toISOString(),
  inventory: [],
  aliases: [],
  checks: [],
  findings: [],
  pageErrors: [],
  missingLocalResources: [],
  blockedHostedResources: [],
  limitations: [
    "Native component/form documentation is exercised in Chromium, Firefox and WebKit at1440px desktop and390px touch-enabled mobile emulation. This is functional evidence, not a complete WCAG or physical-device claim.",
    "Every live example/control is inventoried. Static visual anatomy, disabled controls, hidden nested controls and illustrative empty links are classified separately; they are not presented as working application backends.",
    "Copy controls are checked for nonempty matching snippet targets; representative first/last controls on every page are activated and checked for native success feedback. Clipboard readback is not claimed in engines that restrict system clipboard access.",
    "Native tooltips/popovers are tested against documented triggers and public lifecycle methods; no unimplemented Escape support is assumed. Static offcanvas anatomy explicitly prevents show in the original documentation script.",
    "CSS-disabled anchors are checked with actual pointer hit testing; HTMLElement.click bypasses CSS pointer suppression and is not a disabled-link interaction contract. Native disabled HTML buttons also reject programmatic click.",
    "Scrollspy is checked at actual linked section headings inside its configured observer root. Empty end-of-paragraph space can have no intersecting heading and no active link in the native implementation.",
    "Invalid validation forms are submitted to exercise native example validation; successful forms are validated through Constraint Validation API without sending a nonexistent backend request.",
    "Hosted StackBlitz/DocSearch and external media are blocked here and require their separate integration tests. Opening an external editor is not counted as a functional export.",
  ],
};
async function files(dir) {
  const all = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) all.push(...(await files(p)));
    else all.push(p);
  }
  return all;
}
const pages = [];
for (const section of ["components", "forms"])
  for (const entry of await fs.readdir(path.join(root, "docs/5.3", section), {
    withFileTypes: true,
  }))
    if (entry.isDirectory()) {
      const relative = `/docs/5.3/${section}/${entry.name}/`,
        file = path.join(root, relative, "index.html");
      const html = await fs.readFile(file, "utf8");
      if (/http-equiv=["']refresh/i.test(html))
        report.aliases.push({
          page: relative,
          classification: "Native documentation redirect alias",
        });
      else if (!selected.length || selected.includes(entry.name))
        pages.push(relative);
    }
async function fingerprints() {
  const paths = [path.join(root, "qa/docs-functionality.mjs")];
  for (const dir of [
    "docs/5.3/assets",
    "docs/5.3/dist",
    "docs/5.3/components",
    "docs/5.3/forms",
  ])
    for (const p of await files(path.join(root, dir)))
      if (/\.(?:html|css|js)$/.test(p)) paths.push(p);
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
  return pass;
}
function ensure(ok, message) {
  if (!ok) throw Error(message);
}
async function attempt(info, name, fn) {
  try {
    await fn();
  } catch (error) {
    check(info, name, false, { error: error.message });
  }
}
async function wait(page, fn, arg) {
  await page.waitForFunction(fn, arg, { timeout: 5000 });
}
async function install(page) {
  await page.evaluate(() => {
    window.__functionalEvents = [];
    window.__copyEvents = [];
    document.addEventListener(
      "copy",
      (event) => {
        const active = document.activeElement;
        window.__copyEvents.push({
          selection: window.getSelection()?.toString() || "",
          inputSelection:
            active && typeof active.selectionStart === "number"
              ? active.value.slice(active.selectionStart, active.selectionEnd)
              : "",
          provided: event.clipboardData?.getData("text/plain") || "",
        });
      },
      true,
    );
    for (const name of [
      "show",
      "shown",
      "hide",
      "hidden",
      "hidePrevented",
      "slide",
      "slid",
      "close",
      "closed",
      "activate",
    ])
      for (const kind of [
        "modal",
        "offcanvas",
        "collapse",
        "dropdown",
        "tab",
        "tooltip",
        "popover",
        "toast",
        "carousel",
        "alert",
        "scrollspy",
      ])
        document.addEventListener(
          `${name}.bs.${kind}`,
          (event) =>
            window.__functionalEvents.push({
              type: event.type,
              id: event.target.id || null,
              related:
                event.relatedTarget?.id ||
                event.relatedTarget?.getAttribute?.("href") ||
                null,
            }),
          true,
        );
  });
}
async function inventory(page, info) {
  const value = await page.evaluate(() => {
    const content = document.querySelector(".bd-content");
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
    window.__functionalSelector = selector;
    const controls = [
      ...content.querySelectorAll(
        "[data-bs-toggle],[data-bs-dismiss],[data-bs-slide],[data-bs-slide-to],[data-bs-spy]",
      ),
    ].map((e) => ({
      selector: selector(e),
      tag: e.tagName,
      id: e.id || null,
      toggle: e.dataset.bsToggle || null,
      dismiss: e.dataset.bsDismiss || null,
      slide: e.dataset.bsSlide || e.dataset.bsSlideTo || null,
      spy: e.dataset.bsSpy || null,
      target: e.dataset.bsTarget || e.getAttribute("href"),
      disabled:
        e.disabled ||
        e.classList.contains("disabled") ||
        e.getAttribute("aria-disabled") === "true",
      visible: visible(e),
      classification: e.closest(".bd-example-offcanvas")
        ? "Deliberately static anatomy; show prevented by original snippet"
        : e.disabled || e.classList.contains("disabled")
          ? "Disabled native demonstration"
          : !visible(e)
            ? "Hidden nested/responsive control"
            : e.dataset.bsToggle ||
                e.dataset.bsDismiss ||
                e.dataset.bsSlide ||
                e.dataset.bsSlideTo ||
                e.dataset.bsSpy
              ? "Native activatable control"
              : "Static example",
    }));
    const examples = [...content.querySelectorAll(".bd-example")].map(
      (e, index) => ({
        index,
        visible: visible(e),
        id: e.id || null,
        controls: e.querySelectorAll("button,input,select,textarea,a").length,
        dataControls: e.querySelectorAll(
          "[data-bs-toggle],[data-bs-dismiss],[data-bs-slide],[data-bs-spy]",
        ).length,
        classification: e.querySelector(
          "[data-bs-toggle],[data-bs-dismiss],[data-bs-slide],[data-bs-spy]",
        )
          ? "Contains native plugin/data controls"
          : e.querySelector("input,select,textarea")
            ? "Native HTML form controls"
            : e.querySelector("button,a")
              ? "Static illustrative controls/links unless separately activated"
              : "Static content/layout example",
      }),
    );
    const copies = [...content.querySelectorAll(".btn-clipboard")].map(
      (e, index) => ({
        index,
        visible: visible(e),
        classification: visible(e)
          ? "Native copy control"
          : "Native responsive hidden copy control",
        codeBytes:
          e
            .closest(".bd-code-snippet")
            ?.querySelector(".highlight")
            ?.textContent?.trim().length || 0,
      }),
    );
    return {
      examples,
      controls,
      copies,
      forms: [...content.querySelectorAll("form")].map((e) => ({
        custom: e.classList.contains("needs-validation"),
        noValidate: e.noValidate,
        required: e.querySelectorAll("[required]").length,
        action: e.getAttribute("action"),
      })),
      inputTypes: [
        ...new Set([...content.querySelectorAll("input")].map((e) => e.type)),
      ],
    };
  });
  report.inventory.push({ ...info, ...value });
  check(
    info,
    "Every copy control has a nonempty snippet target",
    value.copies.every((c) => c.codeBytes > 0),
    { controls: value.copies.length },
  );
  return value;
}
async function copies(page, info, value) {
  const visible = value.copies.filter((copy) => copy.visible);
  for (const index of new Set([
    visible[0]?.index ?? -1,
    visible.at(-1)?.index ?? -1,
  ]))
    if (index >= 0)
      await attempt(info, "Snippet copy activation", async () => {
        const button = page.locator(".bd-content .btn-clipboard").nth(index);
        if (index === visible.at(-1)?.index && index !== visible[0]?.index) {
          await button.focus();
          await button.press("Enter");
        } else await button.click();
        await wait(
          page,
          ({ index }) =>
            document
              .querySelectorAll(".bd-content .btn-clipboard")
              [index]?.querySelector("use")
              ?.getAttributeNS("http://www.w3.org/1999/xlink", "href") ===
            "#check2",
          { index },
        );
        const state = await button.evaluate((e) => ({
          icon: e
            .querySelector("use")
            ?.getAttributeNS("http://www.w3.org/1999/xlink", "href"),
          copiedText: e
            .closest(".bd-code-snippet")
            .querySelector(".highlight")
            .textContent.trim(),
        }));
        const observed = await page.evaluate(() => window.__copyEvents.at(-1));
        const eventMatches =
          observed &&
          Object.values(observed).some(
            (text) =>
              text.replace(/\r\n?/g, "\n").trim() ===
              state.copiedText.replace(/\r\n?/g, "\n"),
          );
        let clipboardMatches = null;
        if (info.browser === "chromium")
          clipboardMatches = await page.evaluate(
            (expected) =>
              navigator.clipboard
                .readText()
                .then(
                  (text) =>
                    text.replace(/\r\n?/g, "\n").trim() ===
                    expected.replace(/\r\n?/g, "\n"),
                ),
            state.copiedText,
          );
        check(
          info,
          "Actual snippet copy reports native success and matching content",
          state.icon === "#check2" &&
            eventMatches &&
            clipboardMatches !== false,
          {
            index,
            characters: state.copiedText.length,
            sha256: sha(state.copiedText),
            copyEventMatches: eventMatches,
            systemClipboardMatches: clipboardMatches,
            clipboardEvidence:
              info.browser === "chromium"
                ? "Actual system clipboard readback; Windows CRLF normalized to LF"
                : "Native copy-event selection and success feedback; system clipboard readback unavailable",
          },
        );
        await page.mouse.move(1, 1);
        await button.evaluate((e) => bootstrap.Tooltip.getInstance(e)?.hide());
      });
}
async function clean(page) {
  await wait(
    page,
    () =>
      [...document.querySelectorAll(".modal")].every(
        (e) => !bootstrap.Modal.getInstance(e)?._isTransitioning,
      ) && !document.querySelector(".offcanvas.showing,.offcanvas.hiding"),
  );
  await page.evaluate(async () => {
    for (const name of ["Modal", "Offcanvas"])
      for (const e of document.querySelectorAll(
        name === "Modal" ? ".modal.show" : ".offcanvas.show",
      ))
        if (!e.closest(".bd-example-offcanvas"))
          bootstrap[name].getInstance(e)?.hide();
    for (const name of ["Tooltip", "Popover"])
      for (const e of document.querySelectorAll("[data-bs-toggle]"))
        bootstrap[name].getInstance(e)?.hide();
    for (const e of document.querySelectorAll(".dropdown-menu.show"))
      bootstrap.Dropdown.getInstance(
        e.parentElement.querySelector('[data-bs-toggle="dropdown"]'),
      )?.hide();
  });
  await wait(
    page,
    () =>
      [...document.querySelectorAll(".modal")].every(
        (e) =>
          !e.classList.contains("show") &&
          !bootstrap.Modal.getInstance(e)?._isTransitioning,
      ) &&
      [...document.querySelectorAll(".offcanvas")]
        .filter((e) => !e.closest(".bd-example-offcanvas"))
        .every(
          (e) =>
            !e.classList.contains("show") &&
            !e.classList.contains("showing") &&
            !e.classList.contains("hiding"),
        ),
  );
}
async function collapse(page, info, control) {
  const selector = control.selector;
  const target = control.target;
  ensure(target && target !== "#", "Collapse lacks concrete target");
  const before = await page
    .locator(target)
    .evaluateAll((es) =>
      es.map((e) => ({ id: e.id, shown: e.classList.contains("show") })),
    );
  ensure(before.length, "Collapse target missing");
  await page.locator(selector).click();
  await wait(
    page,
    ({ target, before }) =>
      [...document.querySelectorAll(target)].every(
        (e, i) => e.classList.contains("show") !== before[i].shown,
      ) && !document.querySelector(`${target}.collapsing`),
    { target, before },
  );
  await page.locator(selector).click();
  await wait(
    page,
    ({ target, before }) =>
      [...document.querySelectorAll(target)].every(
        (e, i) => e.classList.contains("show") === before[i].shown,
      ),
    { target, before },
  );
  check(
    info,
    "Collapse/accordion data toggle opens and restores target",
    true,
    { selector, target, targets: before.length },
  );
}
async function dropdown(page, info, control) {
  const selector = control.selector;
  await page.locator(selector).click();
  await wait(
    page,
    (s) => document.querySelector(s)?.getAttribute("aria-expanded") === "true",
    selector,
  );
  const state = await page.locator(selector).evaluate((e) => ({
    menu: bootstrap.Dropdown.getInstance(e)?._menu?.classList.contains("show"),
    autoClose: bootstrap.Dropdown.getInstance(e)?._config.autoClose,
  }));
  ensure(state.menu, "Dropdown menu did not show");
  await page.locator(selector).press("ArrowDown");
  const keyboard = await page.locator(selector).evaluate((e) => {
    const menu = bootstrap.Dropdown.getInstance(e)._menu;
    return {
      hasItems: !!menu.querySelector(
        ".dropdown-item:not(.disabled):not(:disabled)",
      ),
      focus: menu.contains(document.activeElement),
    };
  });
  ensure(
    !keyboard.hasItems || keyboard.focus,
    "Dropdown ArrowDown did not focus a menu item",
  );
  await page.keyboard.press("Escape");
  await wait(
    page,
    (s) => document.querySelector(s)?.getAttribute("aria-expanded") === "false",
    selector,
  );
  check(info, "Dropdown pointer, ArrowDown and Escape lifecycle", true, {
    selector,
    ...state,
  });
}
async function tab(page, info, control) {
  await page.locator(control.selector).click();
  await wait(
    page,
    (s) => document.querySelector(s)?.classList.contains("active"),
    control.selector,
  );
  const state = await page.locator(control.selector).evaluate((e) => {
    const target = e.dataset.bsTarget || e.getAttribute("href");
    return {
      selected: e.getAttribute("aria-selected"),
      target,
      pane:
        target && document.querySelector(target)?.classList.contains("active"),
    };
  });
  ensure(state.pane, "Tab target pane did not activate");
  check(info, "Native tab/pill/list activates its matching pane", true, {
    selector: control.selector,
    ...state,
  });
}
async function hint(page, info, control) {
  const type = control.toggle === "tooltip" ? "Tooltip" : "Popover",
    selector = control.selector;
  const config = await page
    .locator(selector)
    .evaluate((e, type) => {
      const trigger = bootstrap[type].getInstance(e)?._config.trigger;
      // The accessibility companion owns the native hover/focus listeners with
      // a manual instance. Exercise the original declared interaction rather
      // than mistaking that implementation detail for a hover-only demo.
      if (trigger === "manual" && e.hasAttribute(`data-tq-${type.toLowerCase()}-source`)) {
        let data = {};
        try { data = JSON.parse(e.getAttribute("data-bs-config") || "{}"); } catch {}
        return e.getAttribute("data-bs-trigger") ?? data.trigger ?? bootstrap[type].Default.trigger;
      }
      return trigger;
    }, type);
  if (config?.includes("click")) await page.locator(selector).click();
  else if (config?.includes("focus")) await page.locator(selector).focus();
  else await page.locator(selector).hover();
  await wait(
    page,
    (s) => {
      const e = document.querySelector(s),
        id = e?.getAttribute("aria-describedby");
      return id && document.getElementById(id)?.classList.contains("show");
    },
    selector,
  );
  const text = await page
    .locator(selector)
    .evaluate((e) =>
      document
        .getElementById(e.getAttribute("aria-describedby"))
        .textContent.trim(),
    );
  ensure(text.length, "Hint content empty");
  await page.mouse.move(1, 1);
  await page.locator(selector).evaluate((e, type) => {
    e.blur();
    bootstrap[type].getInstance(e).hide();
  }, type);
  await wait(
    page,
    (s) => !document.querySelector(s)?.getAttribute("aria-describedby"),
    selector,
  );
  check(
    info,
    "Native " + control.toggle + " trigger shows content and API hides it",
    true,
    { selector, characters: text.length },
  );
}
async function overlay(page, info, control) {
  const kind = control.toggle,
    type = kind === "modal" ? "Modal" : "Offcanvas",
    selector = control.selector,
    target = control.target;
  ensure(target?.startsWith("#"), "Overlay lacks target");
  await clean(page);
  await page.locator(selector).click();
  await wait(
    page,
    ({ target, type }) => {
      const e = document.querySelector(target),
        instance = bootstrap[type].getInstance(e);
      return (
        e?.classList.contains("show") &&
        !e.classList.contains("showing") &&
        !instance._isTransitioning
      );
    },
    { target, type },
  );
  const shown = await page.locator(target).evaluate(
    (e, type) => ({
      ariaModal: e.getAttribute("aria-modal"),
      focus: e.contains(document.activeElement),
      keyboard: bootstrap[type].getInstance(e)._config.keyboard,
      scroll: bootstrap[type].getInstance(e)._config.scroll,
      backdrop: bootstrap[type].getInstance(e)._config.backdrop,
    }),
    type,
  );
  ensure(shown.ariaModal === "true", "Overlay lacks visible modal state");
  if (type === "Modal" || !shown.scroll || shown.backdrop)
    ensure(shown.focus, "Overlay did not manage initial focus");
  await page.keyboard.press("Tab");
  if (type === "Modal" || !shown.scroll || shown.backdrop)
    ensure(
      await page
        .locator(target)
        .evaluate((e) => e.contains(document.activeElement)),
      "Tab escaped overlay focus trap",
    );
  if (control.toggle === "modal") {
    const recipient = await page
      .locator(selector)
      .getAttribute("data-bs-whatever");
    if (recipient) {
      const value = await page.locator(target).evaluate((e) => ({
        title: e.querySelector(".modal-title").textContent,
        value: e.querySelector(".modal-body input").value,
      }));
      ensure(
        value.title.includes(recipient) && value.value === recipient,
        "Varying modal recipient did not update",
      );
    }
    for (const nested of await page
      .locator(
        target +
          ' [data-bs-toggle="popover"],' +
          target +
          ' [data-bs-toggle="tooltip"]',
      )
      .evaluateAll((es) =>
        es
          .filter((e) => e.getClientRects().length)
          .map((e) => ({
            selector: window.__functionalSelector(e),
            toggle: e.dataset.bsToggle,
          })),
      ))
      await hint(page, info, nested);
  }
  if (kind === "offcanvas") {
    const nestedDropdowns = await page
      .locator(
        target + ' [data-bs-toggle="dropdown"]:not(.disabled):not(:disabled)',
      )
      .evaluateAll((es) =>
        es
          .filter(
            (e) =>
              e.getClientRects().length &&
              getComputedStyle(e).visibility !== "hidden",
          )
          .map((e) => ({
            selector: window.__functionalSelector(e),
            toggle: "dropdown",
          })),
      );
    for (const nested of nestedDropdowns) {
      await dropdown(page, info, nested);
      ensure(
        await page
          .locator(target)
          .evaluate((e) => e.classList.contains("show")),
        "Nested dropdown Escape unexpectedly closed its offcanvas parent",
      );
    }
  }
  await page.locator(target).focus();
  await page.keyboard.press("Escape");
  if (shown.keyboard)
    await wait(
      page,
      ({ target, type }) => {
        const e = document.querySelector(target);
        return (
          !e?.classList.contains("show") &&
          !e?.classList.contains("hiding") &&
          !bootstrap[type].getInstance(e)?._isTransitioning
        );
      },
      { target, type },
    );
  else {
    ensure(
      await page.locator(target).evaluate((e) => e.classList.contains("show")),
      "Keyboard-disabled overlay unexpectedly closed",
    );
    const close = page
      .locator(target + ' [data-bs-dismiss="' + kind + '"]')
      .first();
    await close.click();
    await wait(
      page,
      ({ target, type }) => {
        const e = document.querySelector(target);
        return (
          !e?.classList.contains("show") &&
          !e?.classList.contains("hiding") &&
          !bootstrap[type].getInstance(e)?._isTransitioning
        );
      },
      { target, type },
    );
  }
  await page.waitForTimeout(20);
  ensure(
    await page.locator(selector).evaluate((e) => document.activeElement === e),
    "Overlay did not restore focus to actual opener",
  );
  check(
    info,
    "Native " + kind + " data open, focus trap, close and focus return",
    true,
    { selector, target, ...shown },
  );
}
async function carousel(page, info) {
  const items = await page
    .locator(".bd-content .carousel")
    .evaluateAll((es) => es.map((e) => e.id));
  for (const id of items)
    await attempt(info, "Carousel controls/API/keyboard", async () => {
      const selector = "#" + id;
      const total = await page.locator(selector + " .carousel-item").count();
      ensure(total > 1, "Carousel has insufficient slides");
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page
        .locator(selector)
        .evaluate((e) => bootstrap.Carousel.getOrCreateInstance(e).pause());
      const before = await page
        .locator(selector)
        .evaluate((e) =>
          [...e.querySelectorAll(".carousel-item")].findIndex((c) =>
            c.classList.contains("active"),
          ),
        );
      const next = page.locator(selector + ' [data-bs-slide="next"]');
      if (await next.count()) await next.first().click();
      else
        await page
          .locator(selector)
          .evaluate((e) => bootstrap.Carousel.getInstance(e).next());
      await wait(
        page,
        ({ selector, before }) =>
          [
            ...document
              .querySelector(selector)
              .querySelectorAll(".carousel-item"),
          ].findIndex((e) => e.classList.contains("active")) !== before,
        { selector, before },
      );
      await page
        .locator(selector)
        .evaluate(
          (e, before) => bootstrap.Carousel.getInstance(e).to(before),
          before,
        );
      await wait(
        page,
        ({ selector, before }) =>
          [
            ...document
              .querySelector(selector)
              .querySelectorAll(".carousel-item"),
          ].findIndex((e) => e.classList.contains("active")) === before,
        { selector, before },
      );
      check(
        info,
        "Carousel actual next control/API and to(index) restore",
        true,
        { id, total },
      );
    });
}
async function special(page, info, name) {
  if (name === "buttons") {
    const e = page
      .locator(
        '.bd-content [data-bs-toggle="button"]:not(:disabled):not(.disabled)',
      )
      .first();
    if (await e.count()) {
      const before = await e.evaluate((e) => e.classList.contains("active"));
      await e.click();
      ensure(
        (await e.evaluate((e) => e.classList.contains("active"))) !== before,
        "Button data toggle failed",
      );
      await e.press("Space");
      ensure(
        (await e.evaluate((e) => e.classList.contains("active"))) === before,
        "Button keyboard toggle failed",
      );
      check(info, "Button pointer and Space toggle active/aria-pressed", true);
    }
  }
  if (name === "alerts") {
    await page.locator("#liveAlertBtn").click();
    const alert = page.locator("#liveAlertPlaceholder .alert").last();
    await alert.evaluate((e) =>
      e.addEventListener(
        "closed.bs.alert",
        (event) =>
          window.__functionalEvents.push({
            type: event.type,
            id: event.target.id || null,
            related: null,
          }),
        { once: true },
      ),
    );
    await alert.locator('[data-bs-dismiss="alert"]').click();
    await wait(
      page,
      () => !document.querySelector("#liveAlertPlaceholder .alert"),
    );
    check(info, "Live alert construction and dismiss removes DOM", true);
  }
  if (name === "toasts") {
    await page.locator("#liveToastBtn").click();
    await wait(page, () =>
      document.querySelector("#liveToast").classList.contains("show"),
    );
    await page.locator('#liveToast [data-bs-dismiss="toast"]').click();
    await wait(
      page,
      () => !document.querySelector("#liveToast").classList.contains("show"),
    );
    const select = page.locator("#selectToastPlacement");
    if (await select.count()) {
      const value = await select.locator("option").last().getAttribute("value");
      await select.selectOption(value);
      ensure(
        await page
          .locator("#toastPlacement")
          .evaluate(
            (e, v) => v.split(" ").every((c) => e.classList.contains(c)),
            value,
          ),
        "Toast placement did not update",
      );
    }
    await page.mouse.move(1, 1);
    await page.locator("#liveToastBtn").focus();
    await page.locator("#liveToast").evaluate((e) => {
      bootstrap.Toast.getInstance(e).dispose();
      bootstrap.Toast.getOrCreateInstance(e, {
        autohide: true,
        delay: 80,
        animation: false,
      }).show();
    });
    await wait(
      page,
      () => !document.querySelector("#liveToast").classList.contains("show"),
    );
    check(
      info,
      "Toast live show/dismiss, placement and configured autohide",
      true,
    );
  }
  if (name === "modal") {
    const first = page
      .locator('[data-bs-target="#exampleModalToggle"]')
      .filter({ hasText: "Open first modal" });
    if (await first.count()) {
      await first.click();
      await wait(
        page,
        () =>
          document
            .querySelector("#exampleModalToggle")
            .classList.contains("show") &&
          !bootstrap.Modal.getInstance(
            document.querySelector("#exampleModalToggle"),
          )._isTransitioning,
      );
      await page
        .locator('#exampleModalToggle [data-bs-target="#exampleModalToggle2"]')
        .click();
      await wait(
        page,
        () =>
          document
            .querySelector("#exampleModalToggle2")
            .classList.contains("show") &&
          !document
            .querySelector("#exampleModalToggle")
            .classList.contains("show") &&
          !bootstrap.Modal.getInstance(
            document.querySelector("#exampleModalToggle2"),
          )._isTransitioning &&
          !bootstrap.Modal.getInstance(
            document.querySelector("#exampleModalToggle"),
          )._isTransitioning,
      );
      await page
        .locator('#exampleModalToggle2 [data-bs-target="#exampleModalToggle"]')
        .click();
      await wait(
        page,
        () =>
          document
            .querySelector("#exampleModalToggle")
            .classList.contains("show") &&
          !bootstrap.Modal.getInstance(
            document.querySelector("#exampleModalToggle"),
          )._isTransitioning,
      );
      await page
        .locator('#exampleModalToggle [data-bs-dismiss="modal"]')
        .first()
        .click();
      await wait(
        page,
        () =>
          !document
            .querySelector("#exampleModalToggle")
            .classList.contains("show") &&
          !bootstrap.Modal.getInstance(
            document.querySelector("#exampleModalToggle"),
          )._isTransitioning,
      );
      check(info, "Native chained modal toggles both directions", true);
    }
  }
  if (name === "scrollspy")
    for (const index of Array.from(
      {
        length: await page
          .locator('.bd-content [data-bs-spy="scroll"]')
          .count(),
      },
      (_, i) => i,
    ))
      await attempt(
        { ...info, scrollspyIndex: index },
        "Scrollspy actual scroll activation",
        async () => {
          const e = page
            .locator('.bd-content [data-bs-spy="scroll"]')
            .nth(index);
          await e.scrollIntoViewIfNeeded();
          const target = await e.getAttribute("data-bs-target");
          const activeSection = async (href, stage) => {
            try {
              await wait(
                page,
                ({ target, href }) =>
                  [
                    ...document
                      .querySelector(target)
                      .querySelectorAll(".active"),
                  ].some((link) => link.getAttribute("href") === href),
                { target, href },
              );
            } catch (error) {
              const state = await e.evaluate((e) => ({
                scrollTop: e.scrollTop,
                clientHeight: e.clientHeight,
                scrollHeight: e.scrollHeight,
                rect: e.getBoundingClientRect().toJSON(),
                active: [
                  ...document
                    .querySelector(e.dataset.bsTarget)
                    .querySelectorAll(".active"),
                ].map((link) => link.getAttribute("href")),
                previousScrollData:
                  bootstrap.ScrollSpy.getInstance(e)._previousScrollData,
                headings: [...e.querySelectorAll("[id]")].map((h) => ({
                  id: h.id,
                  offsetTop: h.offsetTop,
                  top: h.getBoundingClientRect().top,
                })),
              }));
              throw Error(
                stage +
                  ": " +
                  error.message +
                  " " +
                  JSON.stringify({ target, href, state }),
              );
            }
          };
          const headingTargets = await e.evaluate((e) =>
            [
              ...document
                .querySelector(e.dataset.bsTarget)
                .querySelectorAll('a[href^="#"]'),
            ]
              .map((link) => ({
                href: link.getAttribute("href"),
                node: document.getElementById(
                  decodeURIComponent(link.hash.slice(1)),
                ),
              }))
              .filter((value) => value.node && e.contains(value.node))
              .map((value) => ({ href: value.href, id: value.node.id })),
          );
          ensure(
            headingTargets.length > 1,
            "Scrollspy needs two actual linked section headings",
          );
          await e.evaluate((e) => {
            bootstrap.ScrollSpy.getOrCreateInstance(e).refresh();
            e.scrollTop = 0;
          });
          await activeSection(
            headingTargets[0].href,
            "Initial heading readiness",
          );
          const before = await page
            .locator(target)
            .evaluate((e) =>
              [...e.querySelectorAll(".active")].map((e) =>
                e.getAttribute("href"),
              ),
            );
          const section = headingTargets[1];
          await e.evaluate((e, id) => {
            const heading = document.getElementById(id);
            e.scrollTop +=
              heading.getBoundingClientRect().top -
              e.getBoundingClientRect().top -
              10;
          }, section.id);
          await activeSection(section.href, "Scrolled heading activation");
          const after = await page
            .locator(target)
            .evaluate((e) =>
              [...e.querySelectorAll(".active")].map((e) =>
                e.getAttribute("href"),
              ),
            );
          ensure(
            after.length && JSON.stringify(before) !== JSON.stringify(after),
            "Scrolling did not change Scrollspy active link",
          );
          check(
            info,
            "Scrollspy updates actual navigation after container scroll",
            true,
            {
              index,
              target,
              before,
              after,
              actualSectionTarget: section.href,
              observerContext:
                "Scroll actual linked heading into the native observer root; empty end-of-paragraph areas need not retain an active heading",
            },
          );
        },
      );
  if (name === "navs-tabs" || name === "list-group") {
    const first = page
      .locator('.bd-content [role="tab"]:not(.disabled):not(:disabled)')
      .first();
    if (await first.count()) {
      await first.focus();
      await first.press("ArrowRight");
      const actual = await page.evaluate(() => ({
        role: document.activeElement.getAttribute("role"),
        selected: document.activeElement.getAttribute("aria-selected"),
      }));
      ensure(
        actual.role === "tab" && actual.selected === "true",
        "Tab ArrowRight did not focus/select sibling",
      );
      check(info, "Native tabs ArrowRight keyboard selection", true);
    }
  }
}
async function api(page, info) {
  const classes = {
    Alert: ".bd-content .alert",
    Button: '.bd-content [data-bs-toggle="button"]',
    Carousel: ".bd-content .carousel",
    Collapse: ".bd-content .collapse",
    Dropdown: '.bd-content [data-bs-toggle="dropdown"]',
    Modal: "#exampleModalLive",
    Offcanvas: ".bd-content .offcanvas:not(.show)",
    Popover: '.bd-content [data-bs-toggle="popover"]',
    ScrollSpy: '.bd-content [data-bs-spy="scroll"]',
    Tab: '.bd-content [data-bs-toggle="tab"],.bd-content [data-bs-toggle="pill"],.bd-content [data-bs-toggle="list"]',
    Toast: "#liveToast",
    Tooltip: '.bd-content [data-bs-toggle="tooltip"]',
  };
  for (const [type, selector] of Object.entries(classes))
    if (await page.locator(selector).count())
      await attempt(info, type + " public instance lifecycle", async () => {
        const value = await page
          .locator(selector)
          .first()
          .evaluate((e, type) => {
            const C = bootstrap[type];
            const original =
              C.getInstance(e) ||
              C.getOrCreateInstance(
                e,
                type === "Collapse" ? { toggle: false } : {},
              );
            const repeated = C.getOrCreateInstance(e);
            const identity = original === repeated;
            original.dispose();
            const disposed = C.getInstance(e) === null;
            const recreated = C.getOrCreateInstance(
              e,
              type === "Collapse" ? { toggle: false } : {},
            );
            return {
              identity,
              disposed,
              reinitialised:
                recreated !== original && C.getInstance(e) === recreated,
            };
          }, type);
        ensure(
          Object.values(value).every(Boolean),
          "API identity/disposal/reinitialisation failed",
        );
        check(
          info,
          type + " public getOrCreate/dispose/reinitialise",
          true,
          value,
        );
      });
}
async function forms(page, info, name) {
  const types = await page
    .locator(
      ".bd-content .bd-example input:not(:disabled):not([readonly]),.bd-content .bd-example textarea:not(:disabled):not([readonly]),.bd-content .bd-example select:not(:disabled)",
    )
    .evaluateAll((es) => {
      const seen = new Set();
      return es
        .map((e, index) => ({
          index,
          type: e.tagName === "INPUT" ? e.type : e.tagName.toLowerCase(),
        }))
        .filter((e) => {
          if (seen.has(e.type)) return false;
          seen.add(e.type);
          return true;
        });
    });
  const all =
    ".bd-content .bd-example input:not(:disabled):not([readonly]),.bd-content .bd-example textarea:not(:disabled):not([readonly]),.bd-content .bd-example select:not(:disabled)";
  for (const control of types)
    await attempt(
      info,
      "Native " + control.type + " form control",
      async () => {
        const e = page.locator(all).nth(control.index);
        const type = control.type;
        if (type === "checkbox" || type === "radio") {
          await e.check();
          ensure(await e.isChecked(), "Native check/radio did not check");
        } else if (type === "select") {
          const value = await e.evaluate(
            (e) =>
              [...e.options].filter((o) => !o.disabled && o.value).at(-1)
                ?.value,
          );
          if (value) await e.selectOption(value);
          else return;
        } else if (type === "range") {
          const before = await e.inputValue();
          await e.focus();
          await e.press("ArrowRight");
          ensure(
            (await e.inputValue()) !== before,
            "Range keyboard value did not change",
          );
        } else if (type === "file")
          await e.setInputFiles({
            name: "audit.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("Local functionality audit fixture"),
          });
        else if (
          [
            "text",
            "email",
            "password",
            "search",
            "tel",
            "url",
            "number",
            "textarea",
            "color",
            "date",
            "time",
            "datetime-local",
          ].includes(type)
        )
          await e.fill(
            {
              email: "audit@example.test",
              url: "https://example.test",
              number: "5",
              color: "#123456",
              date: "2026-10-22",
              time: "12:30",
              "datetime-local": "2026-10-22T12:30",
            }[type] || "Audit example",
          );
        else return;
        check(
          info,
          "Native form control accepts its documented interaction",
          true,
          { type },
        );
      },
    );
  if (name === "checks-radios") {
    const state = await page
      .locator(
        '.bd-example-indeterminate input[id*="Indeterminate"]:not(:disabled)',
      )
      .evaluateAll((es) => es.map((e) => e.indeterminate));
    ensure(
      state.length && state.every(Boolean),
      "Indeterminate example not initialised",
    );
    check(info, "Native indeterminate example initialisation", true, {
      controls: state.length,
    });
  }
  if (name === "validation")
    for (const index of [0, 1]) {
      const form = page.locator(".needs-validation").nth(index);
      if (!(await form.count())) continue;
      await form.evaluate((e) => e.reset());
      await form.locator('[type="submit"]').click();
      await wait(
        page,
        (index) =>
          document
            .querySelectorAll(".needs-validation")
            [index].classList.contains("was-validated"),
        index,
      );
      const result = await form.evaluate((e) => ({
        invalid: !e.checkValidity(),
        invalidControls: e.querySelectorAll(":invalid").length,
      }));
      ensure(
        result.invalid && result.invalidControls > 0,
        "Custom validation not applied",
      );
      check(
        info,
        "Actual invalid custom validation submit adds was-validated",
        true,
        { index, ...result },
      );
    }
}

async function publicActions(page, info) {
  const candidates = {
    Alert: ".bd-content .alert",
    Button:
      '.bd-content [data-bs-toggle="button"]:not(:disabled):not(.disabled)',
    Carousel: ".bd-content .carousel",
    Collapse: ".bd-content .collapse",
    Dropdown:
      '.bd-content [data-bs-toggle="dropdown"]:not(:disabled):not(.disabled)',
    Modal: "#exampleModalLive",
    Offcanvas: ".bd-content .offcanvas:not(.show)",
    Popover: '.bd-content [data-bs-toggle="popover"]',
    ScrollSpy: '.bd-content [data-bs-spy="scroll"]',
    Tab: '.bd-content [data-bs-toggle="tab"]',
    Toast: "#liveToast",
    Tooltip: '.bd-content [data-bs-toggle="tooltip"]',
  };
  for (const [type, selector] of Object.entries(candidates))
    if (await page.locator(selector).count())
      await attempt(
        { ...info, plugin: type },
        "Public API action after reinitialisation",
        async () => {
          const locator = page.locator(selector).first(),
            handle = await locator.elementHandle();
          if (type === "Alert") {
            await handle.evaluate((e) => {
              e.addEventListener(
                "closed.bs.alert",
                (event) =>
                  window.__functionalEvents.push({
                    type: event.type,
                    id: event.target.id || null,
                    related: null,
                  }),
                { once: true },
              );
              bootstrap.Alert.getOrCreateInstance(e).close();
            });
            await wait(page, (e) => !e.isConnected, handle);
          } else if (type === "Button") {
            const same = await handle.evaluate((e) => {
              const before = e.classList.contains("active"),
                api = bootstrap.Button.getOrCreateInstance(e);
              api.toggle();
              const changed = e.classList.contains("active") !== before;
              api.toggle();
              return changed && e.classList.contains("active") === before;
            });
            ensure(same, "Programmatic button toggles did not restore state");
          } else if (type === "Carousel") {
            const before = await handle.evaluate((e) => {
              const c = bootstrap.Carousel.getOrCreateInstance(e);
              c.pause();
              const before = [
                ...e.querySelectorAll(".carousel-item"),
              ].findIndex((e) => e.classList.contains("active"));
              c.next();
              return before;
            });
            await wait(
              page,
              ({ e, before }) =>
                [...e.querySelectorAll(".carousel-item")].findIndex((e) =>
                  e.classList.contains("active"),
                ) !== before,
              { e: handle, before },
            );
            await handle.evaluate(
              (e, before) => bootstrap.Carousel.getInstance(e).to(before),
              before,
            );
            await wait(
              page,
              ({ e, before }) =>
                [...e.querySelectorAll(".carousel-item")].findIndex((e) =>
                  e.classList.contains("active"),
                ) === before,
              { e: handle, before },
            );
          } else if (type === "ScrollSpy") {
            await handle.evaluate((e) =>
              bootstrap.ScrollSpy.getOrCreateInstance(e).refresh(),
            );
          } else if (type === "Tab") {
            await handle.evaluate((e) =>
              bootstrap.Tab.getOrCreateInstance(e).show(),
            );
            ensure(
              await handle.evaluate((e) => e.classList.contains("active")),
              "Tab show API did not activate",
            );
          } else {
            if (
              type === "Offcanvas" &&
              (await handle.evaluate(
                (e) => !!e.closest(".bd-example-offcanvas"),
              ))
            )
              return;
            await handle.evaluate(
              (e, type) =>
                bootstrap[type]
                  .getOrCreateInstance(
                    e,
                    type === "Collapse" ? { toggle: false } : {},
                  )
                  .show(),
              type,
            );
            await wait(
              page,
              ({ e, type }) => {
                const instance = bootstrap[type].getInstance(e);
                return ["Popover", "Tooltip"].includes(type)
                  ? !!e.getAttribute("aria-describedby")
                  : e.classList.contains("show") &&
                      !e.classList.contains("showing") &&
                      !instance._isTransitioning;
              },
              { e: handle, type },
            );
            await page.waitForTimeout(20);
            await handle.evaluate(
              (e, type) => bootstrap[type].getInstance(e).hide(),
              type,
            );
            await wait(
              page,
              ({ e, type }) =>
                ["Popover", "Tooltip"].includes(type)
                  ? !e.getAttribute("aria-describedby")
                  : !e.classList.contains("show"),
              { e: handle, type },
            );
          }
          check(
            info,
            type + " public action works after disposal/reinitialisation",
            true,
          );
        },
      );
}
async function autoClose(page, info, control) {
  const selector = control.selector;
  await page.locator(selector).click();
  const config = await page.locator(selector).evaluate((e) => {
    const api = bootstrap.Dropdown.getInstance(e),
      item = [
        ...api._menu.querySelectorAll(
          ".dropdown-item:not(.disabled):not(:disabled)",
        ),
      ].find((e) => e.getClientRects().length);
    return {
      autoClose: api._config.autoClose,
      item: item ? window.__functionalSelector(item) : null,
    };
  });
  if (config.item) {
    await page.locator(config.item).click();
    const closed =
      (await page.locator(selector).getAttribute("aria-expanded")) === "false";
    ensure(
      closed === (config.autoClose === true || config.autoClose === "inside"),
      "Dropdown inside autoClose policy failed",
    );
    if (!closed) await page.locator(selector).press("Escape");
  } else await page.locator(selector).press("Escape");
  await page.locator(selector).click();
  await page.mouse.click(1, 1);
  const closed =
    (await page.locator(selector).getAttribute("aria-expanded")) === "false";
  ensure(
    closed === (config.autoClose === true || config.autoClose === "outside"),
    "Dropdown outside autoClose policy failed",
  );
  if (!closed) await page.locator(selector).press("Escape");
  check(info, "Dropdown native inside/outside autoClose policy", true, {
    selector,
    ...config,
  });
}
async function carouselKeys(page, info) {
  for (const id of await page
    .locator(".bd-content .carousel")
    .evaluateAll((es) => es.map((e) => e.id)))
    await attempt(info, "Carousel key/indicator/touch controls", async () => {
      const selector = "#" + id,
        next = page.locator(selector + ' [data-bs-slide="next"]').first();
      const before = await page
        .locator(selector)
        .evaluate((e) =>
          [...e.querySelectorAll(".carousel-item")].findIndex((e) =>
            e.classList.contains("active"),
          ),
        );
      if (await next.count()) {
        await next.focus();
        await next.press("ArrowRight");
        await wait(
          page,
          ({ selector, before }) =>
            [
              ...document
                .querySelector(selector)
                .querySelectorAll(".carousel-item"),
            ].findIndex((e) => e.classList.contains("active")) !== before,
          { selector, before },
        );
        if (info.width === 390) {
          const current = await page
            .locator(selector)
            .evaluate((e) =>
              [...e.querySelectorAll(".carousel-item")].findIndex((e) =>
                e.classList.contains("active"),
              ),
            );
          await next.tap();
          await wait(
            page,
            ({ selector, current }) =>
              [
                ...document
                  .querySelector(selector)
                  .querySelectorAll(".carousel-item"),
              ].findIndex((e) => e.classList.contains("active")) !== current,
            { selector, current },
          );
        }
      }
      const indicator = page
        .locator(selector + ' [data-bs-slide-to="0"]')
        .first();
      if (await indicator.count()) {
        await indicator.click();
        await wait(
          page,
          (selector) =>
            document
              .querySelector(selector + " .carousel-item")
              .classList.contains("active"),
          selector,
        );
      }
      check(
        info,
        "Carousel keyboard and available indicator/touch controls",
        true,
        {
          id,
          keyboard: !!(await next.count()),
          touchTap: info.width === 390 && !!(await next.count()),
          indicator: !!(await indicator.count()),
        },
      );
    });
}

report.assetsAtStart = await fingerprints();
async function runBrowser(browserName) {
  const browser = await { chromium, firefox, webkit }[browserName].launch();
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      hasTouch: width === 390,
      reducedMotion: "reduce",
      colorScheme: "light",
    });
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (new URL(url).origin === origin) return route.continue();
      if (!report.blockedHostedResources.includes(url))
        report.blockedHostedResources.push(url);
      return route.abort();
    });
    if (browserName === "chromium")
      await context.grantPermissions(["clipboard-read", "clipboard-write"], {
        origin,
      });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    let current = {};
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
    for (const relative of pages) {
      current = { browser: browserName, width, page: relative };
      await attempt(
        current,
        "Page loads and initialises native examples",
        async () => {
          await page.goto(base + relative, { waitUntil: "load" });
          await page.waitForFunction(
            () =>
              window.bootstrap?.Modal && document.querySelector(".bd-content"),
          );
          await page.evaluate(async () => {
            await document.fonts.ready;
            for (const e of document.querySelectorAll(".carousel"))
              bootstrap.Carousel.getOrCreateInstance(e).pause();
          });
          await install(page);
          const inv = await inventory(page, current);
          await copies(page, current, inv);
          const name = relative.split("/").filter(Boolean).at(-1);
          if (relative.includes("/forms/")) await forms(page, current, name);
          for (const control of inv.controls) {
            if (control.disabled) {
              await attempt(
                { ...current, control },
                "Disabled native control remains inert",
                async () => {
                  const locator = page.locator(control.selector);
                  const cssDisabledAnchor = await locator.evaluate(
                    (element) =>
                      element.tagName === "A" &&
                      getComputedStyle(element).pointerEvents === "none",
                  );
                  if (cssDisabledAnchor) {
                    await locator.scrollIntoViewIfNeeded();
                    const state = await locator.evaluate((element) => {
                      const rect = element.getBoundingClientRect(),
                        x = rect.left + rect.width / 2,
                        y = rect.top + rect.height / 2,
                        hit = document.elementFromPoint(x, y);
                      return {
                        x,
                        y,
                        hitOwnsTarget: hit === element || element.contains(hit),
                        before: JSON.stringify([
                          element.className,
                          element.getAttribute("aria-pressed"),
                          element.getAttribute("aria-expanded"),
                        ]),
                        pointerEvents: getComputedStyle(element).pointerEvents,
                      };
                    });
                    ensure(
                      !state.hitOwnsTarget,
                      "CSS-disabled anchor receives pointer hit",
                    );
                    await page.mouse.click(state.x, state.y);
                    const after = await locator.evaluate((element) =>
                      JSON.stringify([
                        element.className,
                        element.getAttribute("aria-pressed"),
                        element.getAttribute("aria-expanded"),
                      ]),
                    );
                    ensure(
                      after === state.before,
                      "Actual pointer activation changed disabled anchor",
                    );
                    check(
                      current,
                      "Disabled native anchor rejects actual pointer activation through CSS",
                      true,
                      {
                        selector: control.selector,
                        pointerEvents: state.pointerEvents,
                        programmaticBoundary:
                          "HTMLElement.click() bypasses CSS pointer suppression; Bootstrap Button.toggle remains a public API",
                      },
                    );
                    return;
                  }
                  const stable = await page
                    .locator(control.selector)
                    .evaluate((element) => {
                      const snapshot = () =>
                        JSON.stringify({
                          className: element.className,
                          expanded: element.getAttribute("aria-expanded"),
                          pressed: element.getAttribute("aria-pressed"),
                          selected: element.getAttribute("aria-selected"),
                        });
                      const before = snapshot();
                      element.click();
                      return before === snapshot();
                    });
                  ensure(stable, "Disabled control changed state");
                  check(
                    current,
                    "Disabled native data control rejects activation",
                    true,
                    { selector: control.selector, toggle: control.toggle },
                  );
                },
              );
              continue;
            }
            if (
              control.disabled ||
              !control.visible ||
              control.classification.startsWith("Deliberately static")
            )
              continue;
            const action = {
              collapse,
              dropdown,
              tab,
              pill: tab,
              list: tab,
              tooltip: hint,
              popover: hint,
              modal: overlay,
              offcanvas: overlay,
            }[control.toggle];
            if (action)
              await attempt(
                { ...current, control },
                "Actual " + control.toggle + " data-control lifecycle",
                async () => {
                  await action(page, current, control);
                  if (control.toggle === "dropdown")
                    await autoClose(page, current, control);
                },
              );
          }
          await attempt(current, "Page-specific native examples", async () =>
            special(page, current, name),
          );
          if (name === "carousel") {
            await carousel(page, current);
            await carouselKeys(page, current);
          }
          await clean(page);
          await api(page, current);
          await publicActions(page, current);
          const events = await page.evaluate(() => window.__functionalEvents);
          check(
            current,
            "Live page completed without local asset or JavaScript errors",
            !report.pageErrors.some(
              (e) =>
                e.browser === browserName &&
                e.width === width &&
                e.page === relative,
            ) &&
              !report.missingLocalResources.some(
                (e) =>
                  e.browser === browserName &&
                  e.width === width &&
                  e.page === relative,
              ),
            { nativeEvents: events },
          );
        },
      );
      console.log(browserName + " " + width + " " + relative + " checked");
    }
    if (!selected.length) {
      const events = report.checks
        .filter((row) => row.browser === browserName && row.width === width)
        .flatMap((row) => row.nativeEvents || [])
        .map((event) => event.type);
      const required = {
        alert: ["close", "closed"],
        carousel: ["slide", "slid"],
        collapse: ["show", "shown", "hide", "hidden"],
        dropdown: ["show", "shown", "hide", "hidden"],
        modal: ["show", "shown", "hide", "hidden"],
        offcanvas: ["show", "shown", "hide", "hidden"],
        popover: ["show", "shown", "hide", "hidden"],
        scrollspy: ["activate"],
        tab: ["show", "shown", "hide", "hidden"],
        toast: ["show", "shown", "hide", "hidden"],
        tooltip: ["show", "shown", "hide", "hidden"],
      };
      for (const [plugin, names] of Object.entries(required))
        check(
          { browser: browserName, width, plugin },
          "Native lifecycle event matrix",
          names.every((name) => events.includes(name + ".bs." + plugin)),
          { required: names.map((name) => name + ".bs." + plugin) },
        );
    }
    await context.close();
  }
  await browser.close();
}
const parallelBrowsers = process.env.TQ_DOCS_PARALLEL === "1";
report.execution = {
  parallelBrowsers,
  isolatedContexts: true,
  plannedPageVisits: browsers.length * widths.length * pages.length,
};
if (parallelBrowsers) await Promise.all(browsers.map(runBrowser));
else for (const browserName of browsers) await runBrowser(browserName);
report.assetsAtEnd = await fingerprints();
const frozen =
  JSON.stringify(report.assetsAtStart) === JSON.stringify(report.assetsAtEnd);
if (!frozen)
  report.findings.push({
    name: "Product hashes",
    error:
      "Compiled product or functionality harness changed during evaluation",
  });
report.finished = new Date().toISOString();
report.summary = {
  browsers,
  widths,
  selectedPages: selected,
  completeMatrix:
    !selected.length &&
    [...new Set(browsers)].sort().join(",") === "chromium,firefox,webkit" &&
    [...new Set(widths)].sort((a, b) => a - b).join(",") === "390,1440" &&
    report.inventory.length === pages.length * 6,
  canonicalPages: pages.length,
  aliases: report.aliases.length,
  pageVisits: report.inventory.length,
  examplesInventoried: report.inventory.reduce(
    (n, p) => n + p.examples.length,
    0,
  ),
  controlsInventoried: report.inventory.reduce(
    (n, p) => n + p.controls.length,
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
await fs.mkdir(path.join(root, "qa/results"), { recursive: true });
await fs.writeFile(
  path.join(root, process.env.TQ_REPORT_PATH || "qa/results/docs-functionality.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.summary, null, 2));
if (report.findings.length) process.exitCode = 1;
