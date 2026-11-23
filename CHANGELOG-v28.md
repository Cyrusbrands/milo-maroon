# Milo Maroon 0.15.1 — Ships on the sea

- Corrected the imported cruise/pirate bow axes and normalized the sailboat axis. All four vessel instances now point along their actual travel direction, in ambient visits, stories and quiet visits.
- Replaced independent bobbing with buoyancy sampled from the rendered sea wave function. Longitudinal and transverse samples drive gentle pitch, roll and heave.
- Lowered the sailboat waterline so the hull sits in the sea instead of resting above it on its keel. Cruise and pirate hulls now retain their intended draft without a positive hover offset.
- Added sea-surface bow foam and stern wakes following direction, beam and speed. Wake foam is drawn in the water shader, stays on the wave surface, and fades after departure.
- Preserved visitor frequency, horn ownership, wildlife ecology and Milo's character animation.
- Builds can share verified unchanged media with the previous release to reduce disk use. Changed files are copied independently.

Installer correction: register the literal unquoted .scr path, embed the Windows screen-saver description string (resource ID 1) as Milo Maroon, preserve the previous screensaver activation state, and report administrator policy blocks without changing policy. Quoted/spaced-path, embedded-name and direct .scr launch tests are included in the release check. The Display Control Panel itself is policy-blocked on the development PC.
