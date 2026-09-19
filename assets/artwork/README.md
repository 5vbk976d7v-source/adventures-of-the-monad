# Hologram artwork

The uploaded masters are integrated through `manifest.json`:

- `01-head-front.png`: frontal view for categories.
- `02-head-three-quarter.png`: intermediate turning view.
- `03-head-profile.png`: profile for diagrams, mirrored for alternating categories.

All three uploads are 1024 × 1536 PNGs. Originals remain unchanged. CSS screen blending and a vertical edge mask integrate their dark backdrop into the atlas. The turned images use small scale/position corrections to align them with the frontal master. `FRONT_ANCHORS` and `PROFILE_ANCHORS` in `assets/js/atlas.js` match these displayed positions; update them if artwork registration changes.

Entering a category plays an 820 ms front → three-quarter → profile sequence. Returning reverses it. Short crossfades limit double-face ghosting; diagram chambers fade in during the second half. Connectors resume when the head settles. Both turned images mirror together. Desktop pointer movement adds at most 3 px horizontal / 2 px vertical parallax, with connectors following. Reduced motion uses the destination still directly and disables parallax. Back can interrupt a turn safely.

The head disappears in diagram detail. Fullscreen still uses the original diagram. If any head image is missing, its placeholder remains and navigation falls back to a direct pose change.

Art direction and generation prompts are in `execution/ARTWORK-BRIEF.md`, `execution/01-head-front.prompt.md`, `execution/02-head-three-quarter.prompt.md`, and `execution/03-head-profile.prompt.md`. The existing execution folder is git-ignored; preserve that handoff separately when sharing the repository.
