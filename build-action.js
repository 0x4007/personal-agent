#!/usr/bin/env node
import ncc from "@vercel/ncc";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
  try {
    console.log("Building GitHub Action...");
    
    // First typecheck
    console.log("Type checking TypeScript...");
    execSync("bun run typecheck", { stdio: "inherit" });
    
    // Bundle with ncc (directly from TypeScript source)
    console.log("Bundling with @vercel/ncc...");
    const { code, map, assets } = await ncc(path.join(__dirname, "src", "action.ts"), {
      cache: false,
      minify: false,
      sourceMap: false,
      v8cache: false,
      quiet: false,
      transpileOnly: false,
      externals: [], // Bundle everything
    });
    
    // Ensure dist directory exists
    const distPath = path.join(__dirname, "dist");
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true });
    }
    
    // Write the bundled code
    fs.writeFileSync(path.join(distPath, "index.js"), code);
    console.log("✅ Action bundled to dist/index.js");
    
    // Copy any assets if they exist
    if (assets && Object.keys(assets).length > 0) {
      for (const [assetPath, assetContent] of Object.entries(assets)) {
        const fullPath = path.join(distPath, assetPath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, assetContent.source);
      }
    }
    
    console.log("✅ Build complete!");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

build();