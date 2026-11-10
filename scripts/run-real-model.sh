#!/usr/bin/env bash
# Runs the real-model cases against a throwaway dev server on port 3801.
# The provider key is typed at a hidden prompt, lives only in this process's
# environment, and is never written to a file or printed.
#
#   bash scripts/run-real-model.sh [model]
set -euo pipefail
cd "$(dirname "$0")/.."

# The run needs Node >= 22.6 (--experimental-strip-types); use the nvm one if present.
NODE22="$(ls -d "$HOME"/.nvm/versions/node/v22.* 2>/dev/null | sort -V | tail -1)"
[ -n "$NODE22" ] && export PATH="$NODE22/bin:$PATH"
MODEL="${1:-google/gemma-4-31b-it:free}"
PORT=3801
LOG=/tmp/oc-run-$PORT.log

if lsof -iTCP:$PORT -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "Port $PORT is already in use; stop that process first." >&2
  exit 2
fi

read -r -s -p "Chave OpenRouter: " KEY
echo
[ -n "$KEY" ] || { echo "Empty key; nothing was started." >&2; exit 2; }

ROUTER_URL=https://openrouter.ai/api/v1 ROUTER_MODEL="$MODEL" ROUTER_API_KEY="$KEY" \
  npx next dev -p $PORT >"$LOG" 2>&1 &
SERVER=$!
unset KEY
trap 'kill $SERVER 2>/dev/null || true' EXIT

for _ in $(seq 1 90); do
  curl -s -o /dev/null "http://localhost:$PORT/" && break
  sleep 1
done
curl -s -o /dev/null "http://localhost:$PORT/" || { echo "Server did not start; see $LOG" >&2; exit 2; }

echo "Model: $MODEL"
OPENBOT_RUN_URL="http://localhost:$PORT" node --experimental-strip-types \
  --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
  scripts/real-model-run.mjs docs/spikes/real-model-run.md
