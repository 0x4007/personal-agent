import { defineConfig } from "tsup";
export default defineConfig((options) => ({
    entry: ["src/index.ts"],
    outDir: "dist",
    platform: "node",
    target: "node22",
    format: ["esm"],
    sourcemap: true,
    splitting: false,
    clean: !options.watch,
    dts: false,
    shims: true,
    cjsInterop: true,
    banner: {
        js: 'import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);',
    },
    // Bundle all dependencies so compute.yml never installs packages
    // Use a wildcard pattern list to avoid tsup treating booleans unexpectedly in plugins
    noExternal: [/^.*/],
}));
