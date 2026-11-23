# Milo Maroon 0.15.1 — First public island preview

A castaway. A tiny island. An unreasonable number of ways to miss a rescue.

This is the first public preview of Milo Maroon, an original Windows 3D island screensaver inspired by the charm of Johnny Castaway. It is independent and unofficial.

## What is here

75 authored activities, quiet intervals, an original castaway and animal companions, a changing campsite, swimming/reef scenes, dolphin visitors, fishing birds, unusual offshore guests and a position-aware soundscape. The latest ship pass corrects bow directions, hull immersion, wave-following and wakes.

## Which download?

- USB-Offline.zip: complete offline installer with Microsoft WebView2 prerequisite. Extract fully, then run Install.cmd.
- Windows.zip: portable self-contained application. Extract fully and run Start.cmd. WebView2 must already be installed.
- Models.zip: optional model pack for source contributors; normal application downloads already include these models.

Windows 10 22H2 / Windows 11, Intel/AMD x64 and hardware-accelerated WebGL. Primary monitor only. The .NET runtime is included. The app is unsigned; checksums verify file integrity, not safety. Do not disable security software.

## Honest preview limits

Some poses and prop collisions still need polish. Facial controls are limited by the generated rig. The behavior system is authored/local, not runtime LLM storytelling or a full physics engine. Life pauses while the app is closed. No automatic updater is included.

Creative direction and testing by Cyrusbrands, with Codex-assisted code and Tripo-generated models. Code is MIT, project-owned visuals are separately licensed, and recordings retain their own licenses. Pixabay per-file provenance gaps remain documented rather than invented.

Read the illustrated development story, report a reproducible bug, or contribute an improvement. Keep the island patient.

Installer correction: register the literal unquoted .scr path, embed the Windows screen-saver description string (resource ID 1) as Milo Maroon, preserve the previous screensaver activation state, and report administrator policy blocks without changing policy. Quoted/spaced-path, embedded-name and direct .scr launch tests are included in the release check. The Display Control Panel itself is policy-blocked on the development PC.
