# TQ Bootstrap: missed-work audit — 22 October 2026

**Issues were missed.** Four confirmed TQ-specific colour regressions affect contextual card headers, floating form labels, generated palette labels and code comments within warning callouts. Retained Bootstrap examples/documentation also have accessibility failures. The current audited pages cannot be accepted as WCAG 2.2 AA conformant.

This was a read-only review of framework/source/release files. Only new audit evidence was added. The framework and existing ZIP remain unchanged.

## What was verified

- All 176 generated routes were scanned at desktop/light mode (152 unique final URLs after redirects), with zero scan errors, JavaScript errors or missing local assets. Sixteen additional mobile/light/dark states and 24 selected behaviour checks supplement that scan.
- Dark-mode whole-page contrast sampling covers 20 documentation pages; targeted native/paint and behaviour comparisons use Chromium, Firefox and WebKit. This is not a full 176-route dark-mode or every-state/browser accessibility sweep.
- All 396 generated website outputs match published bytes; all 6,657 main ZIP entries match their workspace counterparts. All CSS distributions/maps, 92 original JavaScript artifacts and 2,089 icon-package files are present and intact. The three compact downloads match their current source/output files. No Brightspace package or duplicate/unsafe archive entry was found.
- A four-page rendered-selection omission was closed with 112 additional passing comparisons. Combined evidence now covers all 82 native documentation pages containing 605 live examples at rest, with no geometry/property mismatches. This is not every interactive state.
- Existing release gates still pass when replayed without packaging. Their selected contrast fixtures did not cover the newly failing full-page contexts. Passing those gates did not establish complete accessibility.

The raw automated baseline has 1,032 flagged nodes across 153 route visits, including aliases, repeated footer/code issues and deliberately diagnostic examples. This is **not 1,032 distinct new bugs**.

All 141 light-baseline contrast flags were compared with pinned native CSS. Deduplicating three alias routes leaves 131 unique nodes on 37 final URLs: **31 TQ-only failures across the four root causes** and 100 already failing native/diagnostic contexts, with zero unclassified/unmatched nodes. This classification is bounded to the measured light-mode flags.

## Findings

| ID | Priority | Origin | Finding |
| --- | --- | --- | --- |
| [TQ-01](#tq-01) | High | TQ colour regression | Contextual card headers become unreadable |
| [TQ-02](#tq-02) | High | TQ colour regression | Floating form labels have insufficient contrast |
| [TQ-03](#tq-03) | Medium | TQ colour regression | Three generated palette labels fall below 4.5:1 |
| [TQ-04](#tq-04) | Medium | TQ colour regression | Code comments inside warning callouts have insufficient contrast |
| [A11Y-01](#a11y-01) | High | Retained Bootstrap behaviour | Tooltips do not satisfy dismissal and hover requirements |
| [A11Y-02](#a11y-02) | High | Retained Bootstrap example | Automatic carousels lack a pause control |
| [A11Y-03](#a11y-03) | High | Retained Bootstrap demonstration | Custom validation feedback is not associated with the affected fields |
| [A11Y-04](#a11y-04) | High | Retained Bootstrap example geometry | Floating theme control obstructs mobile navbar opener |
| [A11Y-05](#a11y-05) | High | Retained Bootstrap example markup | Dashboard chart has no accessible data alternative |
| [A11Y-06](#a11y-06) | Medium | Inherited and worsened contrast | Dark source-file toolbar links have insufficient contrast |
| [A11Y-07](#a11y-07) | Medium | Retained Bootstrap documentation styling | Inline footer links rely on insufficient colour distinction |
| [REVIEW-01](#review-01) | Review | Automated candidate requiring browser-specific verification | Scrollable code blocks require further keyboard review |
| [DOC-01](#doc-01) | Medium | Disclosed upstream-content boundary | Some installation and hosted-starter instructions produce stock Bootstrap |
| [DOC-02](#doc-02) | Low | Deployment handover | Upstream custom-domain metadata is still shipped |
| [QA-01](#qa-01) | High | Uncompleted acceptance evidence | Complete WCAG 2.2 AA conformance has not been established |
| [QA-02](#qa-02) | Medium | Verification coverage | A per-variant, interactive-state coverage manifest is still absent |

### TQ-01: Contextual card headers become unreadable

**High — TQ colour regression.** Five light-mode contextual headers have white text on Koala Grey L2 at 1.147:1. Three dark-mode headers have Indigo text on charcoal at 1.459:1. Eight of the sixteen role/mode combinations fail. These are ordinary 16px labels requiring 4.5:1.

Native comparison / interpretation: The five corresponding light-mode native headers pass at 4.67–15.43:1. Native header geometry is unchanged.

Location: `src/scss/_tokens.scss:110; /docs/5.3/components/card/#background-and-color`.

Reproduction: View the contextual primary, secondary, success, danger and dark cards in light mode, then info, warning and light cards in dark mode.

Recommended action: Use a mode-aware contextual cap colour that preserves adequate contrast with the inherited contextual text, retaining native card geometry.

Evidence: [all-card-header-paint.json](all-card-header-paint.json), [palette-context-proof.json](palette-context-proof.json).

[Screenshot: contextual-card-headers-tq-light.png](contextual-card-headers-tq-light.png) · [Screenshot: contextual-card-headers-tq-dark.png](contextual-card-headers-tq-dark.png)

### TQ-02: Floating form labels have insufficient contrast

**High — TQ colour regression.** The inherited .65 colour alpha applied to the lighter TQ body ink yields rgba(55,50,52,.65) on white at 4.260:1 (axe rounds paint channels to 4.24:1). The rule applies in resting and floated states and is used on six published pages; direct sign-in comparisons were performed in all three engines and both modes.

Native comparison / interpretation: Same native markup and alpha with original framework CSS passes at 4.885:1. TQ dark mode passes at 5.639:1.

Location: `src/scss/_tokens.scss:56; upstream/bootstrap/scss/forms/_floating-labels.scss:21; /docs/5.3/examples/sign-in/`.

Reproduction: Open the sign-in example and inspect the ordinary email/password labels; also focus or populate fields to review their floated state.

Recommended action: Adjust the floating-label paint/colour alpha for the TQ ink and both modes, preserving the native size, position and transformation.

Evidence: [floating-label-paint.json](floating-label-paint.json).

[Screenshot: floating-labels-tq-light.png](floating-labels-tq-light.png)

### TQ-03: Three generated palette labels fall below 4.5:1

**Medium — TQ colour regression.** Purple-300 label: 4.459:1. Teal-600 and cyan-600 labels: 4.467:1. These are normal-size readable labels in both modes; ratios must not be rounded upward to claim a pass.

Native comparison / interpretation: Corresponding native labels pass at 6.42–7.57:1. Verified across Chromium, Firefox and WebKit.

Location: `docs-source/site/src/scss/_colors.scss; src/scss/_tokens.scss:54; /docs/5.3/customize/color/`.

Reproduction: Read the purple-300, teal-600 and cyan-600 swatch labels.

Recommended action: Provide contrasting label paint for these generated swatches and add actual minimum-contrast checks alongside the existing hex/label correctness tests.

Evidence: [palette-context-proof.json](palette-context-proof.json).

### TQ-04: Code comments inside warning callouts have insufficient contrast

**Medium — TQ colour regression.** Five unique light-mode comment nodes on the tooltips and download pages use muted TQ text on the peach warning-code surface at 4.10:1. All five fail in each of the three engines; the tested dark-mode comments pass.

Native comparison / interpretation: The same marked nodes with pinned native framework/docs CSS pass at 5.46:1 in light mode. All thirty native node/mode/engine comparisons pass. The complete broad-light contrast triage found four TQ-specific root causes, including this case.

Location: `docs-source/site/src/scss/_tq-docs.scss:14; site/src/scss/_syntax.scss:58; /docs/5.3/components/tooltips/; /docs/5.3/getting-started/download/`.

Reproduction: Read the code comments within the warning callouts on the tooltip and download documentation pages.

Recommended action: Use sufficiently contrasting syntax-comment paint in callout/code contexts and test the actual nested surface in both modes.

Evidence: [broad-contrast-triage.json](broad-contrast-triage.json), [broad-contrast-classification.json](broad-contrast-classification.json), [warning-comment-proof.json](warning-comment-proof.json).

[Screenshot: warning-code-comment-tq-light.png](warning-code-comment-tq-light.png) · [Screenshot: warning-code-comment-native-light.png](warning-code-comment-native-light.png)

### A11Y-01: Tooltips do not satisfy dismissal and hover requirements

**High — Retained Bootstrap behaviour.** In all three engines, the tested tooltip remains after Escape and disappears when the pointer moves onto it. A second tooltip actually obscures preceding text and also remains after Escape.

Native comparison / interpretation: Framework JavaScript remains byte-identical to Bootstrap 5.3.8; this is retained behaviour rather than a new TQ script regression.

Location: `/docs/5.3/components/tooltips/; original Tooltip implementation`.

Reproduction: Open the inline tooltip with pointer/focus, press Escape, then try moving onto its content.

Recommended action: Add narrowly scoped accessible tooltip dismissal/hover behaviour without changing the Bootstrap API. This is a non-colour accessibility change.

Evidence: [targeted-accessibility.json](targeted-accessibility.json), [behaviour-confirmation.json](behaviour-confirmation.json).

[Screenshot: obscuring-tooltip-after-Escape.png](obscuring-tooltip-after-Escape.png)

### A11Y-02: Automatic carousels lack a pause control

**High — Retained Bootstrap example.** The carousel example advances from slide 0 to slide 1 after 5.6 seconds, even with reduced motion requested; it has no pause control and continues when keyboard focus is inside. Confirmed in all three engines.

Native comparison / interpretation: The native example uses automatic cycling and hover pause; TQ did not change that behaviour.

Location: `/docs/5.3/examples/carousel/ and related automatic carousel examples`.

Reproduction: Wait on the carousel example without hovering it; focus a control and observe continued cycling.

Recommended action: Start paused or provide a keyboard-operable persistent pause control. This changes example behaviour, rather than the colour palette.

Evidence: [behaviour-confirmation.json](behaviour-confirmation.json), [targeted-accessibility.json](targeted-accessibility.json).

[Screenshot: carousel-without-pause-control.png](carousel-without-pause-control.png)

### A11Y-03: Custom validation feedback is not associated with the affected fields

**High — Retained Bootstrap demonstration.** Submitting the custom-validation example reveals five feedback messages without feedback IDs/aria-describedby associations, no error summary/live region, and focus remains on Submit. The native documentation itself warns that these custom validation styles are not accessible.

Native comparison / interpretation: This is a retained native demonstration. Absence of an error summary alone is not a WCAG failure; missing associations and announcement behaviour need remediation review and actual assistive-technology verification.

Location: `/docs/5.3/forms/validation/`.

Reproduction: Submit the empty custom-validation example and inspect field/feedback relationships and announcements.

Recommended action: Associate persistent errors and test their announcements/focus in an accessible validation workflow. Do not certify this demonstration from visual error styling alone.

Evidence: [targeted-accessibility.json](targeted-accessibility.json), [accessibility-review.md](accessibility-review.md).

[Screenshot: validation-errors-not-associated.png](validation-errors-not-associated.png)

### A11Y-04: Floating theme control obstructs mobile navbar opener

**High — Retained Bootstrap example geometry.** The theme control covers 74.3% of the measured bottom-navbar opener at the tested mobile width in all three engines. The 320px axe review flags target size. The earlier functional test succeeded by clicking an exposed edge; this does not establish satisfactory target usability.

Native comparison / interpretation: The overlap is inherited. It is a concrete usability issue; partial coverage alone is not a confirmed failure of Focus Not Obscured.

Location: `/docs/5.3/examples/navbar-bottom/; /docs/5.3/examples/navbars/`.

Reproduction: At 320/390px, inspect the bottom-right navbar opener under the floating theme menu.

Recommended action: Resolve the example control collision and reassess target-size exceptions. This requires a deliberate non-colour layout adjustment.

Evidence: [targeted-accessibility.json](targeted-accessibility.json), [accessibility-review.md](accessibility-review.md).

[Screenshot: mobile-navbar-theme-overlap.png](mobile-navbar-theme-overlap.png)

### A11Y-05: Dashboard chart has no accessible data alternative

**High — Retained Bootstrap example markup.** Both dashboard canvases have no accessible name, fallback text or equivalent chart-data text. The following table is unrelated placeholder data. Axe reports alone did not identify this missing equivalent.

Native comparison / interpretation: Canvas markup is byte-identical to the pinned native source.

Location: `docs-source/site/src/assets/examples/dashboard/index.astro:197; dashboard-rtl/index.astro:198`.

Reproduction: Inspect #myChart and compare the chart values with the page text/table.

Recommended action: Provide an accessible chart description and equivalent data; verify the experience with assistive technology.

Evidence: [manual-evidence.json](manual-evidence.json).

### A11Y-06: Dark source-file toolbar links have insufficient contrast

**Medium — Inherited and worsened contrast.** Source-file toolbar links measure 2.398:1 on the dark toolbar surface. The 20-page dark sweep records 79 such nodes on 16 sampled pages, including the spacing page under review.

Native comparison / interpretation: The native comparison also fails at 3.538:1; the TQ colours worsen the existing shortfall.

Location: `docs-source/site/src/components/shortcodes/ScssDocs.astro:60; JsDocs.astro:58; /docs/5.3/utilities/spacing/`.

Reproduction: Switch spacing or another source-referencing page to dark mode and inspect the file links above code.

Recommended action: Use appropriate mode-aware text/link paint for documentation source toolbars.

Evidence: [palette-sweep.json](palette-sweep.json), [palette-context-proof.json](palette-context-proof.json).

### A11Y-07: Inline footer links rely on insufficient colour distinction

**Medium — Retained Bootstrap documentation styling.** Four prose links have no persistent underline and only 2.19:1 light / 1.31:1 dark link-to-surrounding-text distinction, below the 3:1 colour-only distinction alternative. The repeated footer accounts for many raw route flags.

Native comparison / interpretation: Pinned native CSS also fails at 2.22:1 light / 1.57:1 dark.

Location: `docs-source/site/src/components/footer/Footer.astro:23; site/src/scss/_footer.scss:5`.

Reproduction: Inspect the team/contributors and licence links within footer sentences before hover/focus.

Recommended action: Provide sufficient persistent differentiation. A persistent underline would be a documented non-colour styling change.

Evidence: [footer-paint-proof.json](footer-paint-proof.json), [accessibility-scan.json](accessibility-scan.json).

[Screenshot: footer-tq-light.png](footer-tq-light.png)

### REVIEW-01: Scrollable code blocks require further keyboard review

**Review — Automated candidate requiring browser-specific verification.** Axe flags 349 nodes across 78 route visits. The tested PRE is reachable by Tab in Chromium and Firefox but skipped in the tested WebKit environment.

Native comparison / interpretation: These are not 349 confirmed keyboard failures. Actual Safari/OS keyboard settings and assistive-technology behaviour remain untested.

Location: `Scrollable documentation code examples`.

Reproduction: Attempt keyboard-only horizontal scrolling in the actual supported browser and OS configuration.

Recommended action: Complete browser-specific keyboard verification before dispositioning each rule/context.

Evidence: [accessibility-scan.json](accessibility-scan.json), [behaviour-confirmation.json](behaviour-confirmation.json).

### DOC-01: Some installation and hosted-starter instructions produce stock Bootstrap

**Medium — Disclosed upstream-content boundary.** The native homepage/npm/yarn instructions install bootstrap@5.3.8 from npm, which supplies stock colours. Hosted Vite/webpack/Parcel/React and other starters remain upstream projects. They are not TQ-themed exports.

Native comparison / interpretation: The existing README discloses the external-service and original instructional-content boundary. The local 40 examples and documentation snippet exports are distinct and themed.

Location: `docs-source/site/src/components/home/MastHead.astro:40; home/GetStarted.astro:33; npm/yarn download instructions and hosted starter links`.

Reproduction: Follow the visible stock npm command or open a hosted upstream starter.

Recommended action: Clearly distinguish the TQ distribution/integration path from upstream installation/reference examples.

Evidence: [palette-findings.md](palette-findings.md).

### DOC-02: Upstream custom-domain metadata is still shipped

**Low — Deployment handover.** CNAME still specifies getbootstrap.com; the configured canonical origin is the explicitly documented localhost preview. Local preview is unaffected, but publication needs owned-domain/origin configuration.

Native comparison / interpretation: This is retained upstream metadata, not a missing framework component.

Location: `CNAME:1; docs-source/site/static/CNAME:1; docs-source/config.yml:2`.

Reproduction: Inspect the supplied CNAME before publishing the documentation.

Recommended action: Document the deployment step and remove/replace generated custom-domain metadata appropriately.

Evidence: [scope-findings.json](scope-findings.json).

### QA-01: Complete WCAG 2.2 AA conformance has not been established

**High — Uncompleted acceptance evidence.** The prior handover correctly disclaims full conformance. It lacks completed criterion-by-criterion decisions, actual NVDA/Safari/VoiceOver evidence, actual 200% text resize/400% zoom review and complete manual workflow review. The current audit additionally confirms actual page-level failures.

Native comparison / interpretation: Using native Bootstrap and passing the earlier targeted fixtures does not meet the original complete-page acceptance condition.

Location: `README.md Accessibility; qa/README.md Limits`.

Reproduction: Review the acceptance evidence against the original WCAG requirements.

Recommended action: Fix confirmed failures and complete scoped manual/assistive-technology checks. The new 55-row evidence checklist records gaps, not a certificate.

Evidence: [accessibility-review.md](accessibility-review.md), [wcag22-evidence-checklist.json](wcag22-evidence-checklist.json).

### QA-02: A per-variant, interactive-state coverage manifest is still absent

**Medium — Verification coverage.** Family/page inventories and selected-state tests exist, but not the originally requested one-to-one feature/variant/state-to-example-to-result manifest. A missed four-page geometry selection has now been checked separately: all 112 additional comparisons pass.

Native comparison / interpretation: All 82 native documentation pages with 605 live examples now have at-rest geometry evidence; this is not every interactive state or utility/background combination.

Location: `qa/rendered-parity.mjs:17; existing coverage reports`.

Reproduction: Compare the original manifest requirement with the available page/family inventories.

Recommended action: Maintain explicit variant/state coverage, including full-page contrast contexts, rather than treating assertion totals as exhaustive acceptance.

Evidence: [scope-findings.json](scope-findings.json), [remaining-docs-rendered.json](remaining-docs-rendered.json), [remaining-docs-harness-proof.json](remaining-docs-harness-proof.json).

## WCAG evidence checklist

The [55-criterion A/AA checklist](wcag22-evidence-checklist.json) records 31 Level A and 24 Level AA criteria from the official WCAG 2.2 publication. It maps automated rule tags and confirmed/manual findings. It is a gap/evidence checklist, not a completed conformance report or certificate. No row is silently treated as a full conformance pass.

Actual NVDA, Safari/VoiceOver, browser text resizing/zoom and complete manual workflow review remain pending. Missing error-summary markup alone is not counted as a criterion failure. Checkout negative-gutter overflow matches native Bootstrap and keeps controls inside the viewport, so it is not asserted to fail Reflow. Scrollable-code flags require browser/OS keyboard verification; Chromium and Firefox auto-focus behaviour differs from the tested WebKit environment.

## Fix order

1. Correct and regression-test the four TQ-specific paint issues in actual component/page contexts, in both modes.
2. Correct documentation chrome contrast, distinguishing intentionally diagnostic examples from ordinary reading UI.
3. Resolve the documented non-colour accessibility behaviour/markup gaps as deliberate exceptions to the colours-only scope; preserve Bootstrap interfaces and record each change.
4. Complete manual/assistive-technology decisions and the feature/variant/state coverage manifest; only then reassess exact-page WCAG conformance and package a corrected release.

## Release identity and sources

Audited ZIP: `release/tq-bootstrap-1.0.0.zip`, 73,081,923 bytes. SHA-256: `8aac11c1842da42bffefc3a19116fd29be02760c9722061dc07ada2441c9be8a`.

- [Official Bootstrap versions, checked 22 October 2026; latest stable remains 5.3.8](https://getbootstrap.com/docs/versions/)
- [Bootstrap accessibility limitations](https://getbootstrap.com/docs/5.3/getting-started/accessibility/)
- [WCAG 2.2 complete-page and process conformance requirements](https://www.w3.org/TR/WCAG22/#conformance-reqs)

[Machine-readable summary](audit-summary.json) · [Raw whole-page scan](accessibility-scan.json) · [Accessibility triage](accessibility-review.md) · [Palette/native comparisons](palette-findings.md) · [Distribution/archive audit](scope-findings.json)
