# TQ Bootstrap: Harmony 1 foundation and requested status colours

Current revision: original Bootstrap green success (#198754), base Ochre Sunset warning (#EF7622), white information surfaces with TQ Red accents (#E31B23). Primary and danger remain TQ Red. The user requested these status assignments after the earlier nearest-match palette. This is a user-directed adaptation, not an official combined harmony.

White remains the main page background; Koala Grey L2 (#F1EFED) supplies light neutral panels. Magpie Black (#373234) supplies body text and dark surfaces; Magpie Black L1 (#696567) supplies secondary text. Other named hue families retain their previous native Bootstrap fallbacks. Dimensions, spacing, type sizes, weights, line heights, shapes and upstream JavaScript are unchanged. The default family is Helvetica Neue with Arial fallback.

## Information treatment

The info semantic token is TQ Red for text, borders and links. Alerts, list-group items, table surfaces, filled information buttons and information background helpers use white. Existing borders and text supply the red accents; charcoal reading ink is used where needed for contrast. Information callouts also use white and a TQ Red side border. These surfaces remain white in dark mode. Hover/selected button surfaces use Koala neutrals. Information progress bars retain a red fill because the bar itself is the visual accent. No additional border widths, icons or layout rules are introduced.

The separate `information-utilities` and `information-components` Sass partials contain these paint-only substitutions. Explicit custom Sass `$info` values bypass these default partials. Background utilities still require authors to choose suitable text colours; `.text-bg-info` supplies charcoal text on white automatically.

## Verification

Current targeted checks are recorded in `qa/results/tq-status-revision/`: distribution integrity, native JavaScript preservation, non-colour comparison with the preceding revision, button state contrast, light/dark page scans, responsive alert screenshots, refreshed gallery previews and download verification. Earlier results in `qa/results/tq-status-colours/` and `qa/results/harmony-one-20261023/` describe earlier palettes.

These checks are not a blanket WCAG conformance statement. Complete-page manual and assistive-technology checks remain required. The three compact website downloads are rebuilt; the historical complete release archive remains unchanged.

## Notification contrast and light text

Notification counters and dots on primary buttons use Koala Grey L2 (#F1EFED), with charcoal count text. The examples use existing Bootstrap light/dark utilities; explicit semantic badges keep their meanings. Neutral light text, dark-mode body/secondary/tertiary text and dark dropdown text use pure white. Light background fills remain Koala Grey L2. Explicit opacity utilities and semantic coloured text retain their existing roles. Checks for this revision are recorded in `qa/results/badge-lighttext/`.

## Lighter documentation panels

Light-mode code panels and neutral documentation callouts use #F8F7F6, a 50% white tint of Koala Grey L2 (#F1EFED), rounded to 8-bit RGB. This is a derived tint, not an additional official TQ swatch. Warning and danger side accents retain their status colours; information callouts remain white with red accents. Dark-mode surfaces and Bootstrap component geometry remain unchanged.

## Retired dark-red accent

The dark-red swatch has been removed from the active theme at the user’s request. TQ Red supplies primary and decorative accents; Magpie Black charcoal replaces the retired swatch in reading links, code, focus paint and neutral-context controls. Dark-mode code uses white. The existing `$tq-red-dark` Sass name is retained as a compatibility alias to charcoal; it no longer contains the retired colour. Framework distributions, documentation, example styles and the typography lesson are rebuilt from these sources. Historical audit evidence is retained.

## Brand font family

The framework default is `"Helvetica Neue", Arial, sans-serif`, following the preferred typeface and web-safe fallback on pages 42–43 of the July 2025 brand guidelines. Installed Helvetica Neue is used where available; otherwise Arial or the browser’s generic fallback is used. No proprietary font files are bundled. Bootstrap’s body size (1rem, normally 16px), body line height (1.5), heading/display scales, font weights and responsive sizing are retained. Code remains monospace. Deliberate teaching/editorial font examples retain their own font families. Verification is recorded in `qa/results/brand-font/`.
