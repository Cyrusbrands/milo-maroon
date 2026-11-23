# Architecture

The app is static HTML/CSS and ES modules using local Three.js. The WinForms/WebView2 host in native/ loads the bundled directory through a local virtual host and handles screensaver arguments, fullscreen and exit.

| Modules | Responsibility |
|---|---|
| world.js | Scene, terrain, sea, base character and render loop |
| director.js, life.js | Seeded choices, needs/history, props, activities, weather and visitors |
| patient.js, persistent.js | Quiet intervals and campsite consequences |
| rigged-character.js, face-*.js | Imported Milo, bone adaptation and restrained face controls |
| contact.js, asset-contact.js | Approximate clearance and placement |
| ocean.js | Shoreline journeys, depth, swimming and shared seabed |
| Animal/plant modules | Imported assets, independent skeletons and animation |
| island-assets.js | Collection catalog, prop fitting and mermaid visits |
| world-life.js | Asset roles, friendships, persistence and weather aftermath |
| ecology.js | Bird/fish movement, absence, fishing dives and butterflies |
| seafaring.js | Model axes, wave-following hulls and sea-shader wakes |
| audio.js, recorded-audio.js | Synthesis, recordings, position and voice ownership |
| app.js | Registration order, settings, controls and native messages |

Extensions wrap earlier handlers. Registration order matters: movement, rig and placement corrections follow their inputs, and audio observes final positions. Smoothing controllers keep independent state rather than interpolating from objects earlier handlers reset each frame.

Historical localStorage keys remain for save compatibility. Native preferences/island memory live in LocalAppData/CastawayModern/WebViewProfile. The --qa host uses an isolated profile and local debugging port. Playback does not use a remote AI service.

Collision and water behavior are purpose-built approximations, not general rigid-body physics, a complete navigation mesh or a generative story model.
