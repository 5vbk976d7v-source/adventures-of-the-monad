# Consciousness Atlas — Agent Handoff

This file is the working handoff for continuing the Consciousness Atlas in development mode. Read this first, then `docs/ATLAS_SPEC.md` for the full product specification.

## Project intent and architecture

Build an independent Scientific / Holographic Atlas for technical diagrams about human consciousness. The September 2026 technical pivot replaces the dynamic backend with a static GitHub Pages site. Do not reintroduce PHP, Apache configuration, request-time image processing, directory scanning endpoints, a database or WordPress dependencies.

Current version: **v0.4**. The old specifications/backend are archived in `backups/pre-github-pages-2026-09-20.tar.gz`. Archives are never published.

- `diagrams/<category>/`: original content and `folder.json` metadata.
- `docs/Knowledge Atlas Folder Structure.pages`: source taxonomy and starter artwork.
- `atlas.json`: generated runtime catalog with stable IDs and relative asset URLs.
- `assets/diagrams/`: generated, versioned WebP derivatives and incremental-build manifest.
- `_site/`: allowlisted static deployment artifact.
- `.github/workflows/`: PR checks and main-branch Pages deployment.

## Local development

Use Node.js 22 or newer:

```bash
npm ci
npm test
npm run build
npm start
# http://127.0.0.1:8080
```

Sharp is an authorized build-only development dependency. There are no browser/runtime package dependencies. The local server serves `_site/`; rebuild after changing sources. The browser fetches only `atlas.json`, with no dynamic or demo fallback. Preserve support for repository subpaths and custom-domain roots.

## Agreed visual direction

The approved direction is **Scientific / Holographic Atlas**, based on Concept 03 from the design exploration.

Core visual rules:

- dark scientific field;
- a finished holographic **human head / brain**, not a generic placeholder shape;
- head uses supplied front, three-quarter and profile raster artwork from `assets/artwork/manifest.json`;
- front perspective at top-level categories;
- profile perspective after entering a category;
- large image-containing chambers are rounded / oval / lens-like, not rectangular cards;
- active chambers deliberately use different sizes and proportions;
- actual diagrams are the primary content;
- vignette / holographic treatment fades image edges into the chamber;
- restrained cyan / white / violet light language;
- technical HUD details stay secondary to diagram readability;
- generous negative space;
- asymmetrical composition rather than a regular radial menu.

Do not add Japanese decorative characters. The earlier `未来` motif was explicitly rejected and must remain absent.

## Holographic head / brain requirements

The head must read as a designed holographic object and contain multiple layers:

- outer skull / head contour;
- face or profile contour;
- brain outline;
- hemisphere / lobe paths;
- neural / circuit paths;
- luminous points;
- faint halos / scan marks.

Connector lines from chambers must terminate at **different visual/anatomical points across the head/brain**. They must not all converge in the center.

Current anchor arrays live in `assets/js/atlas.js`:

- `FRONT_ANCHORS`
- `PROFILE_ANCHORS`

If visual tuning changes the head artwork geometry, update those anchor maps as part of the same change.

## Semantic zoom model

The atlas has depth, not conventional pages.

### Top-level categories

Expected final 16-group progression:

The 16 groups (which should be the final set, but not sure so we should keep flexible for now) are partitioned into three generations of sizes 6, 6, and 4. As continuous depth increases past thresholds T1 and T2, generation 2 then generation 3 become dominant.

During outward zoom:

- the newly revealed group becomes large and dominant;
- the immediately previous six shrink and move **between** the new dominant chambers;
- older groups become even smaller contextual traces;
- older nodes remain interwoven through negative space, not pushed onto separate rings;
- transitions must interpolate smoothly; no abrupt scene swap.

Large nodes must have intentionally different dimensions, following Concept 03.

### Inside a category

The same semantic-depth mechanic is reused for diagrams:

```text
first 6 diagrams dominant
next 6 dominant while previous 6 shrink between them
next 6 dominant while prior generations shrink further
...continue as needed for large folders
```

Category counts are data-driven; add fixtures when testing multiple generations.

## Interaction model

### Desktop

- mouse wheel down always advances outward through semantic generations and stops at the final generation; it never exits the current semantic mode;
- mouse wheel up over a hovered category/diagram accumulates intent toward entering that object after the configured threshold;
- mouse wheel up over empty space or the head decreases continuous semantic depth;
- at settled diagram depth 1, additional wheel-up intent accumulates toward returning to the category field after the configured back threshold;
- arriving at depth 1 resets wheel intent, so the movement used to arrive there is not counted toward leaving diagrams;
- intent resets when direction, target, or semantic state changes, and after the idle timeout;
- click category/diagram: enter directly;
- Arrow Down / Arrow Up: depth navigation;
- Escape / Backspace: explicit back one semantic level (including leaving detail); wheel does not auto-exit detail.
- Two slim graded depth meters sit at the stage edges. Clicking or dragging either meter changes semantic depth; their visual scale extends slightly beyond both real depth limits.

Important: wheel depth is **continuous**. `targetDepth` is a float and `depth` eases toward it with `requestAnimationFrame`. Do not revert to integer-only stage snapping for desktop wheel behavior.

Interaction tuning lives in the `ATLAS_TUNING` object in `atlas.js`:

```js
const CHUNK = 6;
const ATLAS_TUNING = {
  wheelSensitivity: 0.0025,
  enterScrollThreshold: 180,
  backScrollThreshold: 240,
  intentIdleMs: 450,
  backSwipeDistance: 96,
  swipeDistance: 48,
  pinchSensitivity: 0.012
};
```

`enterScrollThreshold` controls how much inward wheel intent is required to enter a hovered node. `wheelSensitivity` controls continuous desktop depth movement. At settled diagram depth 1, `backScrollThreshold` controls the additional wheel-up intent required to return to categories. `intentIdleMs` clears accumulated intent after inactivity. Vertical touch swipes use `swipeDistance` to advance or return between generations; a deliberate downward swipe beginning at settled diagram depth 1 uses `backSwipeDistance` to return to categories. `pinchSensitivity` controls touch pinch depth. Fingers moving together increase depth and fingers spreading decrease it. Pinch never changes semantic mode and never synthesizes a tap or swipe. Browser pinch outside the atlas/fullscreen view remains browser zoom, and Ctrl-wheel remains available for browser zoom. Tune these after testing both a normal mouse wheel and a high-resolution trackpad.

### Mobile / touch

- vertical swipe up: next outward semantic generation;
- vertical swipe down: previous inward semantic generation;
- a deliberate downward swipe starting at settled diagram depth 1 returns to the category field;
- first tap on node: select / highlight;
- second tap on selected node: enter;
- back control: explicit back one semantic level;
- pinch with fingers together increases depth; spread fingers decreases depth;
- pinch never switches semantic mode or synthesizes a tap/swipe. Browser pinch outside the atlas/fullscreen view remains browser zoom.

Mobile uses its own portrait composition arrays in `atlas.js`.

## Diagram detail mode

Clicking / entering a diagram opens holographic detail inspection.

The HUD title search searches all catalogued diagram titles and opens the selected diagram directly in detail mode.

Required behavior already implemented:

- detail uses a size-appropriate optimized derivative; originals load on fullscreen entry;
- diagram is shown in a large oval inspection chamber;
- title/code/caption remain visible;
- **COPY PERMANENT LINK** copies a stable `?diagram=<category>/<diagram>` URL;
- opening that URL loads the matching diagram directly in detail mode;
- **FULL SCREEN VIEW** button opens the image in a viewport-filling dark overlay;
- fullscreen image uses `object-fit: contain`, never crop; detail retains its 5:4 oval presentation;
- visible **CLOSE ×** control;
- clicking the dark backdrop closes it;
- Escape closes fullscreen;
- Back returns to the category diagram field.

Do not remove the fullscreen inspection control.

## Content and offline build rules

Each category directory under `diagrams/` has required `folder.json` metadata. Category and diagram IDs are stable lowercase slugs, independent of titles, filenames and sort order. Builds discover unlisted images and append entries with filename-derived titles and blank captions. Unnumbered diagram filenames receive the next unused prefix above the category maximum (`01_`, `02_`, …, `100_`); existing prefixes, authored fields, IDs and array order remain unchanged. See `docs/IMAGE_WORKFLOW.md` for the exact schema and contribution steps.

`npm run build:atlas` synchronizes/validates sources and writes `atlas.json` plus `assets/diagrams/` derivatives and manifest. These outputs are versioned. Source/output hashes let unchanged derivatives be reused; missing, corrupt or stale variants regenerate. `npm run build` additionally assembles ignored `_site/`. The catalog exposes original, micro, thumb, medium and large URLs; all must be relative to support GitHub Pages project paths. Covers are explicit and deterministic.

| preset | max dimension | usage |
|---|---:|---|
| micro | 320 px | tiny historical/context nodes |
| thumb | 640 px | previous generation / small nodes |
| medium | 960 px | high-density nodes |
| large | 1600 px | dominant active oval chambers |
| original | unchanged | fullscreen |

Sharp generates WebP assets before publication, retaining aspect ratio and avoiding enlargement. The published app never computes derivatives. Do not hand-edit generated `atlas.json` or generated WebP files.

## Image loading / performance rules

The JS chooses resolution from rendered node size. Keep that behavior.

- nodes -> smallest sufficient derivative based on rendered pixels, source aspect ratio and DPR (capped at 2);
- smaller previous generation -> `thumb`;
- tiny historical nodes -> `micro`;
- detail -> size-appropriate derivative, capped at large; fullscreen -> original.

Future/invisible nodes should not load unnecessarily.

During semantic scroll, animate geometry primarily through position, size/scale, and opacity. Avoid expensive continuously changing blur/filter effects.

Keep holographic vignette, tint, scan texture and HUD overlays mostly static CSS/SVG layers.

## Build and workflow constraints

Validate metadata and local image references; reject duplicate IDs/prefixes, unsafe paths, unsupported images and symlinks. Publish only the explicit `_site/` allowlist, never backups, source metadata, derivative manifest or tooling. PRs run tests/build with read-only permissions. The main build job has contents-write permission to commit/push only diagrams/, assets/diagrams/ and atlas.json in `5vbk976d7v-source/adventures-of-the-monad` and temporarily in `jder7/aom-atlas` during QA; normal pushes fail safely if main advances. `jder7/aom-atlas` lists generated changes before committing. Versioned `.github/atlas-build.json` maps repository names to `commitGenerated` booleans (both currently true). Set the testing entry to false after QA; no repository settings/admin access is needed. Unlisted repositories cannot commit. While both repositories commit, reconcile their independent histories before pushing to both remotes; never force-push automatically. Pages/OIDC permissions remain isolated to its deploy job. Never use privileged `pull_request_target` to run contributed code.

## Important implementation files

- `index.html`: shell, detail/fullscreen and search markup.
- `assets/js/atlas.js`: semantic state, layout, rendering and controls.
- `assets/js/atlas-catalog.js`: static catalog and permanent links.
- `assets/js/atlas-search.js`: title autocomplete.
- `assets/css/atlas.css`: holographic visual design.
- `scripts/`: source validation and static image/site generation.
- `dev-server.mjs`: static preview server.
- `docs/ATLAS_SPEC.md`: product/source-of-truth specification.
- `docs/IMAGE_WORKFLOW.md`: GitHub/LLM content authoring workflow.
- `docs/DEPLOYMENT.md`: Pages setup and publishing.

## Known tuning areas / next work

Do not jump ahead to new features before testing the current experience with the real sample content.

Priority tuning work:

1. Test v0.4 with the imported categories in Chrome/Safari/Firefox.
2. Tune the holographic image vignette so dense technical diagrams remain readable.
3. Tune brightness/contrast/saturation specifically against the real source artwork.
4. Tune desktop large-node geometry and negative-space placement.
5. Tune phone portrait geometry and ensure large nodes remain readable.
6. Test continuous wheel sensitivity separately on mouse wheel and trackpad.
7. Verify the imported taxonomy and add real diagrams; category count is not fixed.
8. Consider category-specific head perspective / anchor metadata only after the base interaction is stable.
9. Validate the generated site and permanent links under the actual GitHub Pages repository path.

## User feedback that caused the v0.2 revision

These are explicit product decisions and should not regress:

- previous head hologram looked like only a shape -> replace with a finished layered holographic head/brain;
- connector lines meeting in the center were wrong -> each line must use a different head/brain anchor;
- local and production now use the same prebuilt static catalog and image assets;
- depth transitions changed abruptly -> keep continuous depth interpolation;
- remove `未来` -> do not reintroduce it;
- diagram detail needed a fullscreen view and close control -> keep both.

## Development discipline

Before changing interaction mechanics, compare the change against `docs/ATLAS_SPEC.md` and the explicit decisions above.

When changing layout arrays or anchor maps, test both:

- categories mode (front head);
- diagrams mode (profile head);
- desktop width > 760 px;
- mobile width <= 760 px.

When changing catalog/image handling, validate the offline build and both root/subpath static hosting. Do not add frameworks, bundlers, databases or browser/runtime dependencies for convenience. Node/Sharp build tooling is explicitly authorized by the static publishing pivot.

Never commit, push or merge without explicit user confirmation. Show the diff/status first.
