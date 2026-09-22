# Consciousness Atlas — Product & Interaction Specification

Version: 0.5 — external media delivery

Status: active implementation

## 1. Purpose

The atlas is an independent immersive visual application for presenting technical diagrams about human consciousness. It runs as a static GitHub Pages site, independent of the existing WordPress website.

The primary metaphor is **semantic depth**: visitors do not browse conventional pages or grids; they move into and out of a holographic map of consciousness.

The visual reference is the agreed **Scientific / Holographic Atlas — Concept 03**: dark scientific field, a designed holographic human head/brain, large asymmetric oval image chambers, distinct anatomical connection points, restrained HUD labels, cyan/white/violet light, and generous negative space.

The project must not use Japanese decorative characters or unrelated sci-fi inscriptions.

## 2. Deployment architecture

The UI is a static GitHub Pages site. It loads its catalog from a read-only PHP endpoint hosted separately at `https://adventuresofthemonad.com/atlas-media/catalog.php`; image variants are returned by the companion `image.php` endpoint. The service scans uploaded files and generates derivatives on first request. WordPress is neither modified nor required.

```text
main branch              UI, artwork and public endpoint configuration
media branch             PHP catalog/image service and deployment guide
Hostinger atlas-media/   diagrams, private ID/catalog state and WebP cache
diagrams/<category>/     retained migration source on main until cutover
_site/                   small UI-only GitHub Pages artifact
```

The Pages artifact contains no source diagrams or generated image derivatives. Node.js is used for the UI build and a local development server; the Node server dynamically scans local `diagrams/` to provide the PHP service's catalog equivalent and serves originals without resizing. Production uses the PHP service. Only `_site/` is published to Pages.

The pre-pivot specification and backend are preserved in `backups/pre-github-pages-2026-09-20.tar.gz`.

## 3. Content model

`docs/Knowledge Atlas Folder Structure.pages` supplies the category taxonomy. During migration source folders remain under `diagrams/`; after cutover Hostinger is the live image source. Existing `folder.json` files preserve titles, captions, IDs, order and cover choices. They do not need to list every uploaded file. See [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md) for the upload workflow.

Each category and diagram has a stable ID. Titles, order and filenames can change without changing an existing ID. Permanent links use IDs, never array positions. The scanner discovers new files and stores their assigned IDs in a private registry. Existing listed image order remains first; new files follow in natural filename order. Numeric prefixes affect order but are optional and do not define IDs. A missing preferred cover falls back to `00-cover.*`, then the first available image.

The browser consumes a version 1 catalog with ordered categories and `original`, `micro`, `thumb`, `medium` and `large` URLs. Production URLs are absolute HTTPS links to `image.php`; local Node-development URLs point to local originals for every size. The production catalog is cached briefly and generated from current folder contents; it is not hand-edited. The number of categories is data-driven; the six-at-a-time depth model also supports final groups smaller than six.

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

- the a size-appropriate optimized derivative is loaded;
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

Production derivatives are generated lazily by Hostinger on first request and cached:

| derivative | max dimension | purpose | target scale |
|---|---:|---|---|
| micro | 320 px | tiny historic/context nodes | ~20–60 KB typical |
| thumb | 640 px | small prior-generation nodes | ~40–150 KB typical |
| medium | 960 px | high-density nodes | content-dependent |
| large | 1600 px | active large oval chambers | ~150–450 KB typical |
| original | unchanged | full-screen inspection | source size |

The JavaScript swaps image resolution according to the current displayed node size. Future/hidden nodes do not load image data until they approach visibility.

## 12. On-demand image delivery

`image.php` generates only the requested fixed preset (320/640/960/1600 px), preserves aspect ratio/orientation and never enlarges small sources. It caches WebP derivatives under a source-versioned key, serializes concurrent generation and writes atomically. Originals remain unchanged for detail/fullscreen. The browser chooses the URL for the rendered node size and does not load future/invisible node images unnecessarily.

## 13. Catalog and local preview

`assets/js/atlas-catalog.js` reads the endpoint map in `assets/config/media-endpoints.json` and validates the returned catalog. Local preview uses `/catalog.json` from the Node scanner; testing and production use the configured Hostinger URL. Missing or invalid catalog data must be visible as an error.

```bash
npm ci
npm run build
npm start
# http://127.0.0.1:8080
```

After changing local originals or metadata, reload preview to rescan. Local and hosted image URLs must work under a repository path as well as at the domain root.

## 14. Validation and publishing

- Parse category metadata as JSON, never executable code.
- Accept supported local image formats only; reject unsafe paths and symlinks.
- Limit decoded source dimensions and use only the fixed derivative presets.
- Include only public site assets in the deployment artifact.
- Pull requests run validation/build with a read-only repository token; they cannot deploy.
- Main-branch publishing uses the GitHub Pages artifact/deployment actions. Only the deployment job receives Pages/OIDC write permissions.
- GitHub Actions builds and deploys only the static UI. It has no permission to write generated image or catalog content.
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

The UI build now produces a small Pages artifact and fetches the live catalog and images from the separate Hostinger service. Local Node development dynamically scans retained repository diagrams so behavior can be checked before Hostinger cutover.
