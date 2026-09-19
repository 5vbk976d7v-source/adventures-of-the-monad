# Consciousness Atlas — Product & Interaction Specification

Version: 0.2  
Status: active implementation

## 1. Purpose

The atlas is an independent immersive visual application for presenting technical diagrams about human consciousness. It lives beside the existing WordPress website rather than inside WordPress.

The primary metaphor is **semantic depth**: visitors do not browse conventional pages or grids; they move into and out of a holographic map of consciousness.

The visual reference is the agreed **Scientific / Holographic Atlas — Concept 03**: dark scientific field, a designed holographic human head/brain, large asymmetric oval image chambers, distinct anatomical connection points, restrained HUD labels, cyan/white/violet light, and generous negative space.

The project must not use Japanese decorative characters or unrelated sci-fi inscriptions.

## 2. Deployment architecture

```text
example.com/              WordPress (unchanged)
example.com/atlas/        independent static/PHP atlas
```

The atlas has no WordPress API, plugin, database, theme, or build dependency.

```text
/atlas/
  index.html
  catalog.php
  image.php
  dev-server.mjs
  package.json
  .htaccess
  assets/
    css/atlas.css
    js/atlas.js
    svg/
  images/
    01-category-name/
    ...
    16-category-name/
  cache/
    micro/
    thumb/
    large/
  docs/
```

The entire `/atlas/` directory is portable to another normal PHP/Apache host.

## 3. Content model

The production atlas contains **16 top-level consciousness groups**.

Recommended folder naming:

```text
01-physical-consciousness/
02-emotional-consciousness/
...
16-.../
```

Each folder contains the original diagrams. Numeric filename prefixes may determine diagram order:

```text
001-introduction.png
002-mental-consciousness.png
003-self-consciousness.png
```

Each folder may contain an optional `folder.json`:

```json
{
  "title": "Emotional Consciousness",
  "order": 4,
  "cover": "001-emotional-consciousness.png",
  "description": "Optional short description."
}
```

Category cover selection priority:

1. explicit `cover` in `folder.json`;
2. `00-cover.png|jpg|jpeg|webp`;
3. first naturally sorted image.

No random cover selection is allowed.

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

The head remains SVG in the current architecture so it is resolution-independent and inexpensive to animate. A 3D replacement may be introduced later without changing the atlas data model.

### Connection behaviour

Image chambers do **not** connect to the centre of the head.

Each chamber maps to a different anatomical/visual anchor point distributed across the brain/head. Curved connector paths end on these separate anchors and show a subtle illuminated endpoint.

Front and profile head perspectives use different anchor maps.

## 6. Top-level category semantic zoom

The 16 categories are revealed in three depth stages, but transition between those stages is continuous.

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

- wheel down = continuous zoom outward;
- wheel delta maps to a continuous depth value rather than an integer state;
- movement is eased toward the requested depth for a smooth trackpad/mouse experience;
- wheel up with no target = continuous zoom inward;
- wheel up while the cursor is over a category/diagram = semantic zoom **into that object** after a short intent threshold.

### Pointer

- hover establishes the current zoom-in target and highlights it;
- click directly enters a category or diagram;
- no separate zoom buttons are required.

### Keyboard

- Arrow Down / Arrow Up move between depth stages;
- Escape / Backspace returns one semantic level.

## 9. Mobile controls

Mobile preserves the same conceptual model but does not depend on hover.

- vertical swipe upward = smoothly advance outward to the next depth stage;
- vertical swipe downward = smoothly return inward;
- first tap = select/highlight a node;
- second tap on the selected node = enter it;
- back control = one semantic level outward (detail → category → complete atlas);
- pinch-to-zoom is not a primary control because it conflicts with browser/accessibility zoom.

Mobile uses a portrait-specific asymmetric layout. Previous nodes continue to occupy spaces between the current dominant chambers.

## 10. Diagram detail and full-screen view

Entering a diagram opens a dedicated holographic inspection state.

At this level:

- the original/high-resolution image is loaded;
- the diagram is shown in an oval inspection chamber;
- title/code/caption remain visible;
- a **FULL SCREEN VIEW** button opens the original diagram in a viewport-filling dark overlay;
- the full-screen view uses `object-fit: contain` and does not crop the diagram;
- a clearly visible **CLOSE ×** button exits full-screen view;
- clicking the dark backdrop or pressing Escape also closes it.

## 11. Image performance strategy

Original diagrams may be PNG/WebP/JPEG files around 2–4 MB. Originals are retained as masters but are not used for ordinary production atlas nodes.

Each source image receives lazily generated WebP derivatives:

| derivative | max dimension | purpose | target scale |
|---|---:|---|---|
| micro | 320 px | tiny historic/context nodes | ~20–60 KB typical |
| thumb | 640 px | small prior-generation nodes | ~40–150 KB typical |
| large | 1600 px | active large oval chambers | ~150–450 KB typical |
| original | unchanged | final diagram inspection/full-screen | source size |

The JavaScript swaps image resolution according to the current displayed node size. Future/hidden nodes do not load image data until they approach visibility.

## 12. Automatic derivative generation

`image.php` handles lazy derivative generation outside WordPress.

```text
Browser requests /cache/large/04/001-map.png.webp
             ↓
file already exists? ── yes → Apache serves static WebP
             │
             no
             ↓
.htaccess routes request to image.php
             ↓
validate source + preset
             ↓
generate WebP once
             ↓
save in /cache/
             ↓
subsequent requests bypass PHP
```

A newer source file invalidates the old derivative based on modification time and causes regeneration.

Preferred server library: Imagick. GD + WebP is supported as fallback.

## 13. Catalog providers

### Production PHP provider

`catalog.php` is a parameterless, read-only scanner.

It:

- scans only `/images/`;
- discovers category folders automatically;
- sorts folders/images naturally;
- reads optional `folder.json`;
- applies deterministic cover selection;
- returns original + micro + thumb + large URLs;
- returns source dimensions where available;
- never writes files;
- accepts no filesystem path from the client.

### Local Node.js provider

Local development must not require PHP.

`dev-server.mjs`:

- serves the static atlas using built-in Node.js modules only;
- exposes `/catalog.json` by scanning the same `/images/` structure;
- returns the original image URL for all resolution fields in development mode;
- has no package dependencies.

`atlas.js` loads providers in this order:

```text
catalog.php
   ↓ if unavailable
catalog.json
   ↓ if unavailable
built-in placeholder/demo catalog
```

Local launch:

```bash
npm start
# http://127.0.0.1:8080
```

## 14. Security requirements

### Catalog

- no request parameters;
- fixed filesystem root;
- ignore hidden files and symlinks;
- allowlist image extensions only;
- never expose absolute server paths;
- parse metadata as JSON only; never include/execute metadata files.

### Image derivative service

- only named presets (`micro`, `thumb`, `large`);
- no arbitrary dimensions;
- only local files resolving beneath `/images/`;
- no remote URLs;
- allowlist image formats;
- pixel-count limit;
- file locking prevents duplicate simultaneous regeneration;
- generated content only beneath `/cache/`;
- executable file types denied in `/images/` and `/cache/`;
- directory indexes disabled.

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

## 16. Current implementation status — v0.2

Implemented:

- independent static/PHP atlas;
- six-at-a-time semantic-depth model;
- continuous smooth interpolation between depth stages;
- asymmetric oval chambers with variable sizes;
- interstitial small/tiny historical nodes;
- designed front/profile holographic head/brain SVGs;
- distinct connection anchors across the hologram;
- desktop hover/click + wheel semantic zoom;
- mobile tap/tap-again + vertical swipe;
- diagram detail mode;
- viewport-filling diagram view with close control;
- PHP catalog provider;
- Node.js local catalog fallback/server;
- lazy WebP derivative architecture;
- secured read-only catalog/image pipeline;
- six supplied sample groups integrated for development.

## 17. Next steps

1. Evaluate the v0.2 behaviour with the real sample images in a browser.
2. Tune vignette strength and image brightness against the supplied symbol/diagram artwork.
3. Tune the six large-node layouts at desktop and phone breakpoints.
4. Add the remaining ten top-level category folders to validate the complete 6 → 6 → 4 top-level sequence.
5. Tune wheel sensitivity separately for mouse wheels and high-resolution trackpads if necessary.
6. Decide whether each category should eventually define its own head perspective/anchor map in metadata.
