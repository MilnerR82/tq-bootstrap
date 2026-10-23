# Bootstrap integration

Use the official Bootstrap documentation included in this package for markup, component options and APIs. Its examples are built from the pinned Bootstrap 5.3.8 source and rendered with TAFE Queensland colour substitutions. Typography, dimensions, spacing, corners, shadows, layout, markup and JavaScript behaviour remain Bootstrap's originals.

## Stylesheets

For an ordinary website, include dist/css/bootstrap.min.css. It includes Bootstrap; do not add a second Bootstrap stylesheet. Use bootstrap.rtl.min.css for a right-to-left document.

The grid, Reboot and utilities distributions are partial builds. They do not include all component styling. Expanded files and source maps are available for debugging. Edit the colour substitutions in src/scss and rebuild without changing the original upstream source. Bootstrap's non-colour Sass defaults remain unchanged.

Set data-bs-theme="light" or data-bs-theme="dark" on the document or a local component scope. Retain Bootstrap's classes, responsive conventions and Sass variables when extending the theme.

## JavaScript

dist/js/bootstrap.bundle.min.js is Bootstrap's original bundle, including Popper. bootstrap.min.js is the original unbundled build and requires Popper for components that use it. The original ESM distributions and individual modules are also included.

Bootstrap's public constructors, methods, events and data-bs-* attributes are unchanged. Follow the official documentation for initialization, disposal, focus and component options. No custom TQ JavaScript runtime is required or supplied.

## Local documentation

The local preview/build tools serve the original Bootstrap website with TQ colours and local framework asset paths. They do not add framework components or change component APIs. Native hosted documentation services, including DocSearch, retain their external network requirements; ordinary Bootstrap components use the supplied local assets.

Diagnostic colour-swatch contrast labels are recalculated by Bootstrap's original Sass from the substituted colours. Their displayed numbers therefore change with the palette; the calculation and swatch geometry are preserved.

## Icons

Bootstrap Icons is a separate official utility icon collection. SVGs, the sprite and icon fonts are included in assets/bootstrap-icons. Preserve the original licence. Give meaningful icons an accessible name and hide decorative icons from assistive technology.

## Author responsibilities

Supply page titles, accurate language, semantic headings, text alternatives, table headings, field labels and clear instructions. Preserve visible focus and test every new text/background combination. Audit complete pages and workflows, including keyboard use, zoom, text spacing, responsive layouts and the assistive technologies used by your audience.

The unchanged Bootstrap JavaScript and official documentation examples do not provide a blanket WCAG 2.2 AA guarantee.
