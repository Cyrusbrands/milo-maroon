# Contributing

Start with a reproducible bug or a focused improvement. Open an issue before building a large feature. Follow [development setup](docs/DEVELOPMENT.md) and read [architecture](docs/ARCHITECTURE.md) before changing update order.

Run `npm run check` and `npm test`. Limb changes should also run `npm run test:hands`; ship/water changes should run `npm run test:ships`. Include an application screenshot or short clip for visual changes and describe remaining limits. Simulation time is not a real-time performance benchmark.

## Design rules

- Quiet moments matter. More events should not mean constant events.
- Keep visitor cooldowns long; previews may invite encounters immediately.
- Preserve offline operation, muted Windows preview, pause, reduced motion and save migration defaults.
- Use fixed limb lengths and attach props to the appropriate hands.
- Respect shared shore, seabed and wave coordinates. Test interruptions and returning to land.
- Keep resources bounded, reuse geometry/textures, and dispose of owned resources.

## Adding an activity

Register metadata in app/director.js. Add animation logic in a focused module, delegating other activities to the previous handler. Persistent consequences belong in completion logic, not every frame. Test early/middle/late phases, interruption, idle, night and storms. Update activity-count assertions when needed.

The current system is compact and uses layered wrappers. Clear, tested refactoring is welcome.

## Assets and AI-assisted contributions

Contribute only assets you have rights to share. Record source, license, modifications and generation workflow. Identify AI-assisted work honestly. Do not relicense third-party recordings under MIT. Do not commit original Johnny Castaway files, commercial-game reference screenshots, credentials, private profiles or installed runtimes.

Explain what viewers see before and after, why the change helps, and how it was tested. Please do not trade stars, spam communities or claim endorsements to promote the project.
