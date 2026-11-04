#!/usr/bin/env bash
# Block until the user presses "Send to AI" on the given screen, then print
# that round's events (one JSON object per line).
#
# Usage: wait-for-submit.sh <state_dir> <screen-file-name> [--timeout <seconds>]
#
# Exit codes: 0 = submitted, 1 = timed out, 2 = server stopped, 64 = bad usage.

set -u

STATE_DIR="${1:-}"
SCREEN="${2:-}"
TIMEOUT=1800
shift 2 2>/dev/null || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout) TIMEOUT="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 64 ;;
  esac
done

if [[ -z "$STATE_DIR" || -z "$SCREEN" || ! -d "$STATE_DIR" ]]; then
  echo "Usage: wait-for-submit.sh <state_dir> <screen-file-name> [--timeout <seconds>]" >&2
  exit 64
fi

SCREEN="$(basename "$SCREEN")"
EVENTS="$STATE_DIR/events"
deadline=$(( $(date +%s) + TIMEOUT ))

# Matching on the screen name keeps a stale submit from the previous round
# (written before the server archived it) from ending the wait early.
while (( $(date +%s) < deadline )); do
  if [[ -f "$EVENTS" ]] && grep -F '"type":"submit"' "$EVENTS" | grep -qF "\"screen\":\"$SCREEN\""; then
    cat "$EVENTS"
    exit 0
  fi
  if [[ -f "$STATE_DIR/server-stopped" ]]; then
    echo "server-stopped: $(cat "$STATE_DIR/server-stopped")" >&2
    exit 2
  fi
  sleep 1
done

echo "timeout: no submit on $SCREEN after ${TIMEOUT}s" >&2
[[ -f "$EVENTS" ]] && cat "$EVENTS"
exit 1
