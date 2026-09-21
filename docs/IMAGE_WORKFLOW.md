# Adding diagrams through GitHub and LLM agents

Upload originals to an existing category in GitHub. The build discovers them, updates metadata, adds missing number prefixes and generates optimized assets before publication. Originals, `folder.json`, `atlas.json`, and `assets/diagrams/` are versioned together. The browser reads `atlas.json`, never a directory listing.

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

IDs are stable lowercase slugs. Category IDs are unique across the atlas; diagram IDs are unique within their category. Never regenerate an ID after reordering or changing a title. Image array order determines diagram order; category `order` controls category order. Existing numbers and array order are preserved, including gaps. New unnumbered files receive the next available number above the category's maximum (`01_`, `02_`, …, `100_`). Numbers are organizational and do not form part of stable IDs; they no longer have to match array positions.

New discoveries append to `images`: numbered uploads sort numerically first, then unnumbered uploads sort by filename. Each entry gets `id`, `title`, `file`, and `caption` using the schema above. The initial title comes from the filename (not image recognition); caption starts empty. ID collisions receive `-2`, `-3`, etc. Existing authored fields and IDs are preserved. A separately referenced cover is excluded from discovery. When a listed image needs a prefix, its `file` and any matching `cover` reference are updated together.

References must be simple filenames in the same category folder: no remote URLs, absolute paths, traversal or symlinks. The cover must exist and may reuse a listed diagram. Originals retain their source bytes for fullscreen. Detail uses an optimized derivative. The build generates micro (320 px), thumb (640 px), medium (960 px) and large (1600 px) WebP variants, preserving proportions without upscaling.

## Content contribution

1. Add a PNG/JPEG/WebP original to its category under `diagrams/`. A descriptive unnumbered filename such as `mental-structure.png` is sufficient. You may supply an unused number yourself.
2. Optionally add an authored metadata entry before building. For a new category, create `folder.json` with explicit category ID, title, numeric order, cover filename and an `images` array. Include at least the cover diagram in that array.
3. Locally, run `npm ci`, `npm test` and `npm run build`. The build synchronizes source files and metadata, generates missing/stale assets, writes `atlas.json`, and assembles `_site/`.
4. Review generated titles/IDs and edit metadata as needed. Preview with `npm start`; check cover, search, detail, fullscreen, copied permanent link and thumbnail legibility.
5. Submit originals, metadata, `atlas.json` and all of `assets/diagrams/` (including `manifest.json`) for review. Only `_site/` remains ignored. Alternatively, upload only new originals and let the main-branch Action generate and commit the rest.
6. After merge/push to `main`, the publishing workflow tests and builds. In the source repository it commits changed sources/metadata/catalog/assets back to `main`, pushes, then publishes the same `_site/` artifact. During QA, the test repository also commits/pushes generated changes; new, modified or deleted source/catalog/asset/metadata files are listed in the Action log and run summary. PR checks perform the same build with a read-only token and never push.

An LLM agent can inspect artwork and improve wording; no LLM API key is needed for automated discovery/processing. Local agent commits/pushes still require user authorization. The installed main-branch workflow is explicitly responsible for its own generated-content commits.

## Reusable agent task

> Add the attached diagram to category `<category-id>` and run the build to assign its number and metadata entry. Inspect the artwork and improve the title/caption without changing existing IDs. Run tests and rebuild, then verify search, detail, fullscreen and the permanent link. Include originals, folder.json, atlas.json and assets/diagrams (including manifest.json). Report assigned prefix, link and uncertainty. Do not commit or publish locally without authorization.

## Outputs and replacements

`npm run build:atlas` synchronizes sources and writes `atlas.json` and `assets/diagrams/<category-id>/<diagram-id>-{micro,thumb,medium,large}.webp`. `npm run build` additionally assembles public files/originals in `_site/`. Never edit generated output manually.

`assets/diagrams/manifest.json` stores source/processing fingerprints and output hashes. Missing or altered assets, changed originals, or changed encoder settings/versions regenerate affected derivatives; unchanged files are reused without rewriting. Losing the manifest safely regenerates all assets. The manifest is committed but excluded from `_site/`. Obsolete assets recorded in the manifest are removed when entries are removed or IDs change.

Replacing a source while retaining its ID preserves its permanent link. To remove a diagram, remove both the original and its metadata entry, and update the cover if necessary. Missing references, duplicate prefixes, duplicate IDs, symlinks and invalid uploads fail the build; the script does not silently discard authored entries or renumber existing diagrams.

## GitHub permissions and concurrent builds

The `build` job in `.github/workflows/pages.yml` needs `contents: write` and checkout credentials. It stages only `diagrams/`, `assets/diagrams/` and `atlas.json`, and commits only when those paths changed. An administrator must permit Actions writes and ensure main-branch rules allow this bot to push. Protected branches can instead use generated-content PRs, or an explicitly authorized GitHub App; a scoped PAT is another option. Those alternatives require separate configuration.

Pushes using `GITHUB_TOKEN` do not trigger another push workflow, so Pages deployment continues in the same run. See [GitHub's workflow-trigger rules](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

The `pages` concurrency group serializes this repository's publishing runs, and each run checks out latest `main`. It does not lock other repositories. Separate repositories processing their own sources are independent. If multiple repositories share one writable source, keep processing/committing in that source repository and let consumers read its assets; cross-repository automation requires suitable GitHub App/PAT access. Normal pushes never force-overwrite another writer. A concurrent update that makes the push stale fails the run before deployment; rerun against latest main. See [GitHub concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency).

### This project's two-remote setup

- `5vbk976d7v-source/adventures-of-the-monad` is the source repository and commits generated content.
- `jder7/aom-atlas` is for testing: it discovers images, numbers them, updates metadata, generates derivatives, lists generated changes in its run summary and builds/deploys Pages, and temporarily creates bot commits during QA.

This checkout fetches from the source and pushes to both repositories. During QA both Actions may create independent bot commits, even for identical generated files; fetch and reconcile both histories before a subsequent push to both remotes. Never force-push to resolve this automatically. The testing run lists changed files before committing, so its summary remains useful.

Commit/push behavior is configured in versioned `.github/atlas-build.json`, using a `commitGenerated` map keyed by repository name. Both entries currently equal `true`. Set an entry to `false` to disable commits for that repository; unlisted repositories are disabled. The workflow selects the entry matching its current repository, so the same config can be pushed to both remotes with different behavior. Changing it requires only an ordinary commit/PR, not repository admin access. This switch does not bypass existing branch protections or organization restrictions on Actions writes.

After QA, change `commitGenerated["jder7/aom-atlas"]` to `false` in `.github/atlas-build.json` and push the config normally; no workflow or repository-settings edit is needed. The test repository will still build, list changes and deploy, but stop creating commits. With histories reconciled and source-only commits restored, pull source bot commits locally before pushing to both. Bot commits are not automatically mirrored.

The initial 16 categories follow `docs/Knowledge Atlas Folder Structure.pages`. Starter artwork is bootstrap content; consult [CONTENT_IMPORT.md](CONTENT_IMPORT.md) for the mapping before treating examples as authoritative category-specific diagrams.

## Runtime image sizing

Category covers and diagram nodes select micro/thumb/medium/large from their rendered pixel dimensions, source proportions and device pixel ratio (capped at 2). Invisible nodes defer loading. Once a larger derivative is loaded it is reused when the node shrinks. Detail uses the same selection, capped at large; the original is requested only on fullscreen entry. Resize can upgrade detail resolution. WebP quality is 76 for micro, 82 for thumb, 85 for medium and 88 for large, retaining more detail where diagrams are read.
