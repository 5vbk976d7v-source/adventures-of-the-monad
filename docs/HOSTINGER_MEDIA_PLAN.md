# Plan: separate Atlas UI and Hostinger media delivery

Status: implementation prepared locally in the `main` working tree and an uncommitted `media` worktree. No commits, pushes or deployments have been made. Hostinger upload, live service checks and final migration remain pending.

## Architecture and ownership

Use exactly two branches: `main` for the UI application on GitHub Pages, and `media` for the standalone PHP service on Hostinger. There is no third `ui` branch. WordPress is not loaded or modified.

| Location | Contents | Publication |
| --- | --- | --- |
| `main` branch | HTML/CSS/JS, branding artwork, endpoint configuration, UI build/tests | GitHub Pages |
| `media` branch | Only the PHP runtime files and Apache rules that are uploaded to Hostinger | Dedicated Hostinger directory |
| Hostinger content directories | Uploaded originals, generated derivatives, catalog cache and ID registry | Originals/derivatives are served; internal state is private |

The target is to keep originals and generated diagram assets outside both branches. The existing `diagrams/` directory, including all category `folder.json` files, remains unchanged on `main` during the migration. The `media` worktree removes the original and generated diagram collections. The user will bulk-upload the cleaned directory to Hostinger and later remove the retained copy from `main`. Each branch owns its code and deployment; do not merge the branches wholesale. Develop in separate local worktrees. Share a documented catalog schema.

## 1. Preserve current content and define the interface

- Inventory the current originals, metadata, stable category/diagram IDs and permanent URLs.
- Prepare a separate migration backup of originals and metadata before removing any active Git paths. The existing pre-Pages archive is a code backup, not an original-image backup.
- Retain `collections`, category covers, titles/captions, dimensions and `original`, `micro`, `thumb`, `medium`, `large` fields. Return absolute HTTPS media URLs and a schema version.
- Keep the current permanent IDs; initialize a persistent Hostinger ID registry from existing metadata. New IDs are assigned once, never from array position. Number prefixes control ordering, not identity.
- Treat replacement at the same source path as the same diagram. Arbitrary file/folder renames or moves require an explicit migration/mapping to preserve IDs; do not silently promise rename detection.

### Category folder.json files

Keep existing category `folder.json` files with the originals when uploading to Hostinger. They preserve explicit category IDs, titles, order and cover choices, plus existing diagram IDs, authored titles and captions. They are optional overrides for the proposed scanner, not a required inventory of every file: new images are discovered without editing JSON, missing images are omitted, and missing covers fall back to the first available diagram.

For new categories without `folder.json`, derive display names/order from the folder and filenames and persist newly assigned IDs in the host-local registry. Existing authored metadata takes precedence; declared image order applies to surviving listed files, with newly discovered files appended in natural order. An empty or absent metadata file must not prevent discovery. Do not discard the migrated metadata on Hostinger: the ID registry preserves identity, but is not a replacement for authored titles/captions and category settings. Protect raw metadata files from direct HTTP access and back them up with originals and the registry.

## 2. Prepare the media branch

Implement and verify `catalog.php` and `image.php` locally; keep the `media` branch tree limited to the runtime files needed on Hostinger.

Proposed public service directory:

```text
public_html/atlas-media/
  catalog.php
  image.php
  diagrams/
    01_cosmology-how-it-all-began/
    02_the-monad-how-it-functions/
    ...
  cache/
```

Keep ID registry, lock files and internal catalog state outside the public directory where possible, otherwise explicitly deny HTTP access. Host-local settings/credentials are not committed.

Catalog behavior:

- Scan category folders and supported regular image files; ignore hidden files, temporary uploads and symlinks.
- Use optional existing metadata for IDs/titles/captions, without requiring edits for each new image.
- Discover additions/deletions automatically. A missing metadata-listed source no longer fails the entire catalog; omit it from the public result while retaining its identity mapping.
- Preserve explicit metadata ordering where provided; otherwise use natural numeric sorting. No 16-category limit. Numbering is optional for uploads, and no request renames originals.
- Keep the configured cover if present, otherwise use the first available diagram. Omit empty categories.
- Cache the completed catalog briefly (initial target: 60 seconds); serialize refreshes and atomically replace the cache. If refresh fails, retain the last valid catalog.
- Permit browser catalog access from configured production/testing/local UI origins. Handle CORS correctly for cached responses. Read access is public; this service has no public upload endpoint.

Image behavior:

- Generate 320/640/960/1600 px WebP variants on first request, preserve proportions/orientation and do not enlarge small originals.
- Keep originals untouched for fullscreen.
- Use source-versioned derivative URLs/cache keys so replacement does not serve an old browser/CDN cache entry.
- Serve existing generated assets directly where supported; uncached requests go to the generator. Configure this inside the service directory so WordPress routing does not intercept it.
- Lock concurrent generation, use atomic writes, validate supported formats/pixel limits and restrict all reads/writes to configured roots.
- Missing sources return 404; processing failures return appropriate errors. The UI handles both.
- Add bounded cleanup of obsolete cache files. Optional later improvement: scheduled warming of only new/missing variants; no full-library reprocessing on UI builds.

## 3. Prepare Hostinger delivery

- Verify actual hosting: PHP version, Imagick or GD/WebP, memory/upload/storage/file-count limits, and directory-level server rules.
- Use a dedicated `/atlas-media/` directory or media subdomain; keep WordPress files untouched.
- Start with manual deployment of a small code-only package through Hostinger File Manager. Normal diagram uploads need no developer or deployment action.
- Never deploy by replacing or clearing the entire media directory. Code deployments must preserve `diagrams/`, cache, ID state and host configuration.
- Configure directory protections, HTTPS, caching and any hotlink settings for Atlas consumers.
- Test outside the current live media path before switching the UI.
- Optional future automation may deploy the `media` branch via SFTP if credentials/permissions are available; this is not a prerequisite and no production repository-admin access is assumed.

## 4. Simplify main and GitHub Pages

- Add a versioned public endpoint configuration pointing to Hostinger `catalog.php`; configure testing/local endpoints without repository-admin settings.
- Update catalog loading for cross-origin public requests, timeouts, schema validation and useful failure messages.
- Keep the existing responsive image selection, fullscreen-original behavior and stable detail URLs.
- Remove diagram discovery, resizing and copying from the UI build. Remove Sharp if it has no remaining build use.
- Remove generated-content bot commits, the commit toggle, and filesystem publish checks from the Pages workflow. UI builds/tests must succeed without reaching Hostinger.
- Keep only application files, branding artwork and public configuration in the Pages artifact. Use a small fixture for local/offline UI testing.
- Retain `diagrams/` and its metadata on `main` until the user removes them after migration; exclude them from the new Pages artifact even while retained. Remove obsolete generated diagram assets and the production local catalog only after migration verification. Historical Git blobs remain until a separately authorized history cleanup; this plan does not rewrite Git history.
- The Pages branch builds/deploys the UI. Keep development tests and explanations on `main`; the `media` branch should contain only Hostinger runtime files and no GitHub workflow.

## 5. Migrate and verify

1. Prepare and validate the cleaned category structure while preserving `diagrams/` on `main` and retaining existing IDs/metadata. The user will upload the entire cleaned `diagrams/` directory into Hostinger's `atlas-media/`, resulting in `atlas-media/diagrams/<category>/`. Include the category `folder.json` files. Do not require the user to upload images individually or edit their metadata. The service seeds its ID registry from uploaded metadata at first scan.
2. Compare file counts/checksums, category order, titles, cover choices and IDs against the current catalog.
3. Test bulk upload, source replacement, deletion, deleted-cover fallback, empty categories and files still uploading.
4. Test first derivative generation, warm-cache reuse, simultaneous requests, changed-source cache invalidation, portrait orientation and missing-file responses.
5. Exercise category/diagram views, search, detail/permanent links, fullscreen and loading/error states against Hostinger from desktop/mobile UI origins.
6. Switch the testing UI first, then production after verification. Validate a production-sized batch and measure cold/warm response times before deciding whether cache warming is needed.
7. Confirm the Pages artifact contains no diagram library and a UI rebuild neither scans nor processes it.
8. Once the upload and migration are verified, the user will delete the retained `diagrams/` copy from `main`. The Hostinger copy, including its `folder.json` files, remains the live content source.

## 6. Day-to-day operation and rollback

Editor: open a category folder in Hostinger File Manager and bulk-upload originals. Use descriptive filenames; optional numeric prefixes set order. Replace/delete files there. Atlas discovers updates after the catalog cache expires. No WordPress editing, Git or JSON editing is required for routine uploads.

Back up originals and the ID registry together; cached derivatives can be regenerated. Service releases preserve content/state. Keep the pre-migration UI release and original-image backup until cutover is verified, allowing rollback without reconstructing the library. Changes to API schema must remain compatible during independent UI/media deployments.

## Inputs needed before implementation/deployment

- Host is `https://adventuresofthemonad.com/`; service path is `/atlas-media/`.
- PHP version, GD WebP support, write permissions and actual cold/warm timings still need verification on Hostinger. PHP lint and service tests passed locally before removing non-runtime files from the `media` branch.
- Production/testing UI origins are configured as `https://atlas.adventuresofthemonad.com` and `https://jder7.github.io`.
- The service defaults private catalog/ID state to a denied `state/` directory. For stronger isolation, set `state_dir` outside the public directory in the untracked `media-config.local.php`.
- Local branch worktrees are prepared, but no changes have been committed or pushed. Live deployment requires Hostinger File Manager and the user's bulk upload.
