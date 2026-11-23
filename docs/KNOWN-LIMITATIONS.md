# Known limitations

- Windows x64 preview, primary monitor only. No official macOS/Linux screensaver or ARM64 package.
- Unsigned executable; no automatic updater.
- Some limb/prop intersections, held-object alignment and transitions still need individual polish.
- Facial expressions are limited by the generated mesh/rig. A reference sheet can show expressions the current model cannot reproduce exactly.
- Shared procedural poses and approximate clearance, not full body physics or motion capture.
- Simulated days do not match the wall clock; life pauses when closed.
- Random encounters may be missed. Previews and automated scenarios do not guarantee every random combination.
- GPU/model cost can be significant; use Balanced or Energy saver if needed.
- Some owner-supplied Pixabay recordings lack original creator/download-page records. Missing fields remain visible in AUDIO-SOURCES.csv.

- Organization-managed Windows can block Screen Saver Settings. The installer reports that policy and does not change it; the normal application can still run. The development PC blocks this Control Panel, so dropdown verification must also be checked on an unrestricted Windows PC.
