import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BUNDLE_DETECTOR_PREFIX_MAP: [prefix: string, folder: string][] = [
	["DynamicLocalizationResourceScript_", "Locales"],
];

function getBundleDetectedPath(content: string): string | null {
	const match = /window\.Roblox\.BundleDetector\.bundleDetected\(\s*["']([^"']+)["']/.exec(content);

	if (content.includes("bundleDetected")) console.log("BundleDetector match:", match?.[1]);
	if (!match) return null;

	const bundleName = match[1];
	if (!bundleName) return null;

	for (const [prefix, folder] of BUNDLE_DETECTOR_PREFIX_MAP) {
		if (bundleName.startsWith(prefix)) {
			const rest = bundleName.slice(prefix.length);
			const parts = rest.split(".");
			return `${path.join(folder, ...parts)}.js`;
		}
	}

	// Fallback: treat the whole name as a dot-separated path
	const parts = bundleName.split(".");
	return `${path.join(...parts)}.js`;
}

function sanitizeFileName(name: string) {
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
	return applySourceMapFileReference(bundleText, sourceMapText);
}

export function applySourceMapFileReference(bundleText: string, sourceMapFileName: string) {
	const withoutMapping = bundleText
		.replace(/^\s*\/\*#\s*sourceMappingURL=.*?\*\/\s*$/gms, "")
		.replace(/^\s*\/\/#\s*sourceMappingURL=.*$/gm, "")
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
			const bundleDetectedRel = getBundleDetectedPath(bundleText);

			if (bundleDetectedRel) {
				const targetPath = path.join(distDir, bundleDetectedRel);
				await mkdir(path.dirname(targetPath), { recursive: true });

				let finalPath = targetPath;

				try {
					const existing = await readFileIfExists(finalPath);
					if (existing !== null && existing !== bundleText) {
						const parsed = path.parse(finalPath);
						const dir = parsed.dir || ".";
						const newName = `${parsed.name}.${sanitizeFileName(fileName)}${parsed.ext}`;
						finalPath = path.join(dir, newName);
					}
				} catch {
					console.warn("Failed to check existing file:", finalPath);
				}

				await writeFile(finalPath, bundleText, "utf8");
				continue;
			}

			const nmOut = path.join(notMappedDir, fileName);
			await writeFile(nmOut, bundleText, "utf8");
			continue;
		}

		let parsed: { sources?: string[]; sourcesContent?: (string | null)[]; sourceRoot?: string };
		try {
			parsed = JSON.parse(sourceMapText);
		} catch {
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

			const combined = sourceRoot ? path.posix.join(sourceRoot, rawSourcePath) : rawSourcePath;

			const rel = sanitizeRelativeSourcePath(combined);
			if (!rel) continue;

			const targetPath = path.join(distDir, rel);

			await mkdir(path.dirname(targetPath), { recursive: true });

			let finalPath = targetPath;
			try {
				const existing = await readFileIfExists(finalPath);
				if (existing !== null && existing !== content) {
					const parsed = path.parse(finalPath);
					const dir = parsed.dir || ".";
					const newName = `${parsed.name}.${sanitizeFileName(fileName)}${parsed.ext}`;
					finalPath = path.join(dir, newName);
				}
			} catch {}

			await writeFile(finalPath, content, "utf8");
		}
	}
}

function sanitizeRelativeSourcePath(raw: string) {
	if (!raw) return null;

	let normalized = raw.replace(/\\/g, "/");

	normalized = normalized.replace(/^webpack:\/\//, "");
	normalized = normalized.replace(/^[a-zA-Z]+:\/\//, "");

	normalized = normalized.replace(/^[a-zA-Z]:\//, "");

	normalized = normalized.replace(/^\.\/+/, "");
	normalized = normalized.replace(/^\/+/, "");

	const parts = normalized.split("/").filter((part) => part !== "" && part !== "." && part !== "..");

	const cleanedParts = parts.map((part, idx) => {
		let p = part.replace(/^[.]+/, "");
		p = p.replace(/[^a-zA-Z0-9._-]/g, "_");
		if (p.length === 0) p = `_source_${idx}`;
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
