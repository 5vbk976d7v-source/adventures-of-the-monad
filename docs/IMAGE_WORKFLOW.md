# Adding diagrams through GitHub and LLM agents

Author originals and metadata in GitHub; produce optimized images before publication. The browser reads `atlas.json`, never a directory listing.

## Source format

Each category under `diagrams/` contains PNG, JPEG or WebP originals and required `folder.json`:

```json
{
  "id": "mental-consciousness",
  "title": "Mental Consciousness",
  "order": 3,
  "description": "Optional category description.",
  "cover": "01_mental-structure.png",
  "images": [
    {
      "id": "mental-structure",
      "title": "Mental Structure",
      "file": "01_mental-structure.png",
      "caption": "Optional description."
    }
  ]
}
```

IDs are explicit lowercase slugs. Category IDs are unique across the atlas; diagram IDs are unique within their category. Never regenerate an ID after reordering or changing a title. Image array order determines diagram order; category `order` controls category order. Every source image filename must begin with its two-digit array position: `01_`, `02_`, `03_`, and so on. The prefix is organizational and does not form part of the stable ID.

References must be simple filenames in the same category folder: no remote URLs, absolute paths, traversal or symlinks. The cover must exist and may reuse a listed diagram. Originals retain their source bytes for detail/fullscreen. The build generates micro (320 px), thumb (640 px) and large (1600 px) WebP variants, preserving proportions without upscaling.

## Content contribution

1. Inspect the category's existing numbered files and choose the next two-digit prefix (`02_` after `01_`, `03_` after `02_`). Add the original to the appropriate category folder as `<prefix>_<descriptive-name>.<ext>`; never reuse a prefix.
2. Add the matching entry to `folder.json` at the end of `images`, using the same numbered filename for `file`. Keep the stable lowercase diagram ID independent of the filename. Inspect the image to suggest wording; flag uncertain content rather than inventing it. Set an explicit cover for a new category.
3. Run `npm ci`, `npm test` and `npm run build`.
4. Preview using `npm start`. Check the category cover, search, detail, fullscreen, copied permanent link and thumbnail legibility.
5. Submit the original, metadata and regenerated `atlas.json` for review. Generated derivatives and `_site/` are ignored build outputs. Describe IDs, validation and any uncertainty in the PR.
6. After review and merge to `main`, Actions rebuilds and publishes the Pages artifact. PR checks validate the same build without deploying.

An LLM agent can perform steps 1–4 from a supplied image/category instruction. Commits, PR creation, merging and publishing follow repository/user authorization. No LLM API key is required by the build; processing is deterministic Node/Sharp tooling.

## Reusable agent task

> Add the attached diagram to category `<category-id>`. Inspect the existing numbered files, assign the next unused two-digit filename prefix, and add the original plus matching folder.json entry. Keep stable IDs independent of filenames. Propose an accurate title/caption, run tests and the static build, then verify search, detail, fullscreen and the permanent link. Report changed files, assigned prefix, link and uncertainty. Do not commit or publish without authorization.

## Outputs and replacements

`npm run build:atlas` writes `atlas.json` and `assets/diagrams/<category-id>/<diagram-id>-{micro,thumb,large}.webp`. `npm run build` additionally assembles public files/originals in `_site/`. Never edit generated output manually. Replacing a source while retaining its ID preserves its permanent link; rebuild all variants.

The initial 16 categories follow `docs/Knowledge Atlas Folder Structure.pages`. Starter artwork is bootstrap content; consult [CONTENT_IMPORT.md](CONTENT_IMPORT.md) for the mapping before treating examples as authoritative category-specific diagrams.
