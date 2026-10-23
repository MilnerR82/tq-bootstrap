# Bootstrap documentation with TAFE Queensland colours

This writable copy uses the original Bootstrap 5.3.8 documentation source. The untouched downloaded source is `../upstream/bootstrap-source/`.

Only colours are themed. The original shapes, corners, spacing, font families, type scale, layout, animations, icon geometry, examples, content, controls and JavaScript are restored. The native hosted DocSearch interface and its original stylesheet are used. The supplied TAFE Queensland palette supplies white light-mode surfaces, charcoal reading text and TQ Red primary actions, with dark teal success, teal information, Sunkissed warning, dark-red danger, Indigo dark surfaces and Jacaranda/pink colour families. Bootstrap generates its normal semantic surfaces, tables and colour scales. Bright teal/orange solid controls use Indigo text for contrast; ordinary dark-mode reading surfaces remain charcoal. The framework README records role aliases and supported outline contexts. The [TQ Website Harmony Palette](https://chatgpt.com/space/page_bdf56e64e4508191a60541e581ae176d) is the recorded palette reference.

Example-specific CSS, chart paint strings, inline demonstration SVGs, generated placeholders and shared example controls also use the TQ palette. Their exact source substitutions are recorded in `../qa/results/example-colour-substitutions.json` and `../qa/results/docs-colour-substitutions.json`, with independent paint-only replay proof. Native layout, content and interaction/data logic remain unchanged. Cover navigation/footer white paint is explicitly increased from .5 to .55 for contrast; the remaining example-source alpha values and CSS opacity remain unchanged. The original black sidebar disclosure stroke is retained for measured contrast. Dashboard chart label, grid and tooltip paint reads the current theme; a scoped theme-change listener requests the chart's original paint update. Original artwork, photographs and instructional palette/code references preserve their source colours. The gallery uses 80 screenshots of the 40 actual themed pages, retaining Bootstrap's native image URLs, dimensions and markup. Original upstream thumbnail source files remain intact.

The explicit local-package infrastructure differences are:

- Framework CSS and original JavaScript are copied to the standard local `/docs/5.3/dist/` paths. The documentation configuration uses those URLs and their calculated SHA-384 integrity values.
- The three native download controls resolve to separate local `tq-bootstrap-1.0.0-dist.zip`, `tq-bootstrap-1.0.0-source.zip` and `tq-bootstrap-1.0.0-examples.zip` files. After Astro finishes, `../scripts/build-downloads.mjs` creates these under `site/dist/release/`; publishing and the complete release preserve them. They never contain the complete release ZIP, avoiding recursive archives. Their entry inventories and SHA-256 values are recorded in `site/dist/release/downloads.json`. The local canonical base URL is `http://127.0.0.1:5198`.
- URL validation accepts local paths for the CDN/download configuration fields.
- The build omits the external Fathom analytics and Carbon Ads loader scripts from generated HTML. Their original source components and template positions remain unchanged; there is no replacement UI.
- An import supplies the same colour-only Sass tokens as the root framework. A final documentation stylesheet contains colour substitutions only.
- StackBlitz exports include local themed framework/documentation assets inside each project, so exported examples do not request localhost paths on the remote preview origin. The native SDK and snippet initialization remain in use.
- The theme helper guards only its stored-theme getter/setter: blocked storage uses an in-memory choice, and invalid stored values fall back to the system preference. Valid storage keeps its original persistence behaviour.
- The build repairs six stale upstream cross-reference destinations in generated HTML. The source content remains original; exact before/after page hashes and URL substitutions are recorded in `tq-docs-build.json`.
- The native version menu offers only v5.3, as requested. Its other controls, classes and layout are preserved. Exact header-subtree comparison and keyboard checks are recorded in `../qa/results/version-scope.json`.
- The build copies the supplied 480×300 and 960×600 TQ example captures onto the native gallery image paths. Their page inputs, dimensions and hashes are recorded in `../qa/results/example-previews.json`; `node scripts/build-example-previews.mjs --verify` checks the capture inputs and files. Re-capturing requires the complete release and its browser-testing dependencies.

Native external examples, hosted search, StackBlitz, imagery and outbound links otherwise retain their original Bootstrap behavior. They may need a network connection. Earlier custom search, markup, accessibility scripts and generated `tabindex` additions are removed. This is not a claim of universal WCAG conformance.

The final encoded inline SVG scan also records the custom breadcrumb divider fill in `../qa/results/inline-svg-colour-substitutions.json`. Its TQ bright-red accent is measured above 3:1 on white and charcoal, with the original SVG dimensions/path and generated copyable markup preserved.

From the framework root, rebuild with:

```
npm --prefix docs-source ci --ignore-scripts --no-audit --no-fund
node docs-source/build-tq-docs.mjs
```

The result is `docs-source/site/dist/`. Serve it as a website root, or publish its contents to the framework root. All three download controls continue to work after the complete release is extracted elsewhere. The source ZIP includes both framework and documentation build inputs: install its root and `docs-source` dependencies, build the framework, run `node docs-source/build-tq-docs.mjs`, then publish the website. The examples ZIP preserves the original `/docs/5.3/` serving paths and includes its preview script. Audit/provenance tooling and evidence remain in the complete release. The shipped [source audit](../qa/results/colour-only-docs-source.json) records every source file comparison and exception. Run `node docs-source/audit-colour-only.mjs` from the framework root to regenerate its workspace report in `docs-source/.cache/`.

Bootstrap source is MIT licensed; its documentation retains its CC BY 3.0 attribution. Original Bootstrap branding and icon artwork are retained.
