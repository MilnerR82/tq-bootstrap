# TQ Bootstrap audit evidence

The [23 October naming note](../docs/NAMING-2026-10-23.md) records the subsequent local documentation update. The original reports below retain their exact 22 October inputs and are not fresh measurements of the renamed HTML.

This release uses native Bootstrap 5.3.8 with TAFE Queensland colours and explicitly documented accessibility corrections. Normal component typography, dimensions, spacing and corners remain native. High-contrast focus/control adaptations and a small number of corrected example targets are intentional exceptions, recorded in the source and distribution proofs. Original Bootstrap JavaScript remains byte-identical.

The current correction report is [REMEDIATION.md](results/remediation/REMEDIATION.md). The [original omissions audit](results/missed-audit-20261022/AUDIT.md) and [earlier acceptance guide](results/pre-remediation-20261022/README-before.md) are historical evidence. They must not be presented as current passing tests.

## What is verified

- All 16 native CSS distributions and their maps, all 92 original JavaScript artifacts, the complete icon library, native class surface and both toolchain/published-release CSS comparisons.
- Every accepted source change through exact saved-before bytes, ordered edit pairs and current hashes. Historical native-to-TQ paint transformations remain independently reconstructable; new accessibility changes are never called colour-only.
- All native documentation routes and examples, with separate static, rendered, pointer, touch, keyboard, API/lifecycle, copy, export and local-resource evidence.
- Real SDK payloads reconstructed on an isolated origin, including the companion and source maps, with no external project submission.
- Both colour modes, supported semantic/background combinations, diagnostic label contrasts and forced-colour focus/control states.
- Actual normal-mode form boundaries and range states in [the form paint report](results/remediation/form-boundary-paint.json), plus control glyphs, selected states and documented loading/progress contexts in [the normal state report](results/remediation/normal-glyph-state-published.json).
- All documented Progress utility fills and labels in actual supported forced-colour palettes in [the forced Progress report](results/remediation/progress-forced-utilities-published.json); unsupported automatic palette emulation remains explicit.
- Whole-document automated WCAG scans, exact finding dispositions, targeted text-spacing/resizing checks and separately recorded real browser zoom measurements.

## Evidence boundaries

Every browser report records its actual measured input hashes and a before/after freeze check. A changed input makes evidence stale. Historical measurements retain their original hashes; no report is silently rebound to later files. Derived gallery previews have their own 40-page/80-image capture proof and must be published before the final browser suites.

The complete coverage manifest maps source sections, live examples, copyable code, class/semantic/responsive variants, native CSS selectors and explicit interactive-state requirements to their evidence. Unmeasured states remain explicit; CSS presence is not runtime proof.

Automated WCAG checks cover only part of the standard. The 55-criterion report distinguishes available evidence from pending manual and assistive-technology work. The package does not certify arbitrary future content or utility combinations. Hosted search, editor hosting and external media retain their original service requirements; blocked or unavailable integrations are never counted as passing.

## Repeating the checks

Build and publish the framework/documentation, capture and publish the previews, then freeze product files before running the browser suites. The package script loads [the current acceptance gate](remediation/acceptance.mjs); every required report must be complete and match current bytes. The former colour-only gate is preserved in [package-before.mjs](remediation-source/package-before.mjs).

Use the scripts in this folder and remediation/ for the exact runnable matrices. After a product edit, repeat affected measurements and review the exact source delta before packaging. ZIP extraction, relocation, offline local assets, independent downloads and deterministic clean rebuilds are verified after archive creation. Post-archive evidence is stored beside the ZIP so the archive never claims to contain its own final hash.
