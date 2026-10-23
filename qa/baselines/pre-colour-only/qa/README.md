# Documentation revision review

The released documentation uses the original Bootstrap 5.3.8 Astro site, documentation layout, examples, component markup and JavaScript, with the TQ theme. The current Harmony 1 application uses white pages and header, charcoal text, warm neutral supporting surfaces and TQ red primary actions and small accents. Dark mode uses the corresponding dark reading surfaces. The replaced custom gallery and its earlier framework reports are outside this review.

## Result

The final documentation review passed **141 automated checks** and the additional palette/state review passed **76 checks** in Chromium, Firefox and WebKit. Together they recorded **22 representative WCAG A/AA rule scans with no detected violations**, no browser script errors and no missing resources in the exercised pages. These results do not establish complete WCAG 2.2 AA conformance.

- All 78 source documentation pages in layout, content, forms, components, helpers and utilities loaded in the native documentation template.
- The homepage, documentation and header defaulted to white reading surfaces. Desktop navigation, article and on-this-page columns remained separate.
- Native example output, visible highlighted code and individual ClipboardJS copy controls worked.
- Native on-this-page anchors, local search, theme selection, responsive navigation, focus return, accordion and modal examples worked.
- Buttons documentation fitted 320, 390, 768, 1024 and 1440px widths in all three engines.
- The original Arabic RTL album example used the themed RTL distribution.
- The published Bootstrap bundle was byte-for-byte identical to the pinned upstream Bootstrap 5.3.8 bundle. No `window.TQ` enhancement runtime was present.
- The palette review measured 426 default, hover and focus foreground/background pairs across light/dark desktop and mobile header, menu, search and primary-action states. The lowest measured text contrast was 4.722:1.
- Native responsive tables accepted focus and ArrowRight horizontal scrolling at 390px in both modes in all three engines. Static focus attributes were added to documentation table wrappers without changing the Bootstrap runtime.
- The current Clearfix page was checked in light/dark mode at desktop and mobile widths. Its white header, charcoal reading text and restrained red accents were visually reviewed.

The documentation accessibility sample covered introduction, buttons, accordion, modal and form controls in light mode, plus buttons in dark mode, in each engine. The additional palette scans covered Buttons at 390px and 1440px in both modes in Chromium. The review did not exercise every example's expanded state or prove conformance of every documentation, colour-swatch/reference or future consumer page.

## Retained native behaviour and pending review

The native Bootstrap Copy tooltip remained visible after pressing Escape in all three engines. This is one retained behaviour issue, reproduced three times, requiring review against **WCAG 1.4.13, Content on hover or focus**. The Bootstrap JavaScript was left unchanged to honour the requirement to use Bootstrap's original runtime without a TQ enhancement layer. The successful check count includes recording this outcome; it must not be interpreted as an accessibility pass for that behaviour.

Axe also retained `incomplete` results for responsive offcanvas attributes and contrast it could not determine because of pseudo elements, clipped or obscured sidebar text, and syntax fragments. Those results remain in the machine-readable evidence for human review.

NVDA, Safari/VoiceOver, actual browser/device zoom and full-page/process accessibility checks remain pending. Playwright WebKit is not Safari/VoiceOver. Installed Microsoft Edge automation was unavailable under organisation policy. No full WCAG conformance claim is made.

## Evidence

- [Final machine-readable review](results/docs-revision.json)
- [Final palette and state review](results/palette-review.json)
- [Current white manifest metadata](results/palette-manifest.json)
- [Initial review before fixes](results/docs-revision-initial.json)
- [Final homepage](results/screenshots/docs-chromium-homepage-light.png)
- [Final desktop documentation](results/screenshots/docs-chromium-desktop-light.png)
- [Final dark documentation](results/screenshots/docs-chromium-desktop-dark.png)
- [Final mobile documentation](results/screenshots/docs-chromium-mobile-light.png)
- [Native RTL example](results/screenshots/docs-chromium-rtl-album.png)
- [Current Clearfix page](results/screenshots/palette-chromium-1440-light-clearfix.png)
- [White mobile menu](results/screenshots/palette-chromium-390-light-menu.png)
- [Mobile search](results/screenshots/palette-chromium-390-light-search.png)

The initial and final reports preserve their own page and dependency hashes. The first documentation review identified dark source-button contrast, inline footer link distinction, code-block keyboard scrolling, a 320px example row overflow and WebKit icon-link names. Its screenshots remain under `results/screenshots/initial/`.

The [pre-palette report](results/docs-revision-pre-palette.json) remains byte-for-byte unchanged, with its [preserved screenshot map](results/docs-revision-pre-palette-screenshots.json). The first white-header pass preserved [documentation results](results/docs-revision-palette-initial.json) and [palette findings](results/palette-review-palette-initial.json): mobile toggler hover became white on white, and narrow responsive tables lacked keyboard access. Both issues were fixed and verified by the final runs. The [palette-initial screenshot map](results/palette-initial-screenshots.json) locates those preserved images.

## Historical browser metadata colour delta, before the current palette

Before the white-header revision, browser `theme-color`, Safari mask-icon colour and web app manifest colours were changed from Bootstrap violet to TQ red with a white manifest background. That historical evidence is retained below and applies to the archived pre-palette report. The current palette review verifies a white browser toolbar, with the Safari mask icon remaining TQ red; the linked current manifest evidence verifies its white theme/background colours.

The [complete source-build comparison](results/docs-source-metadata-delta.json) checks 392 output files and records 152 HTML metadata-only changes, the manifest colour update and the build timestamp. Its [before/expected hash inventory](results/docs-source-metadata-baseline.json) preserves the complete comparison basis.

The historical [published-page delta review](results/docs-metadata-delta.json) confirmed 177 HTML DOMs equivalent after removing only the two permitted colour attributes, 103 unchanged CSS/JavaScript assets, and six white-surface checks. Its expanded baseline capture overlapped publication and directly observed 91 raw HTML changes; it is not presented as a complete pre-publication raw baseline. The complete source-build comparison supplies the exact 152-file historical metadata change evidence. Current colours and current asset hashes are established by the final documentation and palette reviews above.

## Selected SHA-256 values at the final review

| Published asset | SHA-256 |
|---|---|
| `/docs/5.3/dist/css/bootstrap.min.css` | `9e5c3830bcd7566184bcd8a72685f4553701439f3b81ea9194a352782679c6ac` |
| `/docs/5.3/assets/_slug_.BeYSxqh4.css` | `dae5d962360ee9ef8b0b83271563449bceb8065f2091cf6b4ca2eb9ec678d724` |
| `/docs/5.3/dist/js/bootstrap.bundle.min.js` | `e4fd49181388c48ec5040bd3fe66f57c29c8e67fcd8502b3354b96ec7ab47cc7` |

Run `node qa/docs-revision.mjs` and `node qa/palette-review.mjs` against the local preview server to repeat the current reviews. `TQ_BASE_URL` can select a different host; the documentation test also supports `TQ_DOCS_PREFIX`. Results are written under `qa/results/`. The metadata-delta script and its stored baselines describe the historical change, rather than the current palette acceptance test.
