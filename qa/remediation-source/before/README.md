# TQ Bootstrap

Bootstrap 5.3.8 with TAFE Queensland colours. The framework, website, documentation and examples come from Bootstrap's pinned official source. The colour theme preserves Bootstrap's original typography, sizes, spacing, corners, shadows, layout, markup and JavaScript behaviour, together with its classes, breakpoints, Sass interfaces, APIs and data-bs-* attributes.

This is an independently maintained theme. Bootstrap and Bootstrap Icons retain their original licences; TAFE Queensland brand names remain their owner's property.

## Download

The release/tq-bootstrap-1.0.0.zip archive contains the complete framework with the colour theme, original Bootstrap source and JavaScript, Bootstrap Icons, and the locally built official Bootstrap website and documentation. Checksums and archive verification results are supplied beside the ZIP.

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
</body>
</html>
```

The full CSS already includes Bootstrap. The original bootstrap.bundle.min.js includes Popper. Load each once. For right-to-left pages use dir="rtl" and bootstrap.rtl.min.css. Bootstrap's data-bs-theme="dark" enables dark mode.

## Contents

- dist/css: themed full, grid, Reboot and utilities builds; LTR/RTL; expanded/minified files and source maps.
- dist/js: unchanged Bootstrap JavaScript distributions and individual modules.
- src/scss: TQ colour substitutions, separate from upstream Bootstrap.
- upstream: original Bootstrap and Bootstrap Icons packages, tagged Bootstrap source and verified download archives.
- assets/bootstrap-icons: the complete Bootstrap Icons 1.13.2 SVG, sprite and font collection.
- docs-source: official Bootstrap website/documentation source, colour substitutions and local build/serving infrastructure.
- index.html and docs/5.3: compiled official documentation and examples.

## Theme

The theme uses the supplied TAFE Queensland palette and the [TQ Website Harmony Palette](https://chatgpt.com/space/page_bdf56e64e4508191a60541e581ae176d). Light-mode pages and the documentation header use white (#FFFFFF), with Magpie Black (#373234) reading text and navigation. TQ Red remains primary. Bootstrap's native colour scales, semantic surfaces, alerts, tables and light/dark variants derive from the role colours below.

| Bootstrap role | TQ colour | Hex |
| --- | --- | --- |
| Primary | TQ Red | #E31B23 |
| Secondary | Magpie Black L1 | #696567 |
| Success | Barrier Reef Teal D2 | #00766C |
| Information | Barrier Reef Teal | #00A89B |
| Warning | Sunkissed | #FF4904 |
| Danger | Flame Tree Red D1 | #8A0008 |
| Light | Koala Grey L2 | #F1EFED |
| Dark | Outback Indigo | #091135 |

Outback Indigo L3 supplies the blue family, Outback Indigo the indigo family, Jacaranda Purple D2 the purple family and Eucalyptus Blossom the pink family. The supplied palette has no separate yellow, green and cyan hues: Bootstrap's yellow family uses Sunkissed, green uses dark teal, and teal/cyan share Barrier Reef Teal. All native colour interfaces remain available. Flame Tree accents and Koala/Magpie neutrals complete the palette; Bootstrap generates their normal tint/shade scales.

Bright teal and orange solid controls use Outback Indigo text for contrast. Primary, secondary, success and danger outlines need a light surface; info/warning outlines need the explicit Indigo `bg-dark` surface. The ordinary dark-mode body remains charcoal. As in native Bootstrap, arbitrary outline/utility and background combinations are not universally accessible. Danger emphasis on dark body uses a lighter tint, and the neutral dark alert uses charcoal text on Koala grey.

Typography uses Bootstrap's original system font stack. Buttons, cards, form controls, dialogs and all other components retain Bootstrap's original shape and geometry. The theme changes colour values, including colours embedded in component SVG assets. Focus paint follows the colour mode; progress and range tracks remain visible. Validation icons retain their original shapes: a measured teal shade for valid feedback and vivid red for invalid feedback. Checked valid controls use success teal and checked invalid controls use danger red so the native white marks remain visible. These corrections change paint only.

Bootstrap's current `$prefix` and legacy `$variable-prefix` Sass settings are retained. The colour aliases follow the selected prefix, and custom focus dimensions remain native. The Sass audit verifies these interfaces and their actual browser focus states.

The same palette also covers example-specific CSS, dashboard charts, inline demonstration SVG paint, generated placeholders and the shared example controls. Every source substitution is recorded and replayed against the pinned original source, preserving geometry and interaction/data logic. Cover navigation/footer text uses a documented white paint tint of .55 rather than .5 for contrast; the remaining example-source alpha values and CSS opacity are retained. The native black sidebar disclosure stroke is retained as a measured contrast exception. The original dashboard chart reads theme colours for its labels, grid and tooltip; a scoped theme-change listener updates and immediately draws its paint, including during native tooltip animation, without changing its data, axes or layout. Original logos, photographs and instructional palette/code references retain their source colours. All 40 gallery entries use fresh TQ screenshots at Bootstrap's original normal/high-resolution sizes; image paths, gallery markup and layout remain native.

The documentation has three narrowly scoped functionality repairs: StackBlitz exports carry their local themed assets into the exported project; theme switching tolerates blocked storage and invalid saved values; and six stale documentation links point to their existing current sections. These repairs preserve the native interface and leave all Bootstrap framework JavaScript unchanged. The audit records their exact boundaries. The native version menu offers only v5.3, as requested; its other controls and layout are preserved.

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

Packaging requires the current colour, design-preservation, functionality, snippet-export and local-link audits to pass with unchanged audited asset hashes. Compiled framework CSS is checked against both a native build and the official published Bootstrap distributions. The release includes those reports and their current screenshots. The separately labelled pre-restoration findings record historical deviations, rather than current failures. Local build and hosted-service exceptions are documented in the audit; the reports do not claim every website file is byte-identical to upstream.

The [audit guide](qa/README.md) links the current acceptance reports, including the complete example/source colour audit. Run `npm run test:examples` after building and publishing the documentation to repeat that check.

Bootstrap's native Sass also recalculates the contrast-ratio labels displayed on diagnostic colour swatches. Those labels reflect the TQ colours through the original calculation, rather than retaining ratios for the original palette. This is a narrowly scoped colour-derived text exception, documented by the audit.

## Accessibility

Bootstrap's original markup guidance and component behaviour apply. A theme cannot make all content and class combinations conform to WCAG. Evaluate the exact pages, colours, keyboard interactions, forms and workflows that you publish. No full WCAG 2.2 AA conformance claim is made for this release.

See docs/INTEGRATION.md for stylesheet and JavaScript choices.
