# Agent Instructions (Repository‑Wide)

This repository is optimized for instant cold‑boot CI. Follow these rules strictly.

## Compute Workflow Rules

- DO NOT install dependencies in `.github/workflows/compute.yml`.
- DO NOT build/bundle in `.github/workflows/compute.yml`.
- The compute job must execute the committed bundle from `dist/` directly.
- Keep the compute job minimal: checkout, set up Node, run `node dist/action.js`.
- Never add steps like `npm ci`, `npm install`, `pnpm install`, `yarn install`, `npm run build`, or `npm run bundle` to the compute workflow.

Rationale: We commit the compiled artifact to ensure zero network waits and sub‑second startup in CI.

## Local Development and Bundling

- Use `tsup` to bundle the action entry `src/action.ts`.
- Command: `tsup src/action.ts --format esm --target node22 --sourcemap --out-dir dist --clean --no-splitting`.
- Commit `dist/action.js` and `dist/action.js.map` with each change that affects runtime.

## Entry Points

- GitHub Actions entry: `dist/action.js` (ESM).
- Cloudflare/Worker or server entry points (if any) should also be bundled before commit.

## Notes

- `actions/setup-node` is permitted to provision Node, but no package installs or builds are allowed.
- If the workflow requires input normalization (e.g., payload compression), implement it in code, not via extra CI steps that slow boot time.

