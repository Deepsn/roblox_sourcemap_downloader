export async function getBundlesSourceMaps(bundles: Map<string, string>) {
    const sourceMaps = new Map<string, string>();

    for (const [url, bundleText] of bundles) {
        const sourceMap = await getBundleSourceMap(bundleText);
        if (!sourceMap) {
            if (url.includes("sentry")) {
                console.warn(`Skipping Sentry bundle without source map: ${url}`);
            }
            continue;
        }
        sourceMaps.set(url, sourceMap);
    }

    return sourceMaps;
}

export async function getBundleSourceMap(bundleText: string) {
    const sourceMapRegex = /\/\/# sourceMappingURL=(.+\.map)/;
    const match = sourceMapRegex.exec(bundleText);
    const sourceMapURL = match ? match[1] : undefined;

    if (!sourceMapURL) return;

    const response = await fetch(sourceMapURL)
    const bundleMapping = await response.text().catch(() => undefined);

    if (!bundleMapping) {
        // Try with other url
        const otherUrl = sourceMapURL.split("rbxcdn.com/")[1];
        const alternativeResponse = await fetch("https://js.rbxcdn.com/" + otherUrl);

        if (!alternativeResponse.ok) return;

        return alternativeResponse.text();
    }

    return bundleMapping
}