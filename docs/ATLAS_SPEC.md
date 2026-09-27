# Atlas product notes

## Purpose and visual direction

The Atlas is a static, independent viewer for consciousness diagrams. Its visual reference is Concept 03: a dark scientific field, supplied holographic head artwork, asymmetric oval image chambers, restrained cyan/white/violet light, and readable source diagrams. Keep the composition spacious and avoid decorative text or regular card grids.

The head uses front, three-quarter, and profile artwork from `assets/artwork/manifest.json`. Category nodes connect to separate visual anchors. Entering a category transitions the head to profile; detail view hides it. The three head images are matched stills, not a 3D model.

## Navigation

Categories and diagrams share continuous semantic zoom, with six dominant items per generation. Wheel/trackpad moves through depth; click enters a node; keyboard arrows change depth; Escape/Backspace returns one level. Mobile supports vertical swipes, two-finger pinch for depth, and two taps to enter a selected item. At settled diagram depth one, additional wheel-up intent returns to categories. Tuning values are grouped as `ATLAS_TUNING` near the top of `assets/js/atlas.js`.

The title search opens a selected diagram directly. Detail view shows an optimized image and offers a permanent `?diagram=<category-id>/<diagram-id>` link. Fullscreen and double-click show the original image without cropping.

## Content and delivery

The browser reads the version 1 catalog from Hostinger. Category and diagram IDs are stable and do not depend on list position. `folder.json` supplies optional authored titles, order, captions and cover selection. New files are discovered automatically; see [Image workflow](IMAGE_WORKFLOW.md).

The `main` branch contains the UI and builds only the static `_site/` artifact. The separate `media` branch contains the PHP catalog/image service. Originals and generated image cache live on Hostinger. See [Deployment and local testing](DEPLOYMENT.md).

Keep image work lightweight during navigation: choose a size-appropriate derivative, avoid continuous expensive filters, and honor reduced-motion preferences. Preserve working local Node preview and production Hostinger loading.
