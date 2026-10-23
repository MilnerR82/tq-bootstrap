# Bootstrap integration

Use the official Bootstrap documentation included in this package for markup, component options and APIs. Its examples are built from the pinned Bootstrap 5.3.8 source and rendered with TAFE Queensland colour substitutions. Typography, component dimensions, spacing, corners, shadows and public APIs retain Bootstrap’s defaults. The documented accessibility layer and scoped example/documentation corrections address the missed-work audit; their changes are separate from the colour theme and original upstream JavaScript.

## Stylesheets

For an ordinary website, include dist/css/bootstrap.min.css. It includes Bootstrap; do not add a second Bootstrap stylesheet. Use bootstrap.rtl.min.css for a right-to-left document.

The grid, Reboot and utilities distributions are partial builds. They do not include all component styling. Expanded files and source maps are available for debugging. Edit the colour substitutions in src/scss and rebuild without changing the original upstream source. Bootstrap's non-colour Sass defaults remain unchanged.

Set data-bs-theme="light" or data-bs-theme="dark" on the document or a local component scope. Retain Bootstrap's classes, responsive conventions and Sass variables when extending the theme.

## JavaScript

dist/js/bootstrap.bundle.min.js is Bootstrap's original bundle, including Popper. bootstrap.min.js is the original unbundled build and requires Popper for components that use it. The original ESM distributions and individual modules are also included.

Bootstrap's public constructors, methods, events and data-bs-* attributes are unchanged. Follow the official documentation for initialization, disposal, focus and component options. The original Bootstrap distributions remain intact. A separate optional enhancement runtime is supplied for the accessibility defaults used by the local docs/examples. Load it after Bootstrap and before any tooltip/carousel/custom-validation initializer:

```html
<link rel="stylesheet" href="dist/css/bootstrap.min.css">
<script src="dist/js/bootstrap.bundle.min.js"></script>
<script src="dist/tq/tq-accessibility.min.js"></script>
<script>TQAccessibility.init();</script>
```

Initialise enhanced tooltips with `TQAccessibility.createTooltip(element, nativeOptions)` instead of first creating a separate native tooltip instance. Use tooltips only for short non-interactive text; put actionable help in a named dialog. Enhanced carousels start paused, supply Play/Pause controls and respect reduced motion and focus. Enhanced `form.needs-validation` workflows provide persistent feedback associations and an error summary; remove any duplicate upstream demonstration submit handler. Keep actual labels, constraints and useful error text in the markup.

Initialise focus- or hover-triggered popovers with `TQAccessibility.createPopover(element, nativeOptions)`. They support Escape dismissal and pointer movement onto the description. Click-only popovers retain Bootstrap's native behaviour. Interactive help requires a managed dialog.

The ESM build is `dist/tq/tq-accessibility.esm.js`, exporting `init`, `createTooltip`, `createPopover`, `enhanceCarousel`, `enhanceValidation` and `dispose`. Pass the imported Bootstrap namespace through the `bootstrap` option when not using the global bundle. The layer preserves native component instances, methods, events and data attributes. Use the layer’s disposal function when removing an enhanced region; then dispose any other native instances you created. Retest your own initialization and dynamic-content workflow.

## Local documentation

The local preview/build tools serve the original Bootstrap website with TQ colours and local framework asset paths. They do not add replacement framework components or change Bootstrap’s public APIs. The optional TQ enhancement script and accessible example markup provide the explicitly documented remediation behaviours. Native hosted documentation services, including DocSearch, retain their external network requirements; ordinary Bootstrap components use the supplied local assets.

Diagnostic colour-swatch contrast labels are recalculated by Bootstrap's original Sass from the substituted colours. Their displayed numbers therefore change with the palette; the calculation and swatch geometry are preserved.

## TQ downloads and upstream packages

Use the local compiled download for TQ colours. Copy its `dist` directory to your own site and include exactly one TQ Bootstrap CSS file. The source download contains the TQ Sass inputs and reproducible build instructions. Public `npm install bootstrap`, yarn, RubyGems, Composer and CDN packages install stock Bootstrap; they do not contain this independently packaged theme. Keep their original JavaScript imports if needed, and replace their default stylesheet with the local TQ CSS. Do not load both copies of the CSS.

External repositories and hosted starter projects linked by the retained bundler/framework guides use stock colours. They are labelled as upstream references. Individual documentation snippet exports and the 40 local examples are distinct and include the TQ theme. No hosted TQ npm package or externally published TQ starter is implied.

## Documentation deployment

The preview default is `http://127.0.0.1:5198`. Set `baseURL` in `docs-source/config.yml` to the HTTPS origin you own before rebuilding for publication. Check canonical links, the local assets and all three downloads at that destination. The build omits the upstream custom-domain CNAME; only add a CNAME for your own configured domain if your host requires it. Preview paths must not become the identity of a public deployment.

## Icons

Bootstrap Icons is a separate official utility icon collection. SVGs, the sprite and icon fonts are included in assets/bootstrap-icons. Preserve the original licence. Give meaningful icons an accessible name and hide decorative icons from assistive technology.

## Author responsibilities

Supply page titles, accurate language, semantic headings, text alternatives, table headings, field labels and clear instructions. Preserve visible focus and test every new text/background combination. Audit complete pages and workflows, including keyboard use, zoom, text spacing, responsive layouts and the assistive technologies used by your audience.

The unchanged Bootstrap JavaScript and official documentation examples do not provide a blanket WCAG 2.2 AA guarantee.

The accessibility companion is pinned and tested against Bootstrap 5.3.8; re-audit it when upgrading Bootstrap.

Slides-only carousels receive Previous and Next buttons in the companion control group so every slide remains available when rotation is paused or reduced motion is enabled. Existing carousel controls remain native.

Existing focus widths remain native; plaintext inputs receive explicit visible focus where native Bootstrap suppresses it. Focus colours are measured on the documented host surfaces. Forced-colour mode uses system-colour outlines, original icon shapes and visible selected, progress and loading states, and restores checkbox, radio, select and range visibility. These accessibility corrections are explicitly recorded exceptions to the earlier colour-only scope.

Responsive table wrappers receive a keyboard focus stop and accessible region name only while they actually overflow. Existing author names and focus settings are preserved. The companion monitors layout/content changes and restores only its own attributes on resize or disposal. Keep the table caption and column headings meaningful.

Essential empty-field and unchecked-control borders use contrasting mode-aware ink. Dark-mode range thumbs and selected-state colours use Harmony 1 red variants; the range exposes `--tq-range-thumb-bg`, `--tq-range-thumb-active-bg` and `--tq-range-track-bg` overrides. Close icons and dark carousel indicators retain Bootstrap black while preserving their original paths and opacity. These are colour corrections; native control dimensions remain unchanged.

Spinner examples use Bootstrap's emphasis colour utilities on reading surfaces. Progress examples use suitable contrasting track colours, and stacked examples include visible segment values outside the track so the amounts remain available without colour or clipped labels. Copy the complete example markup, including its colour context and text equivalents.
