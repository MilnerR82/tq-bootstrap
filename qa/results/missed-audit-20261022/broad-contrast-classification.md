# Full light-mode contrast flag classification — 22 October 2026

The complete176-route raw scan reported141contrast nodes on40requested routes. Three aliases duplicated10nodes. All**131unique flagged nodes on37final pages** were rebound and compared with native framework/documentation CSS in Chromium.

**31nodes in four TQ-specific root causes** pass with native CSS and fail with the TQ paint. **100nodes also fail with native CSS**. There were**0unclassified,0incomplete,0unmatched,0not-evaluated and0errors**. These are counts within the automated baseline; they do not assert complete page/process conformance or classify unreported contrast conditions.

| Classification | Root cause/context | Unique nodes | Final pages |
| --- | --- | ---: | ---: |
| TQ-specific | Contextual card header reading surface | 6 | 2 |
| TQ-specific | Floating form label alpha on white | 17 | 5 |
| TQ-specific | Three generated palette swatch labels | 3 | 1 |
| TQ-specific | Code comments inside warning callouts | 5 | 2 |
| Also fails with native CSS | White-surface warning/info/light outline demonstrations | 9 | 3 |
| Also fails with native CSS | White-surface warning/info/light utility-link demonstrations | 9 | 2 |
| Also fails with native CSS | Deliberate reduced-opacity utility demonstrations | 15 | 5 |
| Also fails with native CSS | Navbar muted labels and outlined Search controls | 13 | 7 |
| Also fails with native CSS | Default links on neutral sample surfaces | 15 | 7 |
| Also fails with native CSS | Warning-coloured grid/helper reading text | 2 | 2 |
| Also fails with native CSS | Secondary text on dark example surfaces | 3 | 2 |
| Also fails with native CSS | List-group reduced-opacity metadata/completed text | 8 | 1 |
| Also fails with native CSS | Inserted/deleted code-diff syntax lines | 22 | 2 |
| Also fails with native CSS | Scrollspy active text on tinted surface | 1 | 1 |
| Also fails with native CSS | Documentation-reference accent outline demonstration | 1 | 1 |
| Also fails with native CSS | Homepage custom-pill inactive labels | 2 | 1 |

The four TQ-specific cases are contextual card headers(6light nodes; the separate both-mode card proof also finds3dark variants), floating labels(17nodes), palette swatch labels(3nodes), and syntax comments on warning-callout surfaces(5nodes).

The additional warning-code-comment case is**4.10:1** in TQ (`#696567` on`#f5d3c5`) and**5.46:1** in native (`#565c64` on`#f2e7c3`). It occurs in the tooltips and download documentation, and requires4.5:1 for14px code comments. This is ordinary instructional reading content, not a deliberately low-opacity demonstration. The theme sets light-mode `--base03` in`docs-source/site/src/scss/_tq-docs.scss`; native `_syntax.scss` supplies the darker originalcomment paint.

Native failing contexts are still actual limitations on the published TQ pages. The intentional utility demonstrations are identified as such; other retained failures affect actual example navigation, metadata, links and syntax. They are not counted as passing.

Raw per-node values and native axe results are in`broad-contrast-triage.json`; grouping/index records are in`broad-contrast-classification.json`. Source scan aliases and original flags are retained. Product files and prior reports were not changed.
