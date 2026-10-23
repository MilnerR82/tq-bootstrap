# TQ Bootstrap

Bootstrap 5.3.8 with TAFE Queensland colours and brand font family. The framework, website, documentation and examples come from Bootstrap's pinned official source. The theme uses Helvetica Neue with Arial fallback and preserves Bootstrap's original type sizes, weights, line heights, spacing, corners, shadows, classes, breakpoints, Sass interfaces, APIs and data-bs-* attributes. A separate accessibility companion and small documented example corrections address the issues found in the independent audit. Bootstrap's original JavaScript files are unchanged.

This is an independently maintained theme. Bootstrap and Bootstrap Icons retain their original licences; TAFE Queensland brand names remain their owner's property.

## Self-contained repository

The checked-in `dist/` is ready to use: copy its CSS and JavaScript into your project. No CDN, package installation or build step is required to use the compiled framework. Bootstrap Icons are supplied locally under `assets/bootstrap-icons/`. No proprietary webfonts are bundled; the theme uses installed Helvetica Neue or Arial.

The repository also includes the built documentation website, all 40 standalone examples, the interactive lesson at `lessons/typography/`, source files, pinned dependency locks and licences. To browse the included website, run `node scripts/serve.mjs` with Node.js 22 or newer and open <http://127.0.0.1:5198/>. The framework and typography lesson use local assets. Optional hosted documentation search, external starter editors and examples using external services still need a network connection, as described below.

The three current ZIP downloads are included under `release/`. Old complete snapshots, dependency folders, caches, historical screenshots and the brand-reference PDF are excluded from Git. Audit narratives and the latest brand-font reports are retained; older narratives can reference local evidence that is not included. Historical comparison tests requiring omitted `.cache` baselines cannot be rerun from this repository alone. This repository does not claim full WCAG 2.2 AA conformance.

## Download

Use the local website’s compiled, source and examples downloads for the current Harmony 1 theme. The complete release/tq-bootstrap-1.0.0.zip is the preserved 22 October audited snapshot and predates this revision. Its checksums and audit reports describe that historical archive.

## Use in a page

Include the themed CSS and Bootstrap's original combined JavaScript bundle:

```html
<!doctype html>
<html lang="en" data-bs-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your page title</title>
  <link rel="stylesheet" href="dist/css/bootstrap.min.css">
</head>
<body>
  <main class="container py-5">
    <h1>Your page heading</h1>
    <button class="btn btn-primary" type="button">Your action</button>
  </main>
  <script src="dist/js/bootstrap.bundle.min.js"></script>
  <script src="dist/tq/tq-accessibility.min.js"></script>
  <script>TQAccessibility.init()</script>
</body>
</html>
```

The full CSS already includes Bootstrap. The original bootstrap.bundle.min.js includes Popper. Load each once. For right-to-left pages use dir="rtl" and bootstrap.rtl.min.css. Bootstrap's data-bs-theme="dark" enables dark mode.

## Contents

- dist/css: themed full, grid, Reboot and utilities builds; LTR/RTL; expanded/minified files and source maps.
- dist/js: unchanged Bootstrap JavaScript distributions and individual modules.
- src/scss: TQ colour substitutions and measured contrast corrections, separate from upstream Bootstrap.
- src/js and dist/tq: separate accessibility companion source, global/ESM distributions and source maps.
- upstream: original Bootstrap and Bootstrap Icons packages, tagged Bootstrap source and verified download archives.
- assets/bootstrap-icons: the complete Bootstrap Icons 1.13.2 SVG, sprite and font collection.
- docs-source: official Bootstrap website/documentation source, colour substitutions and local build/serving infrastructure.
- index.html and docs/5.3: compiled official documentation and examples.

## Theme

The current theme uses **a Harmony 1 foundation with user-selected TQ status colours**. Direct red, pink and neutral substitutions use Harmony 1. Success retains Bootstrap green; warning uses base Ochre Sunset from Harmony 3. Information uses white surfaces and TQ Red accents. This combination is a user-directed adaptation. Other named hue families keep Bootstrap's original colours. TQ Red supplies primary actions and accents. White remains the main page background. Light neutral surfaces use Koala Grey L2 (#F1EFED). No stripe patterns or custom tinted callout fills are added.

| Bootstrap role | Colour | Hex |
| --- | --- | --- |
| Primary | TQ Red | #E31B23 |
| Secondary | Magpie Black L1 | #696567 |
| Success | Original Bootstrap green | #198754 |
| Information | White surface / TQ Red accent | #FFFFFF / #E31B23 |
| Warning | Ochre Sunset | #EF7622 |
| Danger | TQ Red (direct red substitution) | #E31B23 |
| Light | Koala Grey L2 | #F1EFED |
| Dark | Magpie Black charcoal | #373234 |

Blue, indigo, purple, orange, yellow, green, teal and cyan retain their original Bootstrap hue values. Pink uses Eucalyptus Blossom. Gray 100/200/300/600/900 have direct Harmony 1 substitutions; intermediate greys without a direct match remain native. Native Bootstrap tint/shade generation supplies semantic alerts and state variants. Reading links use Magpie Black charcoal for contrast on white and light neutral surfaces. White/black button labels use Bootstrap's normal contrast selection.

Typography, component shapes, dimensions, spacing and APIs remain Bootstrap's. Previously documented accessibility fixes are retained separately from the palette. The 23 October theme update has its own verification evidence in [Harmony 1 notes](docs/HARMONY-1.md); older audits remain records of the earlier palette, not fresh certification of this revision.

Bootstrap's current `$prefix` and legacy `$variable-prefix` Sass settings are retained. The colour aliases follow the selected prefix, and custom focus dimensions remain native. The Sass audit verifies these interfaces and their actual browser focus states.

Overflowing responsive tables receive a named keyboard-scroll region while overflow is present. Resizing, text spacing and repeated initialization preserve author-supplied attributes; removing the enhancement restores its owned attributes.

The same palette also covers example-specific CSS, dashboard charts, inline demonstration SVG paint, generated placeholders and the shared example controls. Every source substitution is recorded. Existing normal focus dimensions are retained with opaque, tested paint. Read-only plaintext fields receive an explicit visible focus outline where native Bootstrap suppresses it. High-contrast mode adds explicit focus outlines, visible original icon shapes, system-colour selected/progress/loading states, native check/radio rendering and visible range controls; these forced-colour adaptations are separately documented. The original colour changes and the later accessibility corrections have separate evidence; intentional accessibility changes are not described as colour-only changes. Cover navigation/footer text uses a documented white paint tint of .55 rather than .5 for contrast; the original colour-only substitutions retained the other alpha values and CSS opacity. The later accessibility correction replaces faded completed-list text with native strike-through styling, and uses mode-aware emphasis text for reading content. The native black sidebar disclosure stroke is retained as a measured contrast exception. The original dashboard chart reads theme colours for its labels, grid and tooltip; a scoped theme-change listener updates and immediately draws its paint, including during native tooltip animation, without changing its data, axes or layout. Original logos, photographs and instructional palette/code references retain their source colours. All 40 gallery entries use fresh TQ screenshots at Bootstrap's original normal/high-resolution sizes; image paths, gallery markup and layout remain native.

The documentation also has three earlier functionality repairs: StackBlitz exports carry their local themed assets into the exported project; theme switching tolerates blocked storage and invalid saved values; and five remaining stale documentation links point to their existing current sections; a sixth reference was replaced by corrected installation guidance. These repairs preserve the native interface and leave all Bootstrap framework JavaScript unchanged. The audit records their exact boundaries. The native version menu offers only v5.3, as requested; its other controls and layout are preserved.

Original sample checkout, sign-in, search, pricing, Share/Export and illustration buttons demonstrate markup and styling. They have no application backend. Hosted starters, Chart.js, Masonry, external images, DocSearch and StackBlitz retain their network requirements.

## Build

Use Node.js 22 or newer. Dependencies are pinned in the lockfile.

```sh
npm ci
npm run build
npm run preview
```

The local preview uses http://127.0.0.1:5198. Ordinary theme builds use the local Bootstrap dependency and the original browser-target/prefixing stage with pinned build dependencies; npm run setup:upstream restores missing pinned upstream archives with integrity verification.

The official documentation has its own pinned dependencies. After building the theme, rebuild its local documentation with:

```sh
npm --prefix docs-source ci --ignore-scripts
node docs-source/build-tq-docs.mjs
```

The documentation build writes docs-source/site/dist. Publish it into the preview folder with:

```sh
node scripts/publish-docs.mjs
```

The docs-source/README-TQ.md file describes the local documentation build. The preview uses Bootstrap's original homepage, documentation structure, content, controls and official examples with the TQ colours. Local asset paths, preview serving and build commands support running that website locally; they are infrastructure, not additional framework components or product features. Bootstrap's native hosted DocSearch retains its network dependency. External services and links are distinct from the locally supplied framework files.

```sh
npm run package
npm run test:portability
```

Archive extraction, relocation and clean rebuild checks run after ZIP creation. The post-archive report records the ZIP hash and remains beside the ZIP, avoiding a circular self-hash claim.

Packaging requires current colour, design-preservation, functionality, accessibility-companion, snippet-export, full-route automated accessibility, local-link and exact remediation-source evidence. Measured asset hashes must match. The previous colour-only acceptance gate is preserved as historical evidence; it cannot certify the subsequent corrections. Compiled framework CSS is checked against both a native build and the official published Bootstrap distributions. The release includes those reports and their current screenshots. The separately labelled pre-restoration findings record historical deviations, rather than current failures. Local build and hosted-service exceptions are documented in the audit; the reports do not claim every website file is byte-identical to upstream.

The [audit guide](qa/README.md) links the current acceptance reports, including the complete example/source colour audit. Run `npm run test:examples` after building and publishing the documentation to repeat that check.

Bootstrap's native Sass also recalculates the contrast-ratio labels displayed on diagnostic colour swatches. Those labels reflect the TQ colours through the original calculation, rather than retaining ratios for the original palette. This is a narrowly scoped colour-derived text exception, documented by the audit.

## Accessibility

The separate companion adds Escape-dismissable, hover-persistent tooltips, paused carousels with explicit rotation controls and Previous/Next controls for the Slides-only variant, and associated persistent form feedback with a focused summary. It supports repeated initialization and disposal, respects reduced motion and retains the native Bootstrap instances and events. Documentation code regions are keyboard-scrollable when they overflow. Dashboard examples include equivalent chart data; inline footer links are underlined; the bottom-navigation examples move the overlapping theme control into normal flow. These are explicit audit corrections.

The companion is loaded automatically by the documentation, examples and exported snippets. For your own pages, include it after the original Bootstrap bundle and call `TQAccessibility.init()`. Its ESM build exposes the same named methods; pass your Bootstrap module namespace to `init({bootstrap})` when no global Bootstrap object is present.

A theme cannot make all content and class combinations conform to WCAG. Evaluate the exact pages, colours, keyboard interactions, forms and workflows that you publish. No full WCAG 2.2 AA conformance claim is made for this release. Unavailable NVDA and Safari/VoiceOver checks remain pending. The audit reports identify diagnostic low-contrast utility demonstrations and the exact tested pages and environments.

See docs/INTEGRATION.md for stylesheet and JavaScript choices.

The current correction report and its scope are in `qa/results/remediation/REMEDIATION.md`. The original missed-items audit remains unchanged under `qa/results/missed-audit-20261022/`.
