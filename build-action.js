#!/usr/bin/env node
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync } from "fs";

console.log("Building GitHub Action bundle with ncc...");

try {
  // Clean and create dist directory
  rmSync("dist", { recursive: true, force: true });
  mkdirSync("dist", { recursive: true });
  
  // Bundle the action entry point with ncc
  // This includes all dependencies in a single file for fast execution
  console.log("Bundling action.ts with all dependencies...");
  
  // Use ncc with TypeScript transpileOnly to avoid type checking reference folder
  execSync("bunx ncc build src/action.ts -o dist -m --transpile-only", { 
    stdio: "inherit",
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: "true"
    }
  });
  
  console.log("✅ Action bundle created successfully!");
  console.log("   Output: dist/index.js (bundled action)");
  console.log("   The GitHub Action can now execute this directly without npm install");
  
} catch (error) {
  console.error("❌ Build failed:", error);
  process.exit(1);
}