# Start using TQ Bootstrap

## Download and open

1. Open [the latest GitHub release](https://github.com/MilnerR82/tq-bootstrap/releases/latest).
2. Download **tq-bootstrap-1.0.0-standalone.zip** and extract the entire ZIP.
3. Open **starter.html** in your browser. Try the dialog, dropdown and dark-mode button.
4. Edit starter.html or copy its stylesheet and script references into your own HTML.

No account, CDN, npm installation or build step is required. Keep the extracted folder structure. The core framework, icons, starter and typography lesson work locally without network access. `dist/js/bootstrap.bundle.min.js` includes Popper; do not load a second Bootstrap stylesheet or JavaScript bundle.

## Included files

- `dist/css/`: complete CSS, RTL versions, partial builds and source maps.
- `dist/js/`: original Bootstrap 5.3.8 scripts and modules.
- `dist/tq/`: optional TQ accessibility companion, already enabled by the starter.
- `assets/bootstrap-icons/`: complete Bootstrap Icons 1.13.2 library.
- `lessons/typography/`: interactive example lesson.
- `docs/INTEGRATION.md`: script, stylesheet, Sass and accessibility guidance.
- `LICENSE` and `THIRD-PARTY-NOTICES.md`: reuse terms and attribution.

The standalone ZIP also contains Sass sources and upstream Bootstrap files referenced by source maps. Source editing and rebuilding need development dependencies; using the compiled files does not.

## Documentation and all examples

For the complete documentation website and all 40 examples, download **Code → Download ZIP** from [the repository](https://github.com/MilnerR82/tq-bootstrap), or clone it:

```sh
git clone https://github.com/MilnerR82/tq-bootstrap.git
cd tq-bootstrap
node scripts/serve.mjs
```

Install Node.js 22 or newer if it is not already installed. Open http://127.0.0.1:5198/. No npm installation is required for this preview. Use a local server for the full documentation because its pages use root-relative asset paths. The server is for local preview, not production hosting. Optional hosted search, online editors, external media and external-service examples still need the internet.

## Verify and rebuild

From the extracted standalone folder or full repository, check all distribution file hashes with Node.js:

```sh
node scripts/check-distribution.mjs
```

To rebuild from the **full repository**, follow the Build section in README.md. `npm install bootstrap` installs the original Bootstrap, not this TQ theme. This project has no published npm package; `private: true` in package.json prevents accidental npm publication and does not prevent downloading or reusing this public repository.

## Reuse and support

The included LICENSE grants MIT terms for independently authored code. Bootstrap, Bootstrap Icons and Popper retain their included MIT notices; Bootstrap documentation retains its CC BY 3.0 attribution. Preserve the applicable notices when redistributing. TAFE Queensland marks, artwork and proprietary fonts are excluded from that software licence. This is an independent adaptation, not an official or endorsed TAFE Queensland release.

Use [GitHub Issues](https://github.com/MilnerR82/tq-bootstrap/issues) to report a problem. Include your browser, steps to reproduce and a small example without private information.

The theme uses installed Helvetica Neue or Arial. Test accessibility on your finished pages: the framework does not guarantee WCAG 2.2 AA conformance for arbitrary content.
