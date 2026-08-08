# roblox_sourcemap_downloader

Downloads Roblox JS bundles from the site, fetches any available source maps, and writes the mapped sources to a `dist/` folder so you can inspect the original files the way Chrome DevTools does.

## What it does

- Downloads all `.js` bundles referenced from a Roblox page (by pathname).
- Fetches and saves `.map` files when available, and rewrites the bundle's `//# sourceMappingURL=` to point at the saved `.map`.
- For bundles with source maps, extracts the mapped sources and writes them to `dist/` under their original source paths (merged into one tree), similar to DevTools' webpack view.
- Places bundles without source maps under `dist/not_mapped/`.
- Handles path collisions: when two bundles map to the same target path with different contents, both files are kept. The colliding filename gets a sanitized bundle identifier appended instead of being overwritten.
- Avoids creating hidden/dot-prefixed files and preserves directories.
- Formats the generated `dist/` with Biome after writing.

## Development

Install dependencies:

```bash
bun install
```

Run:

```bash
bun dev
```

## Output layout

After a run, `dist/` looks like:

- `dist/<original-source-path>/...` — mapped sources extracted from maps (paths preserved)
- `dist/<bundle>.js` — the downloaded bundle, with `//# sourceMappingURL=<bundle>.js.map` when a map exists
- `dist/<bundle>.js.map` — the saved source map
- `dist/not_mapped/<bundle>.js` — bundles that had no source map

Example:

```
dist/components/robloxBadges/src/index.tsx
dist/0f91ae7....js
dist/0f91ae7....js.map
dist/not_mapped/some-minified-bundle.js
```

## Notes

- Source maps don't reconstruct a single de-minified bundle. This tool extracts the map's `sourcesContent` (the original files) and writes them to disk so debuggers can show the sources.
- Some bundles omit maps on purpose (e.g. Sentry or private bundles); those go to `dist/not_mapped/` so they're easy to separate.
- If a map is invalid, the `.map` and bundle are still saved and the run continues.

To change which pages are scraped, edit the `pathnames` array in `src/index.ts` (currently `games/606849621/Jailbreak`, `catalog`, and `upgrades/robux`).
