# roblox_sourcemap_downloader 🚀

A small utility that downloads Roblox JS bundles from the site, fetches any available source maps, and writes an on-disk representation of the mapped sources into a `dist/` folder so you can inspect original files the same way Chrome DevTools does.

## Features ✅

- Downloads all `.js` bundles referenced from a Roblox page (by pathname).
- Fetches and saves `.map` files when available, and updates the bundle's `//# sourceMappingURL=` to point to the saved `.map` file.
- For bundles with source maps, extracts mapped sources and writes them into `dist/` using their original source paths (merged tree), so you get a folder structure similar to DevTools' webpack view.
- Bundles without source maps are placed under `dist/not_mapped/`.
- Collision-safe: when different bundles produce identical target paths with different contents, the writer keeps both files without overwriting (it appends a sanitized bundle identifier to the colliding filename).
- Avoids creating hidden/dot-prefixed files and preserves directories.

## Quickstart ⚡

Install dependencies:

```bash
bun install
```

Run downloader:

```bash
bun run .
# or
bun dev
```

The project entrypoint is `src/index.ts` and currently uses Bun as the runtime.

## Output layout 📁

After a successful run the `dist/` folder will look like:

- `dist/<original-source-path>/...` — mapped sources extracted from maps (paths preserved)
- `dist/<bundle>.js` — the downloaded bundle with `//# sourceMappingURL=<bundle>.js.map` when a map exists
- `dist/<bundle>.js.map` — the saved source map file
- `dist/not_mapped/<bundle>.js` — bundles that had no source map

Examples:

```
dist/components/robloxBadges/src/index.tsx
dist/0f91ae7....js
dist/0f91ae7....js.map
dist/not_mapped/some-minified-bundle.js
```

## Behavior notes 💡

- Source maps do not reconstruct a single "de-minified" bundle — this tool extracts the map's `sourcesContent` (the original files) and writes them to disk so debuggers can show the original sources.
- Some bundles intentionally omit maps (e.g. Sentry or private bundles); those are placed into `dist/not_mapped/` so you can separate them easily.
- If the tool encounters an invalid map it will still save the `.map` and the bundle and continue.

## Internals & customization 🔧

- Core helpers live in `src/helpers/`:
  - `get-bundle-scripts.ts` — finds and downloads bundles
  - `get-bundle-source-map.ts` — locates and downloads source maps
  - `write-bundles-to-dist.ts` — writes bundles/maps and extracts mapped sources
- You can modify `src/index.ts` to change the target pathname (it currently uses the "charts" pathname).
