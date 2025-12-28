import { getBundleScripts } from "./helpers/get-bundle-scripts";
import { getBundlesSourceMaps } from "./helpers/get-bundle-source-map";
import { writeBundlesToDist } from "./helpers/write-bundles-to-dist";

const bundleScripts = await getBundleScripts("charts");
const bundleMapping = await getBundlesSourceMaps(bundleScripts);

await writeBundlesToDist({
    bundles: bundleScripts,
    sourceMaps: bundleMapping,
    distDir: "dist",
});

console.log(bundleMapping.size, "/", bundleScripts.size, "bundles have source maps.");
console.log("Bundle Source Maps:");
for (const [bundleURL] of bundleScripts) {
    const sourceMap = bundleMapping.get(bundleURL);
    console.log(`Bundle URL: ${bundleURL}`);
    console.log(`Source Map: ${sourceMap?.slice(0, 10)}`);
}
