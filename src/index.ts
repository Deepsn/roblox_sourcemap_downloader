import { formatDistWithBiome } from "./helpers/format-dist-with-biome";
import { getBundleScripts } from "./helpers/get-bundle-scripts";
import { getBundlesSourceMaps } from "./helpers/get-bundle-source-map";
import { writeBundlesToDist } from "./helpers/write-bundles-to-dist";

console.log("Downloading bundles and source maps...");
const bundleScripts = await getBundleScripts("charts");

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