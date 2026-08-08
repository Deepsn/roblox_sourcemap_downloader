import { formatDistWithBiome } from "./helpers/format-dist-with-biome";
import { getBundleScripts } from "./helpers/get-bundle-scripts";
import { getBundlesSourceMaps } from "./helpers/get-bundle-source-map";
import { writeBundlesToDist } from "./helpers/write-bundles-to-dist";

const pathnames = ["games/606849621/Jailbreak", "catalog", "upgrades/robux"];

console.log("Downloading bundles and source maps...");
const bundleScripts = new Map<string, string>();
for (const pathname of pathnames) {
	console.log(`Downloading bundles for ${pathname}...`);
	const scripts = await getBundleScripts(pathname);
	for (const [url, text] of scripts) {
		bundleScripts.set(url, text);
	}
}

console.log(`Downloaded ${bundleScripts.size} bundles.`);
const bundleMapping = await getBundlesSourceMaps(bundleScripts);

console.log(`Writing bundles and source maps to disk...`);
await writeBundlesToDist({
	bundles: bundleScripts,
	sourceMaps: bundleMapping,
	distDir: "dist",
});

console.log("Formatting dist/ with Biome...");
formatDistWithBiome("dist");
