# Typography playground

Standalone beginner lesson using the existing TQ Bootstrap compiled CSS and bundled JavaScript. Open `index.html` directly, or use the framework preview server at `/lessons/typography/`.

The four activities cover font families, visual hierarchy, reading layout and a four-question knowledge check. Feedback and progress are kept in memory only. Reloading resets the lesson. No accounts, network services or browser storage are required for the activities. The further-reading link requires internet access.

Keep this directory alongside the framework's `dist/` directory using the existing folder structure. Framework documentation links also need the published `docs/` directory. `lesson.css` contains scoped page styling; the framework distribution is unchanged.

Validation: `node qa/typography-lesson.mjs` from the framework root, with the preview server running. Evidence is in `qa/results/typography-lesson/report.json`. Full activity workflows passed in Chromium, Firefox and WebKit; eight default-state light/dark accessibility scans at 320, 390, 768 and 1440 pixels reported no automated violations. Enlarged text, text-spacing overrides, local-file use and unavailable storage were also checked. This is targeted verification, not a full WCAG conformance claim or a screen-reader audit. The WebKit runner uses form-only Tab navigation, so its skip-link activation test focuses the link explicitly.

Lesson source reference: MDN, “Fundamental text and font styling”, accessed 23 October 2026. The sample font families use local system fonts and generic fallbacks. Exercise targets are teaching examples, not universal typography or accessibility rules.
