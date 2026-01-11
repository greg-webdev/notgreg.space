#!/usr/bin/env bash
set -euo pipefail

# Lightweight launcher for the simple WebSocket server
# Usage:
#   ./run_server.sh run      -> run in foreground
#   ./run_server.sh daemon   -> run in background (nohup)
#   ./run_server.sh stop     -> stop background daemon started with 'daemon'

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$BASE_DIR/.venv"
REQ="$BASE_DIR/requirements.txt"
PY="$VENV/bin/python"
PIP="$VENV/bin/pip"

# defaults
PORT_DEFAULT=6942
BROADCAST_HZ_DEFAULT=100

if [ ! -d "$VENV" ]; then
  echo "Creating virtualenv at $VENV"
  python3 -m venv "$VENV"
fi

# ensure pip/tools
"$PIP" install --upgrade pip setuptools wheel >/dev/null
# install requirements
"$PIP" install -r "$REQ"

PORT="${PORT:-$PORT_DEFAULT}"
BROADCAST_HZ="${BROADCAST_HZ:-$BROADCAST_HZ_DEFAULT}"

case "${1:-run}" in
  run)
    echo "Starting simple WebSocket server in foreground: PORT=$PORT BROADCAST_HZ=$BROADCAST_HZ"
    PORT="$PORT" BROADCAST_HZ="$BROADCAST_HZ" "$PY" "$BASE_DIR/simple_ws_server.py"
    ;;
  daemon)
    echo "Starting simple WebSocket server in background"
    mkdir -p "$BASE_DIR/logs"
    nohup env PORT="$PORT" BROADCAST_HZ="$BROADCAST_HZ" "$PY" "$BASE_DIR/simple_ws_server.py" > "$BASE_DIR/logs/server.out" 2>&1 &
    echo $! > "$BASE_DIR/server.pid"
    echo "Started with PID $(cat $BASE_DIR/server.pid)"
    ;;
  stop)
    if [ -f "$BASE_DIR/server.pid" ]; then
      PID=$(cat "$BASE_DIR/server.pid")
      echo "Stopping PID $PID"
      kill "$PID" && rm -f "$BASE_DIR/server.pid"
      echo "Stopped"
    else
      echo "No PID file found in $BASE_DIR/server.pid"
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 [run|daemon|stop]"
    exit 2
    ;;
esac

