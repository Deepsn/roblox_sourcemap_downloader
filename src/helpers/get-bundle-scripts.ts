export async function getBundleScripts(pathname = "") {
	const response = await fetch(`https://roblox.com/${pathname}`);
	const html = await response.text();

	const bundleURLs = new Set<string>();
	const urlRegex = /https:\/\/js\.rbxcdn\.com\/.+\.js/g;

	const matches = html.matchAll(urlRegex);
	for (const match of matches) {
		bundleURLs.add(match[0]);
	}

	const bundles = new Map<string, string>();

	for (const url of bundleURLs) {
		const bundleResponse = await fetch(url);
		const bundleText = await bundleResponse.text();
		bundles.set(url, bundleText);
	}

	return bundles;
}
