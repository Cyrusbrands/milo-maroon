# Development setup

Use Node.js 24+, npm, Python 3 for preview/archive extraction, and Edge or Playwright Chromium for visual tests. Windows native builds need the .NET 10 SDK.

```sh
npm ci
npm run assets
npm run check
npm run dev
```

Open http://localhost:8080. Do not double-click app/index.html: local ES modules/assets need HTTP. Assets download once and verify against assets-manifest.json. A local pack works too: `node tools/fetch-assets.mjs --archive path/to/Milo-Maroon-0.15.1-Models.zip`.

For graphics checks, use Edge on Windows or set EDGE_PATH. Otherwise run `npx playwright-core install chromium`. Run `npm test`; focused tests are listed in package.json. Tests use isolated browser profiles and write ignored results. They do not access production accounts.

For Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File Build.ps1`. Default checks source and model hashes, then publishes a self-contained x64 folder to release-v28. Run its Start.cmd. Add -RunVisualChecks for the expensive pose/world regressions. NuGet restores to .build-home. No runtime binaries or full-length original recordings are committed.

Read ARCHITECTURE.md before changing update order. CI checks source syntax and compiles the native host; it does not claim full GPU/pose validation or publish an asset-complete app automatically. See PUBLISHING.md for release preparation.

Windows installer regression: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File qa/screensaver-registration-check.ps1 -ScreenSaverPath release-v28/Castaway.Modern.scr`. It verifies the native name resource and quoted/spaced registration paths in an isolated registry test key; it does not change your Desktop settings.
