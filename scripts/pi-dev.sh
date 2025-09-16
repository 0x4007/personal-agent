#!/usr/bin/env bash
set -euo pipefail

# Simple helpers to probe/curl the Raspberry Pi Codex API.

MODE="${1:-probe}"
PI_USER="${PI_USER:-pi}"
PI_HOST="${PI_HOST:-pi.local}"
PI_DEST="${PI_DEST:-/home/pi/tmp/personal-agent-local-run}"
SSH_OPTS=${SSH_OPTS:-"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"}

curl_remote() {
  AGENT_OWNER_=${AGENT_OWNER:-0x4007}
  OWNER_=${OWNER:-ubiquity}
  REPO_=${REPO:-.github-private}
  ISSUE_=${ISSUE:-23}
  SENDER_=${SENDER:-$OWNER_}
  BODY_=${BODY:-"@$AGENT_OWNER_ remote test"}
  ACCESS_MODE_=${ACCESS_MODE:-read-only}
  PI_URL_=${PI_URL:-http://127.0.0.1:3000}

  # Strip leading mention for command text
  CMD_=$(printf "%s" "$BODY_" | sed "s/^@${AGENT_OWNER_}[[:space:]]\{0,1\}//")
  PROMPT_="[mode:${ACCESS_MODE_}] [type:issue] repo:${OWNER_}/${REPO_} issue:${ISSUE_} actor:${SENDER_} Environment: Linux shell on Raspberry Pi with git and the GitHub CLI (gh) installed. The gh CLI is authenticated as @${AGENT_OWNER_} with access to private repos. Rules: use gh for all GitHub reads (issues, PRs, files, diffs). Prefer JSON output (e.g., gh issue view ${ISSUE_} --json title,body,comments). If raw REST is needed, use gh api with JMESPath -q. Do not request credentials. Posting policy: do NOT post comments yourself; output only the final comment text. The runner will post your final answer. \nUser request: ${CMD_} \nInstructions: Provide a helpful, concise answer. Consider repo code and issue discussion. Output plain text suitable for a GitHub comment."

  echo "[pi-dev] curl -> $PI_URL_/api/codex" >&2
  # Build JSON safely and send via base64 to avoid quoting issues over ssh
  esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
  PROMPT_E=$(esc "$PROMPT_")
  CMD_E=$(esc "$CMD_")
  BODY_E=$(esc "$BODY_")
  # Send only raw_comment to force server posting without Codex
  JSON_PAYLOAD=$(printf '{"raw_comment":"%s","timeout_ms":30000,"repo":"%s/%s","issue":%s,"post":true}\n' "$BODY_E" "$OWNER_" "$REPO_" "$ISSUE_")
  B64=$(printf '%s' "$JSON_PAYLOAD" | base64 | tr -d '\n')
  ssh $SSH_OPTS "$PI_USER@$PI_HOST" \
    "echo '$B64' | base64 -d | curl -sS -w '\nHTTP %{http_code}\n' -H 'content-type: application/json' -X POST '$PI_URL_/api/codex' --data-binary @-"
}

case "$MODE" in
  probe)
    ssh $SSH_OPTS "$PI_USER@$PI_HOST" "set -x; curl -sS http://127.0.0.1:3000/ | head -n 50; echo '---'; \
      curl -sS http://127.0.0.1:3000/api | head -n 50 || true; echo '---'; \
      curl -sS -i http://127.0.0.1:3000/api/codex -X OPTIONS || true; echo '---'; \
      echo '{}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"prompt\":\"hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"raw\":\"@0x4007 hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"raw_comment\":\"@0x4007 hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"comment\":\"@0x4007 hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true"
    ;;
  curl)
    curl_remote
    ;;
  *)
    echo "Usage: $0 [curl|probe]" >&2
    exit 2
    ;;
esac
