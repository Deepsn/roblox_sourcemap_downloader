import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizeFileName(name: string) {
    // Keep it simple + Windows-safe.
    const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    return sanitized.length > 200 ? sanitized.slice(0, 200) : sanitized;
}


function getBundleFileName(bundleURL: string) {
    try {
        const url = new URL(bundleURL);
        const last = url.pathname.split("/").filter(Boolean).at(-1) ?? "bundle.js";
        return sanitizeFileName(last);
    } catch {
        return sanitizeFileName("bundle.js");
    }
}

export function applyInlineSourceMap(bundleText: string, sourceMapText: string) {
    // Backwards-compat shim: keep the name, but now we point to an on-disk .map file.
    // The caller should write the .map file and pass the file name here.
    return applySourceMapFileReference(bundleText, sourceMapText);
}

export function applySourceMapFileReference(bundleText: string, sourceMapFileName: string) {
    const withoutMapping = bundleText
        .replace(/^\s*\/\*#\s*sourceMappingURL=.*?\*\/\s*$/gms, "")
        .replace(/^\s*\/\/\#\s*sourceMappingURL=.*$/gm, "")
        .trimEnd();

    return `${withoutMapping}\n//# sourceMappingURL=${sourceMapFileName}\n`;
}

export async function writeBundlesToDist(params: {
    bundles: Map<string, string>;
    sourceMaps: Map<string, string>;
    distDir?: string;
}) {
    const distDir = params.distDir ?? "dist";
    await mkdir(distDir, { recursive: true });

    const notMappedDir = path.join(distDir, "not_mapped");
    await mkdir(notMappedDir, { recursive: true });

    for (const [bundleURL, bundleText] of params.bundles) {
        const fileName = getBundleFileName(bundleURL);
        const outPath = path.join(distDir, fileName);

        const sourceMapText = params.sourceMaps.get(bundleURL);
        if (!sourceMapText) {
            // Put unmapped bundles under dist/not_mapped/
            const nmOut = path.join(notMappedDir, fileName);
            await writeFile(nmOut, bundleText, "utf8");
            continue;
        }

        // Parse the source map and write original sources into dist/ following their source paths
        let parsed: any;
        try {
            parsed = JSON.parse(sourceMapText);
        } catch (err) {
            // If parsing fails, fallback to writing the map and the bundle file
            const mapFileName = `${fileName}.map`;
            const mapOutPath = path.join(distDir, mapFileName);
            await writeFile(mapOutPath, sourceMapText, "utf8");

            const outputText = applySourceMapFileReference(bundleText, mapFileName);
            await writeFile(outPath, outputText, "utf8");
            continue;
        }

        const sources: string[] = parsed.sources ?? [];
        const sourcesContent: Array<string | null> = parsed.sourcesContent ?? [];
        const sourceRoot: string | undefined = parsed.sourceRoot;

        for (let i = 0; i < sources.length; i++) {
            const rawSourcePath = sources[i] ?? `source_${i}.txt`;
            const content = sourcesContent[i];
            if (typeof content !== "string" || content.length === 0) continue;

            // Compute a safe destination path under dist/, keeping folder structure from the source path and sourceRoot
            const combined = sourceRoot ? path.posix.join(sourceRoot, rawSourcePath) : rawSourcePath;

            let rel = sanitizeRelativeSourcePath(combined);
            if (!rel) continue;

            const targetPath = path.join(distDir, rel);

            await mkdir(path.dirname(targetPath), { recursive: true });

            // If file exists with different content, create a unique sibling file so we don't lose either
            let finalPath = targetPath;
            try {
                const existing = await readFileIfExists(finalPath);
                if (existing !== null && existing !== content) {
                    // create a unique path with bundle fileName appended
                    const parsed = path.parse(finalPath);
                    const dir = parsed.dir || ".";
                    const newName = `${parsed.name}.${sanitizeFileName(fileName)}${parsed.ext}`;
                    finalPath = path.join(dir, newName);
                }
            } catch (e) {
                // ignore
            }

            await writeFile(finalPath, content, "utf8");
        }
    }
}

function sanitizeRelativeSourcePath(raw: string) {
    if (!raw) return null;

    // Normalize separators
    let normalized = raw.replace(/\\/g, "/");

    // Remove common protocols or webpack prefix
    normalized = normalized.replace(/^webpack:\/\//, "");
    normalized = normalized.replace(/^[a-zA-Z]+:\/\//, "");

    // Drop drive letters like C:/
    normalized = normalized.replace(/^[a-zA-Z]:\//, "");

    // Remove leading ./ or /
    normalized = normalized.replace(/^\.\/+/, "");
    normalized = normalized.replace(/^\/+/, "");

    const parts = normalized.split("/").filter((part) => part !== "" && part !== "." && part !== "..");

    // Ensure no path segment starts with a dot (avoids creating hidden dot-files like `.js`) and no empty names
    const cleanedParts = parts.map((part, idx) => {
        // strip leading dots
        let p = part.replace(/^[.]+/, "");
        // replace invalid chars
        p = p.replace(/[^a-zA-Z0-9._-]/g, "_");
        // ensure not empty
        if (p.length === 0) p = `_source_${idx}`;
        // also prevent leading dot after sanitization
        if (p[0] === ".") p = `_${p.slice(1)}`;
        return p;
    });

    const cleaned = cleanedParts.join(path.sep);
    return cleaned || null;
}

async function readFileIfExists(p: string) {
    try {
        const s = await import("node:fs/promises").then((m) => m.readFile(p, "utf8"));
        return s;
    } catch {
        return null;
    }
}
