# Consciousness Atlas — Product & Interaction Specification

Version: 0.4 — static publishing

Status: active implementation

## 1. Purpose

The atlas is an independent immersive visual application for presenting technical diagrams about human consciousness. It runs as a static GitHub Pages site, independent of the existing WordPress website.

The primary metaphor is **semantic depth**: visitors do not browse conventional pages or grids; they move into and out of a holographic map of consciousness.

The visual reference is the agreed **Scientific / Holographic Atlas — Concept 03**: dark scientific field, a designed holographic human head/brain, large asymmetric oval image chambers, distinct anatomical connection points, restrained HUD labels, cyan/white/violet light, and generous negative space.

The project must not use Japanese decorative characters or unrelated sci-fi inscriptions.

## 2. Deployment architecture

The browser loads static HTML, CSS, JavaScript, artwork and `atlas.json`. No request computes an image or lists a directory. GitHub Pages project paths and custom-domain roots are both supported through relative asset URLs.

```text
diagrams/<category>/     original images and folder.json source metadata
scripts/                 validation and offline image/catalog build
assets/                  browser code and holographic artwork
_site/                   generated deployment artifact
  index.html
  atlas.json
  assets/
  diagrams/
```

Node.js and Sharp are build tools only. The published site has no server runtime, database, PHP, Apache configuration or WordPress dependency. The local static server serves the same generated artifact used in production. Only `_site/` is uploaded; source documentation, backup archives and tooling are excluded.

The pre-pivot specification and backend are preserved in `backups/pre-github-pages-2026-09-20.tar.gz`.

## 3. Content model

`docs/Knowledge Atlas Folder Structure.pages` supplies the category taxonomy. Source category directories live under `diagrams/`; category metadata and explicitly listed diagrams live in each `folder.json`. See [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) for the authoring schema and agent workflow.

Each category and diagram has an explicit stable ID. Titles, order and filenames can change without changing the ID. Permanent links use these IDs, never an array position. Source diagram filenames begin with a two-digit sequence prefix matching their metadata array position (`01_`, `02_`, …); the prefix organizes files and is not part of the stable ID. Covers are selected explicitly in metadata and must reference a real local source image. A cover may also be the category's example diagram.

The generated `atlas.json` is the browser's sole catalog. It contains the complete ordered category/diagram list and relative URLs for original, micro, thumb and large assets. Regenerate it from source metadata rather than editing generated JSON. The number of categories is data-driven; the six-at-a-time depth model also supports final groups smaller than six.

## 4. Main atlas composition

The holographic human head is the gravitational centre but the composition is deliberately **asymmetric**, not a rigid radial menu.

Image chambers:

- are rounded/elliptical holographic lenses, not rectangular cards;
- contain actual category/diagram images;
- have deliberately different sizes within the active set;
- dissolve toward their edges through an image vignette;
- retain fine HUD framing and restrained scan texture;
- prioritize diagram readability over decorative UI.

The active six nodes have different visual weights and proportions, following Concept 03 rather than an equal-size orbital system.

## 5. Holographic human head / brain

The head is a finished visual component, not a placeholder silhouette.

It must contain multiple technical layers:

- outer head/skull contour;
- face/profile contour;
- brain boundary;
- internal lobe/hemisphere paths;
- neural/circuit lines;
- luminous node points;
- scanning/measurement marks;
- faint holographic halos;
- front and profile perspectives.

Following the September 2026 design review, the head uses three supplied raster artworks: front, three-quarter and profile. These replace the rejected procedural SVG heads. `assets/artwork/manifest.json` identifies the masters; CSS blends their dark backgrounds into the field and aligns their framing.

Entering a category plays an 820 ms front → three-quarter → profile crossfade, reversed on return. Both turned views mirror together for alternating categories. Connectors resume when the pose settles. A small desktop pointer parallax moves the head and its connection endpoints together. Reduced motion uses a direct pose change and disables parallax. Diagram detail hides the head entirely. This is a transition between matched stills, not free 3D rotation.

### Connection behaviour

Image chambers do **not** connect to the centre of the head.

Each chamber maps to a different anatomical/visual anchor point distributed across the brain/head. Curved connector paths end on these separate anchors and show a subtle illuminated endpoint.

Front and profile head perspectives use different anchor maps.

## 6. Top-level category semantic zoom

Categories are revealed six at a time; transitions between stages are continuous. The examples below illustrate a 16-category catalog, not a fixed category limit.

### Depth 1

- central holographic head;
- categories 01–06 appear as six large asymmetric image chambers.

### Depth 1 → 2

As the visitor scrolls outward:

- categories 01–06 continuously move and shrink into the negative spaces between the incoming nodes;
- categories 07–12 continuously emerge and expand into the six dominant chambers;
- opacity, position, width and height interpolate continuously with scroll progress.

There is no abrupt scene replacement.

### Depth 2 → 3

- categories 13–16 emerge as dominant chambers;
- categories 07–12 shrink to the immediately previous/small state;
- categories 01–06 shrink further into tiny contextual traces;
- previous nodes remain interwoven between the new images rather than forming separate rings.

The result must read as **one evolving spatial field**.

## 7. Entering a category

Clicking/entering a category changes to another perspective of the holographic head, currently the designed profile view. Left/right orientation may alternate by category.

The selected category's diagrams use the same semantic-depth system:

1. first six diagrams are large asymmetric oval chambers;
2. scrolling outward smoothly reveals the next six;
3. the immediately previous six become small interstitial nodes;
4. older diagrams become tiny contextual nodes;
5. this continues for folders containing more than 16 diagrams.

## 8. Desktop controls

### Wheel / semantic depth

- wheel down always advances to the next outward semantic generation and stops at the final generation; it never exits the current semantic mode;
- wheel delta maps to a continuous depth value rather than an integer state;
- movement is eased toward the requested depth for a smooth trackpad/mouse experience;
- wheel up while the cursor is over a category/diagram accumulates intent to enter that object after the configured threshold;
- wheel up over empty space or the head decreases continuous semantic depth;
- at settled diagram depth 1, additional wheel-up intent returns to the category field after the configured back threshold;
- arriving at depth 1 resets intent, so the arrival movement is not counted toward the back threshold;
- intent resets when direction, target, or semantic state changes, and after the idle timeout;
- detail mode is exited by explicit Back/Escape or its fullscreen/detail controls; wheel never auto-exits detail.

### Pointer

- hover establishes the current zoom-in target and highlights it;
- click directly enters a category or diagram;
- no separate zoom buttons are required.

### Keyboard

- Arrow Down / Arrow Up move between depth stages;
- two subtle graded meter rails at the stage edges mirror semantic depth and support click or drag input, with a small visual overshoot beyond both limits;
- Escape / Backspace explicitly returns one semantic level.

## 9. Mobile controls

Mobile preserves the same conceptual model but does not depend on hover.

- vertical swipe upward = smoothly advance outward to the next depth stage;
- vertical swipe downward = smoothly return inward;
- a deliberate downward swipe starting at settled diagram depth 1 returns to the category field;
- two-finger pinch with fingers moving together increases depth and fingers spreading decreases depth;
- pinch never switches semantic mode and never synthesizes a tap or swipe;
- first tap = select/highlight a node;
- second tap on the selected node = enter it;
- back control = explicit one semantic level outward (detail → category → complete atlas);
- browser pinch outside the atlas/fullscreen view remains browser zoom, and Ctrl-wheel remains available for browser zoom.

Mobile uses a portrait-specific asymmetric layout. Previous nodes continue to occupy spaces between the current dominant chambers.

## 10. Diagram detail and full-screen view

Entering a diagram opens a dedicated holographic inspection state.

At this level:

- the original/high-resolution image is loaded;
- the diagram is shown in an oval inspection chamber;
- title/code/caption remain visible;
- a **COPY PERMANENT LINK** button copies a stable `?diagram=<category>/<diagram>` URL;
- loading that URL after deployment opens the matching diagram directly in detail mode;
- a **FULL SCREEN VIEW** button opens the original diagram in a viewport-filling dark overlay;
- the full-screen view uses `object-fit: contain` and does not crop the diagram;
- a clearly visible **CLOSE ×** button exits full-screen view;
- clicking the dark backdrop or pressing Escape also closes it.

The HUD also provides a title search across all catalogued diagrams. Matching titles appear in an autocomplete list; selecting one opens its category context and detail view directly.

## 11. Image performance strategy

Original diagrams may be PNG/WebP/JPEG files around 2–4 MB. Originals are retained as masters but are not used for ordinary production atlas nodes.

Each source image receives WebP derivatives during the offline build, before publication:

| derivative | max dimension | purpose | target scale |
|---|---:|---|---|
| micro | 320 px | tiny historic/context nodes | ~20–60 KB typical |
| thumb | 640 px | small prior-generation nodes | ~40–150 KB typical |
| large | 1600 px | active large oval chambers | ~150–450 KB typical |
| original | unchanged | final diagram inspection/full-screen | source size |

The JavaScript swaps image resolution according to the current displayed node size. Future/hidden nodes do not load image data until they approach visibility.

## 12. Offline derivative generation

`npm run build` validates source metadata and images, generates the three fixed WebP sizes with Sharp and assembles `_site/`, including originals for detail/fullscreen. Resizing preserves image proportions and does not enlarge small sources. Rebuilding regenerates the catalog and assets from current inputs; requests never mutate the site.

## 13. Catalog and local preview

`assets/js/atlas-catalog.js` fetches relative `atlas.json`. Missing or invalid catalog data must be visible as an error; no demo catalog should conceal a publishing failure.

```bash
npm ci
npm run build
npm start
# http://127.0.0.1:8080
```

After changing originals or metadata, rebuild before previewing. Source content and generated URLs must work under a repository path as well as at the domain root.

## 14. Validation and publishing

- Parse source metadata as JSON, never executable code.
- Accept supported local image formats only; reject unsafe paths, symlinks, duplicate IDs and missing image references.
- Limit decoded source dimensions and use only the fixed derivative presets.
- Include only public site assets in the deployment artifact.
- Pull requests run validation/build with a read-only repository token; they cannot deploy.
- Main-branch publishing uses the GitHub Pages artifact/deployment actions. Only the deployment job receives Pages/OIDC write permissions.
- Never run pull-request code using privileged `pull_request_target` workflows.

See [DEPLOYMENT.md](DEPLOYMENT.md) for repository setup and [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) for content changes.

## 15. Animation/performance constraints

Semantic zoom is driven by a continuous numeric depth value.

Node properties interpolated with depth:

- x/y position;
- width/height;
- opacity;
- label visibility.

Images themselves are not continuously blurred or reprocessed during scroll. Holographic tint, vignette and scan texture remain mostly static CSS/SVG layers.

Connections are redrawn against stored node geometry and distinct head anchor points while the semantic zoom is moving.

`prefers-reduced-motion` is respected.

## 16. Current implementation status — v0.4

The app retains continuous semantic depth, asymmetric oval chambers, supplied holographic artwork and head transitions, distinct connection anchors, pointer/touch controls, title autocomplete, permanent detail links, fullscreen inspection and the two graded depth meters.

Publishing now builds static assets and `atlas.json` ahead of time for GitHub Pages. The old dynamic backend and sample taxonomy are retired; the Pages document defines the replacement source categories.

## 17. Next steps

1. Review the imported taxonomy and example-image assignments.
2. Add real diagrams through reviewed content pull requests.
3. Evaluate diagram readability, depth transitions and controls on desktop and mobile.
4. Configure GitHub Pages and verify deployed links under the actual repository path.
