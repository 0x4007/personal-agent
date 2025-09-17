# Personal Access Tokens Plan (Read vs Admin)

Goal
- Maintain two fine‑grained GitHub PATs for the personal-agent system:
  - PAT_READ: strictly read‑only. Used when a non‑owner invokes the agent (read‑only mode).
  - PAT_FULL: admin/write. Used when the owner (`AGENT_OWNER`, currently `0x4007`) invokes the agent.

Current Usage in Code
- Selection happens in `src/handlers/codex-agent.ts` (function `selectPatToken`).
  - Owner path → `USER_PAT_FULL` → `PAT_FULL` → `USER_PAT` → `PLUGIN_GITHUB_TOKEN` → `GITHUB_TOKEN`.
  - Non‑owner path → `USER_PAT_READ` → `PAT_READ` → `USER_PAT` → `PLUGIN_GITHUB_TOKEN` → `GITHUB_TOKEN`.
- The compute workflow sets:
  - `USER_PAT_FULL: ${{ secrets.PAT_FULL }}`
  - `USER_PAT_READ: ${{ secrets.PAT_READ }}`
- Prefetching GitHub context runs in compute using the selected token, not on the Pi.

Design of the Tokens (Fine‑Grained)
- PAT_READ (read‑only)
  - Scope type: Fine‑grained token
  - Resource owner: `ubiquity` organization
  - Repository access: Prefer narrow (start with `.github-private`); expand only if needed.
  - Permissions (Read): Metadata, Contents, Issues, Pull requests, Discussions (if needed), Actions (Read optional), Members (none), Administration (none).
  - No write permissions. No repo admin. Expiration required (e.g., 90 days) with calendar reminders.

- PAT_FULL (admin/write)
  - Scope type: Fine‑grained token
  - Resource owner: `ubiquity` organization
  - Repository access: Start with `.github-private` (or the repos you want to support posting). Expand deliberately.
  - Permissions (Write where needed): Issues (Write) to post comments, Pull requests (Write) if commenting on PRs, Contents (Read is enough), Discussions (Write if you want to post there), Actions (Read), Administration (none unless absolutely needed).
  - Expiration required (e.g., 90 days) with reminders. Rotate proactively.

Creation Steps (UI)
1) GitHub → Settings → Developer settings → Personal access tokens → Fine‑grained tokens → Generate new token.
2) PAT_READ
   - Name: `personal-agent-read`
   - Expiration: 90 days (or org policy)
   - Resource owner: `ubiquity`
   - Repository access: Select `.github-private` (and any others the agent must read)
   - Permissions: set all to Read; ensure Issues, Pull requests, Contents, Metadata at minimum.
   - Generate and copy token once.
3) PAT_FULL
   - Name: `personal-agent-admin`
   - Expiration: 90 days
   - Resource owner: `ubiquity`
   - Repository access: Same as above, add more repos only if you need to post in them.
   - Permissions: Issues (Write), Pull requests (Write), Discussions (Write if needed), Contents (Read), Metadata (Read). Avoid granting Organization Admin unless required.
   - Generate and copy token once.

Secrets Wiring (Repo: 0x4007/personal-agent)
- Add/Update repository secrets:
  - `PAT_READ` → paste the `personal-agent-read` token
  - `PAT_FULL` → paste the `personal-agent-admin` token
- The compute workflow already exports:
  - `USER_PAT_FULL: ${{ secrets.PAT_FULL }}`
  - `USER_PAT_READ: ${{ secrets.PAT_READ }}`
- No changes to `compute.yml` needed.

Operational Tests
1) Owner path (uses PAT_FULL):
   - From `0x4007`, comment on issue `@0x4007 hello`.
   - Expect: compute posts a short, sanitized reply. Artifacts show `repo/issue` in `pi-request-<run_id>.json`.
2) Non‑owner path (uses PAT_READ):
   - From a different GitHub user, comment starting with `@0x4007`.
   - Expect: read‑only mode; no comment posted by compute.
   - Artifacts should still show prompt/PI body; logs should NOT show a GitHub POST.
3) Prefetch verification:
   - In artifacts, `prompt-<run_id>.txt` should include `GitHub context (prefetched)` content.

Rotation & Expiry
- Set token expirations (e.g., 90 days). Two weeks before expiry:
  - Create new PATs with the same permissions and repository set.
  - Update the repo secrets `PAT_READ` and `PAT_FULL` with the new token strings.
  - Trigger a test comment to verify both owner/non‑owner paths.
  - Revoke the old tokens.

Security Considerations
- Use fine‑grained tokens limited to specific repositories and minimal permissions.
- Keep PATs out of Pi; Pi uses `gh` auth already configured as `0x4007` for server‑side posting only when explicitly requested (we default to `post:false`).
- Prefer owner‑only posting; all others are read‑only.
- Never install dependencies or build in compute (cold‑start policy preserved). Dist is committed.

Rollback
- If a token causes failures, temporarily fall back to `GITHUB_TOKEN` by removing the PAT secret from the environment (owner path will then use `PLUGIN_GITHUB_TOKEN` → `GITHUB_TOKEN`).
- Re‑create the fine‑grained token with corrected scopes and re‑add the secret.

