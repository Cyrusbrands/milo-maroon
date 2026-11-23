# Publishing a release

The public repository is the portable source under github-release, not the entire private working folder. Do not upload the multi-version workspace, build caches, original paid-model masters or raw recording inbox.

Tag: v0.15.1. Mark the first public preview as a prerelease. Include:

- Milo-Maroon-0.15.1-Windows.zip: complete self-contained portable app, with external WebView2 prerequisite.
- Milo-Maroon-0.15.1-USB-Offline.zip: complete offline installer and signed Microsoft WebView2 prerequisite.
- Milo-Maroon-0.15.1-Models.zip: 24 production models plus their license and hash manifest.
- SHA256SUMS.txt and RELEASE-NOTES.md.

The first two ZIPs must contain the application's required files, license notices and sound credits. Do not advertise GitHub's automatic source ZIP as an installer. The source itself uses npm run assets to retrieve large models without putting them in Git history.

Original code is MIT; project-owned visual assets use ASSET-LICENSE.md. Recorded sounds retain their original licenses. Model and original-input rights remain subject to applicable law. See docs/ASSETS-AND-LICENSES.md for provenance and known missing fields.

Before release, validate payload hashes, source checks, model fetch/verification, portable browser tests, native startup and screensaver exit. Confirm public links after uploading. Do not claim complete GPU tests run in CI: the current CI checks source and compiles the Windows host.

Maintainer promotion drafts are in launch-kit. They are not automatically posted.
