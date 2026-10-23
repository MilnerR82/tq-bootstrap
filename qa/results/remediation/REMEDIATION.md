# TQ Bootstrap remediation — 22 October 2026

The confirmed implementation defects from the missed-work audit have been corrected. The native Bootstrap website, normal component geometry and original JavaScript remain intact, with TQ colour substitutions and explicitly recorded accessibility corrections.

**Full WCAG 2.2 AA conformance is not established.** Actual NVDA/Safari/VoiceOver and complete manual page/process decisions remain pending.

## Audit dispositions

| Audit item | Status | Change |
| --- | --- | --- |
| TQ-01–04 | Fixed | Contextual card caps, floating labels, three palette labels and warning-callout code comments. | 
| A11Y-01–03 | Fixed in tested workflows | Separate enhancement runtime supplies tooltip/popover dismissal and hover persistence, paused carousel controls and persistent associated validation errors. Original Bootstrap JS remains byte-identical. | 
| A11Y-04–07 | Fixed | Mobile theme-control collision, dashboard chart equivalent, dark source links and footer link differentiation. | 
| REVIEW-01 | Code corrected and three-engine keyboard checks passed | Overflowing code receives a named keyboard region, including overflow introduced by text spacing. Actual Safari/AT remains pending. | 
| DOC-01–02 | Fixed | TQ download instructions are distinct from stock upstream package/starter instructions; generated upstream CNAME omitted. | 
| Documentation focus | Fixed in tested contexts | Native header focus shadow restored; Search focus colours, Cancel and forced Search outlines corrected; nested/custom mode rings and the copyable Sass recipe match their actual reading surfaces. Normal component geometry remains native. | 
| QA-02 | Inventory delivered; state gaps explicit | Pinned native features/selectors,605 live examples,40 standalone pages and exact result mappings are included; unobserved permutations are not claimed passed. | 
| QA-01 | Pending complete conformance decision | Automated and targeted runtime checks completed. Actual NVDA/Safari/VoiceOver and complete manual criterion decisions remain pending. | 
| Expanded remediation | Fixed in tested contexts | Dark reading/navigation/outline colours, essential form-control boundaries/states, copyable opacity contexts, keyboard scroll regions, split target sizing, normal and forced-colour focus/control paint, copy status announcements, overflowing-table keyboard regions, component initializer guidance and lifecycle/delegation races. | 

## Fresh evidence

| Evidence | Result summary |
| --- | --- |
| [paint](../remediation-20261022/paint-regression.json) | 174 visits; 1452 checks; 0 failed checks; inputs frozen: true | 
| [labels](../palette-labels.json) | 1653 checks; 0 failed checks; 0 findings; inputs frozen: true | 
| [contrast](../palette-contrast.json) | 1032 checks; 0 failed checks; 0 findings; inputs frozen: true | 
| [examples](../example-contrast.json) | 1440 checks; 0 failed checks; 0 findings; inputs frozen: true | 
| [behaviour](../remediation/accessibility-behaviour.json) | 282 checks; 0 findings; inputs frozen: true | 
| [production](../remediation/accessibility-production.json) | 30 visits; 219 checks; 0 findings; inputs frozen: true | 
| [forced](../remediation/forced-focus-state.json) | 2433 checks; 0 findings; inputs frozen: true | 
| [progress](../remediation/progress-forced-utilities-published.json) | 24 visits; 320 observations; 0 findings; inputs frozen: true | 
| [indicators](../remediation/carousel-indicator-forced-published.json) | 16 visits; 288 observations; 0 findings; inputs frozen: true | 
| [forcedGlyphs](../remediation/forced-glyph-state-published.json) | 96 visits; 1112 observations; 0 findings; inputs frozen: true | 
| [focus](../remediation/focus-distributions.json) | 1058 checks; 0 failed checks; inputs frozen: true | 
| [carousel](../remediation/carousel-host-paint.json) | 16 visits; 480 checks; 0 failed checks; inputs frozen: true | 
| [form](../remediation/form-boundary-paint.json) | 24 visits; 168 checks; 0 failed checks; inputs frozen: true | 
| [normal](../remediation/normal-glyph-state-published.json) | 1554 observations; 0 findings; inputs frozen: true | 
| [docs](../remediation-docs.json) | 222 visits; 1145 checks; 0 failed checks; 0 findings | 
| [modeFocus](../remediation/docs-color-mode-focus-published.json) | 36 observations; 0 findings; inputs frozen: true | 
| [geometry](../colour-only-rendered.json) | 2274 checks; 0 failed checks; inputs frozen: true | 
| [remainingGeometry](../remediation/remaining-docs-rendered.json) | 112 checks; 0 failed checks; inputs frozen: true | 
| [chromeFocus](../remediation/docs-chrome-focus-published.json) | 18 visits; 3066 observations; 0 findings; 12 native-caret observations pending; 932 implicit-link Tab steps unsupported; inputs frozen: true | 
| [searchFocus](../remediation/docs-search-forced-focus-published.json) | 24 visits; 432 observations; 0 findings; 16 native-caret observations pending; 0 implicit-link Tab steps unsupported; inputs frozen: true | 
| [environments](../remediation/manual-environments.json) | 108 visits; 468 checks; 0 failed checks; 12 implicit-link Tab steps unsupported; inputs frozen: true | 
| [actualControls](../remediation/actual-forced-controls.json) | 224 checks; 0 findings; inputs frozen: true | 
| [zoom](../remediation/browser-zoom.json) | 48 visits; 202 checks; 0 failed checks; 0 findings; inputs frozen: true | 
| [functions](../docs-functionality.json) | 2956 checks; 0 failed checks; 0 findings; inputs frozen: true | 
| [standalone](../standalone-functionality.json) | 2673 checks; 0 failed checks; 0 findings; inputs frozen: true | 
| [snippets](../snippet-export.json) | 1035 checks; 0 findings; inputs frozen: true | 
| [extraSnippets](../remediation/snippet-remediation.json) | 513 checks; 0 findings; inputs frozen: true | 
| [source](../remediation-source.json) | 0 findings | 
| [coverage](../remediation/coverage-manifest.json) | 605 live examples; inputs frozen: true | 

The full-page scan covers176 local routes in both modes (352 visits), with zero automated violations, JavaScript errors or missing local assets. The raw incomplete results remain visible in the disposition and55-criterion report; they are not counted as passes.

All16 CSS distributions and maps,92 native JavaScript artifacts, the separate enhancement runtime, Bootstrap Icons1.13.2 and three local compact downloads are retained. Package extraction/relocation and clean rebuild evidence is supplied alongside the final ZIP after packaging.

## Visual evidence

![TQ semantic colours with Bootstrap’s native button dimensions and corners.](../screenshots/colour-only-components-buttons-tq.png)

![Firefox keyboard-focused select: visible field text, native arrow and system-colour focus.](../remediation/actual-forced-controls-published/firefox-dark-dark-select.png)


## Exact scope and adaptations

See [integration guidance](../../../docs/INTEGRATION.md), [paint adaptations](../../remediation/paint-adaptations.md), [coverage manifest](coverage-manifest.json), [55-criterion evidence](wcag22-report.json) and [automated disposition](accessibility-disposition.json). The immutable [original audit](../missed-audit-20261022/AUDIT.md) remains available.

No Brightspace package is included. Original hosted search, external starter repositories and third-party embedded media keep their external-service requirements. Local Bootstrap components and exported snippet projects use the supplied theme/runtime assets.
