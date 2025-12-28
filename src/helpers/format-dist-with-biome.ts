export function formatDistWithBiome(distDir: string) {
    Bun.spawnSync({
        cmd: ["biome", "format", distDir, "--write", "--format-with-errors", "true", "--files-ignore-unknown", "true"],
        stdout: "inherit",
        stderr: "inherit",
    })
}