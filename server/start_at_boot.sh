#!/usr/bin/env bash
# Minimal startup script for simple_ws_server.py
# Intended to be called by system startup (cron @reboot or systemd)
# It activates the repo venv and execs the server in foreground.

set -euo pipefail
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$BASE_DIR/.venv"
PY="$VENV/bin/python"

if [ ! -d "$VENV" ]; then
  echo "Virtualenv not found at $VENV; creating and installing requirements"
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --upgrade pip setuptools wheel
  "$VENV/bin/pip" install -r "$BASE_DIR/requirements.txt"
fi

# ensure python exists
if [ ! -x "$PY" ]; then
  echo "Python not found in venv at $PY" >&2
  exit 2
fi

# Optional: set port and broadcast hz via env
PORT="${PORT:-2343}"
BROADCAST_HZ="${BROADCAST_HZ:-100}"

echo "Starting simple_ws_server.py on port $PORT (broadcast $BROADCAST_HZ)"
export PORT BROADCAST_HZ
exec "$PY" "$BASE_DIR/simple_ws_server.py"
