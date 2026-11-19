#!/usr/bin/env bash
# Runs the real-model cases against a throwaway dev server on port 3801.
# The provider key is typed at a hidden prompt, lives only in this process's
# environment, and is never written to a file or printed.
#
#   bash scripts/run-real-model.sh [model]            chat, stream, failover,
#                                                     delegation, skills; writes
#                                                     docs/spikes/real-model-run.md
#   bash scripts/run-real-model.sh --tools [model]    the approval-gated tool
#                                                     loop (OPENBOT_TOOLS=1):
#                                                     lookup, approve, deny
#   bash scripts/run-real-model.sh --wave3 [model]    wave 3 paths: a routine's
#                                                     Run now (own thread), the
#                                                     automation route with its
#                                                     token, and a crew turn
#                                                     with two @mentions. Uses
#                                                     a throwaway data dir too;
#                                                     OPENBOT_WAVE3_REPORT=<path>
#                                                     also writes the report.
#   bash scripts/run-real-model.sh --tools --dry-run  the same scenario against
#                                                     a scripted provider; no
#                                                     server, no key, no network
#
# The tools run uses a throwaway OPENBOT_DATA_DIR (never ~/.openbot), removed
# at the end. Its report goes to stdout; set OPENBOT_TOOLS_REPORT=<path> to
# also write it to a file. Use a model that takes native tools; otherwise the
# lookup step fails with the reason tools_unavailable. Exit 0 = every step
# passed, 1 = a step failed (reason tag in the output), 2 = nothing ran.
set -euo pipefail
cd "$(dirname "$0")/.."

# The run needs Node >= 24.15 (see .nvmrc); use the nvm one if present.
NODE24="$(ls -d "$HOME"/.nvm/versions/node/v24.* 2>/dev/null | sort -V | tail -1)"
[ -n "$NODE24" ] && export PATH="$NODE24/bin:$PATH"
NODE_RUN=(node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON)

TOOLS=0
WAVE3=0
DRY=0
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --tools) TOOLS=1 ;;
    --wave3) WAVE3=1 ;;
    --dry-run) DRY=1 ;;
    *) ARGS+=("$arg") ;;
  esac
done
if [ "$DRY" = 1 ]; then
  [ "$TOOLS" = 1 ] || { echo "--dry-run only applies to --tools." >&2; exit 2; }
  exec "${NODE_RUN[@]}" scripts/real-model-tools-run.mjs --dry-run
fi

MODEL="${ARGS[0]:-google/gemma-4-31b-it:free}"
PORT=3801
LOG=/tmp/oc-run-$PORT.log
DATA_DIR=""
if [ "$TOOLS" = 1 ] && [ "$WAVE3" = 1 ]; then
  echo "Pick one of --tools and --wave3." >&2; exit 2
fi
if [ "$WAVE3" = 1 ]; then
  DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/openbot-wave3-run.XXXXXX")"
  export OPENBOT_DATA_DIR="$DATA_DIR"
  trap 'rm -rf "$DATA_DIR"' EXIT
fi
if [ "$TOOLS" = 1 ]; then
  # Not secret, so plain exports; the key itself never goes through argv.
  DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/openbot-tools-run.XXXXXX")"
  export OPENBOT_TOOLS=1 OPENBOT_DATA_DIR="$DATA_DIR"
  trap 'rm -rf "$DATA_DIR"' EXIT
fi

if lsof -iTCP:$PORT -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "Port $PORT is already in use; stop that process first." >&2
  exit 2
fi

read -r -s -p "Chave OpenRouter: " KEY
echo
[ -n "$KEY" ] || { echo "Empty key; nothing was started." >&2; exit 2; }

ROUTER_URL=https://openrouter.ai/api/v1 ROUTER_MODEL="$MODEL" ROUTER_API_KEY="$KEY" \
  npx next dev -H 127.0.0.1 -p $PORT >"$LOG" 2>&1 &
SERVER=$!
unset KEY
trap 'kill $SERVER 2>/dev/null || true; [ -z "$DATA_DIR" ] || rm -rf "$DATA_DIR"' EXIT

for _ in $(seq 1 90); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 1
done
curl -s -o /dev/null "http://127.0.0.1:$PORT/" || { echo "Server did not start; see $LOG" >&2; exit 2; }

echo "Model: $MODEL"
if [ "$TOOLS" = 1 ]; then
  # No `exec`: the EXIT trap must still stop the server and remove the data dir.
  OPENBOT_RUN_URL="http://127.0.0.1:$PORT" "${NODE_RUN[@]}" \
    scripts/real-model-tools-run.mjs ${OPENBOT_TOOLS_REPORT:+"$OPENBOT_TOOLS_REPORT"}
elif [ "$WAVE3" = 1 ]; then
  OPENBOT_RUN_URL="http://127.0.0.1:$PORT" "${NODE_RUN[@]}" \
    scripts/real-model-wave3-run.mjs ${OPENBOT_WAVE3_REPORT:+"$OPENBOT_WAVE3_REPORT"}
else
  OPENBOT_RUN_URL="http://127.0.0.1:$PORT" "${NODE_RUN[@]}" \
    scripts/real-model-run.mjs docs/spikes/real-model-run.md
fi
