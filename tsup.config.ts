import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  platform: "node",
  target: "node22",
  format: ["esm"],
  sourcemap: true,
  splitting: false,
  clean: !options.watch,
  dts: false,
  // Bundle all dependencies so compute.yml never installs packages
  // Use a wildcard pattern list to avoid tsup treating booleans unexpectedly in plugins
  noExternal: [/^.*/],
}));
