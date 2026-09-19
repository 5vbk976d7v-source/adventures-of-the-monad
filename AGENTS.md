# Consciousness Atlas — Agent Handoff

This file is the working handoff for continuing the Consciousness Atlas in development mode. Read this first, then `docs/ATLAS_SPEC.md` for the full product specification.

## Project intent

Build an independent Scientific / Holographic Atlas for technical diagrams about human consciousness. It lives beside an existing WordPress site and must remain decoupled from WordPress.

Deployment target:

```text
example.com/              existing WordPress site, unchanged
example.com/atlas/        this independent atlas
```

Do **not** turn this into a WordPress plugin, theme feature, database-backed CMS, or framework-heavy app unless the user explicitly changes direction.

## Current version / status

Current implementation: **v0.2**.

The project already contains:

- static `index.html` shell;
- `assets/css/atlas.css` visual system;
- `assets/js/atlas.js` interaction / semantic zoom engine;
- `catalog.php` production read-only catalog scanner;
- `image.php` production lazy WebP derivative generator;
- `dev-server.mjs` dependency-free local Node server and `/catalog.json` provider;
- sample image groups under `images/`;
- security `.htaccess` files;
- full specification in `docs/ATLAS_SPEC.md`;
- deployment notes in `docs/DEPLOYMENT.md`.

Six sample top-level groups are currently present:

1. Trust in Self
2. Will to Sacrifice
3. Faithfulness
4. Uprightness
5. Reticence
6. Impersonality

The production concept expects **16 top-level groups**. The current six are enough to test a single top-level generation and multi-generation diagram behavior inside each group.

## Local development

Requirements: Node.js 18+.

From the project root:

```bash
npm start
```

Open:

```text
http://127.0.0.1:8080
```

Local development intentionally requires no PHP and no npm dependencies.

Catalog lookup order in `atlas.js`:

```text
catalog.php
  -> if unavailable
catalog.json
  -> if unavailable
built-in demo catalog
```

Under Node, `dev-server.mjs` dynamically generates `/catalog.json` by scanning `/images/`.

Important local limitation: Node dev mode currently points `micro`, `thumb`, and `large` to the original image. Production PHP uses optimized WebP derivatives.

## Agreed visual direction

The approved direction is **Scientific / Holographic Atlas**, based on Concept 03 from the design exploration.

Core visual rules:

- dark scientific field;
- a finished holographic **human head / brain**, not a generic placeholder shape;
- head remains SVG for now;
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

If visual tuning changes the head SVG geometry, update those anchor maps as part of the same change.

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

Several sample groups contain 20–30+ images, so this can be tested now.

## Interaction model

### Desktop

- mouse wheel down: zoom outward through semantic depth;
- mouse wheel up: zoom inward;
- hover sets the current semantic target;
- hover a category/diagram + scroll inward: enter that object after an intent threshold;
- click category/diagram: enter directly;
- Arrow Down / Arrow Up: depth navigation;
- Escape / Backspace: back one semantic level.

Important: wheel depth is **continuous**. `targetDepth` is a float and `depth` eases toward it with `requestAnimationFrame`. Do not revert to integer-only stage snapping for desktop wheel behavior.

Relevant constants in `atlas.js`:

```js
const CHUNK = 6;
const WHEEL_SENSITIVITY = 0.0025;
const ENTER_SCROLL_THRESHOLD = 88;
```

Tune these only after testing both a normal mouse wheel and a high-resolution trackpad.

### Mobile / touch

- vertical swipe up: next outward semantic generation;
- vertical swipe down: previous inward generation;
- first tap on node: select / highlight;
- second tap on selected node: enter;
- back control: one semantic level outward;
- do not make pinch-to-zoom primary because it conflicts with browser/accessibility zoom.

Mobile uses its own portrait composition arrays in `atlas.js`.

## Diagram detail mode

Clicking / entering a diagram opens holographic detail inspection.

Required behavior already implemented:

- original/high-resolution image is used for detail;
- diagram is shown in a large oval inspection chamber;
- title/code/caption remain visible;
- **FULL SCREEN VIEW** button opens the image in a viewport-filling dark overlay;
- image uses `object-fit: contain`, never crop;
- visible **CLOSE ×** control;
- clicking the dark backdrop closes it;
- Escape closes fullscreen;
- Back returns to the category diagram field.

Do not remove the fullscreen inspection control.

## Content / category cover rules

Each directory under `/images/` is one top-level category.

Optional `folder.json`:

```json
{
  "title": "Mental Consciousness",
  "order": 3,
  "cover": "04-mental-structure.png",
  "description": "Optional short description."
}
```

Cover selection priority must remain deterministic:

1. `folder.json` `cover`;
2. `00-cover.png|jpg|jpeg|webp`;
3. first naturally sorted image.

Never randomly select a category cover.

## Catalog architecture

### Production

`catalog.php` is intentionally narrow and read-only.

Requirements:

- no request parameters;
- hard-coded `/images/` root;
- ignore hidden files and symlinks;
- allowlist supported image extensions;
- no absolute filesystem paths in JSON;
- metadata read only with JSON parsing;
- no writes.

### Local Node fallback

`dev-server.mjs` must continue to provide `/catalog.json` so the project can be tested locally without PHP.

Do not replace this with a manually maintained `catalog.json`; the Node route should dynamically scan the same `/images/` structure used by PHP.

## Image derivative strategy

Original images can be PNG/WebP/JPEG around 2–4 MB and must not all be loaded into the atlas at full resolution.

Production derivative presets:

| preset | max dimension | usage |
|---|---:|---|
| `micro` | 320 px | tiny historical/context nodes |
| `thumb` | 640 px | previous generation / small nodes |
| `large` | 1600 px | dominant active oval chambers |
| original | unchanged | detail + fullscreen |

`image.php` lazily creates WebP derivatives under `/cache/` only when requested. Cached files should then be served statically by Apache on subsequent requests.

Do not allow arbitrary image dimensions via query parameters. Only named presets are allowed.

Source file modification time invalidates an older cached derivative.

## Image loading / performance rules

The JS chooses resolution from rendered node size. Keep that behavior.

- dominant nodes -> `large`;
- smaller previous generation -> `thumb`;
- tiny historical nodes -> `micro`;
- detail/fullscreen -> original.

Future/invisible nodes should not load unnecessarily.

During semantic scroll, animate geometry primarily through position, size/scale, and opacity. Avoid expensive continuously changing blur/filter effects.

Keep holographic vignette, tint, scan texture and HUD overlays mostly static CSS/SVG layers.

## Security constraints

The security model is intentionally simple and should not be broadened casually.

`image.php`:

- local source files only;
- source must resolve beneath `/images/`;
- no remote URL support;
- allowlisted extensions only;
- named presets only;
- pixel-count limit;
- file locking around derivative creation;
- output only beneath `/cache/`.

`/images/` and `/cache/`:

- directory listing disabled;
- executable script extensions denied;
- no PHP upload endpoint exists; content is added through file manager/SFTP.

## Important implementation files

```text
index.html
  visual shell, head SVGs, detail/fullscreen markup

assets/js/atlas.js
  catalog loading
  layout arrays
  semantic depth interpolation
  desktop/touch controls
  image resolution selection
  connector drawing
  category/diagram/detail state

assets/css/atlas.css
  holographic visual language
  oval chambers
  image vignette / scan texture
  head styling
  detail and fullscreen styling

catalog.php
  production catalog discovery

image.php
  lazy derivative generation

dev-server.mjs
  local static server + dynamic catalog.json provider

docs/ATLAS_SPEC.md
  product/source-of-truth specification

docs/DEPLOYMENT.md
  deployment notes
```

## Known tuning areas / next work

Do not jump ahead to new features before testing the current experience with the real sample content.

Priority tuning work:

1. Test v0.2 with the supplied real sample groups in Chrome/Safari/Firefox.
2. Tune the holographic image vignette so dense technical diagrams remain readable.
3. Tune brightness/contrast/saturation specifically against the real source artwork.
4. Tune desktop large-node geometry and negative-space placement.
5. Tune phone portrait geometry and ensure large nodes remain readable.
6. Test continuous wheel sensitivity separately on mouse wheel and trackpad.
7. Add the remaining ten category folders and validate the complete top-level `6 -> 6 -> 4` sequence.
8. Consider category-specific head perspective / anchor metadata only after the base interaction is stable.
9. Validate production derivative generation on a host with Imagick or GD/WebP; the current execution environment used during creation did not have that PHP image stack available.

## User feedback that caused the v0.2 revision

These are explicit product decisions and should not regress:

- previous head hologram looked like only a shape -> replace with a finished layered holographic head/brain;
- connector lines meeting in the center were wrong -> each line must use a different head/brain anchor;
- local testing needed a JS/Node alternative to PHP catalog -> keep dynamic Node `/catalog.json` provider;
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

When changing catalog/image handling, preserve both modes:

- local Node development without PHP;
- production Apache/PHP with cached derivatives.

Do not introduce a framework, bundler, database, WordPress dependency, or npm runtime dependency just for convenience. The current portability and low-maintenance deployment model are intentional constraints.

If a requested change appears to require any prohibited dependency, stop and ask the user to explicitly confirm a direction change before proceeding.
