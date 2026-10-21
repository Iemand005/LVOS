# AGENTS.md

Guidance for agents working in this repository (LVOS / VulpOS).

## Testing

- **Any test that is written MUST be a Playwright test.** Do not add ad-hoc
  `*.mjs`/`node` scratch scripts as the way to verify behaviour — put it in a
  spec under `Tests/` and run it with `npx playwright test`.
- Specs live in `Tests/` (the config's `testDir` is `./tests`; on Windows this
  resolves to the same folder). Naming: `Tests/<feature>.spec.ts`.
- `playwright.config.ts` runs with `channel: "chrome"` and `headless: false`.
  Override per file when needed with `test.use({ headless: true, channel: "chrome" })`.
- The app specs (`Tests/VulpOSTester.ts`, `main.spec.ts`, ...) expect a static
  server on `http://localhost:3621/`. Tests that do not need it (e.g. booting the
  built bundle) can load `Dist/index.html` via a `file://` URL instead.
- Run a single spec with:
  `npx playwright test Tests/<name>.spec.ts --reporter=list`
- Prefer deterministic assertions (wait for a `windowManager`/`desktopManager`
  state, then measure) over `waitForTimeout`.

## Build

- `npm run build` — minified bundles into `Dist/` (a git submodule).
- `npm run build:dev` — unminified bundles (same output, readable).
- `build.js` concatenates an ordered source list per page into a single
  `desktop.dist.js` / `mobile.dist.js`. Order is load-critical; see the
  `BUNDLES` map and its comments. Anything referenced by `index.html`'s
  `<script>` tags (ScrollTabs, ScreenShooter, ...) must be listed there so the
  desktop page loads only the one bundle.
- **Extensions are never baked into a bundle.** `Scripts/Extensions/*.js` is
  copied into `Dist/Scripts/Extensions/` and the built page loads the scripts
  it asks for as separate deferred scripts (the build reads those `<script>`
  tags out of the source page). A bundle must never contain an extension
  implementation; the bundle only holds the extension *framework*.
- The `Scripts/WebGraphics`, `Scripts/WebAudioVisualizer`, `Scripts/WebAura`,
  `Scripts/WebMedia` and `ScrollTabs` folders are still copied into `Dist/`
  because the application iframes load them directly.
- `.d.ts` files are removed from `Dist/` after the build: the type declarations
  are only needed to type check the sources, not in a browser.
- The build merges adjacent `Object.defineProperty(obj, key, attrs)` calls that
  share a target into one `Object.defineProperties` call using the TypeScript
  compiler API. Source files keep the individual calls; pass
  `--no-merge-props` to disable the rewrite.

## Notes

- Multi-instance apps: set `multiple: true` on an app in `ProvisionedApps.js`.
  Icon clicks and drops then spawn extra windows (`WindowManager.spawnApp`) with
  unique ids (`app#2`, `app#3`, ...); plain apps keep reusing their one window.
- Windows / PowerShell: `head`, `tail`, `grep`, `sed`, `wc` are not available as
  commands. Use `rg`, `Get-Content`, `Select-Object`, and the dedicated file tools.
- Desktop source order matters: `Reflector.js` must precede `DesktopManager.js`
  (it does `new Reflector` at load), and `index.js` boots last.
