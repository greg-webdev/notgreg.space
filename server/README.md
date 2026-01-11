Python aiohttp realtime server for Sync Tower

This server reduces Firestore load by handling realtime heartbeats and lobby state in-memory.

Requirements

- Python 3.10+ recommended

Install

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Run

```bash
# default port 3000
PORT=3000 python app.py
```

Endpoints

- HTTP GET `/lobbies/:lobbyId` -> { level }
- HTTP POST `/lobbies/:lobbyId` with JSON { level: <int> } -> updates lobby level (if greater or equal)
- WebSocket `/ws`: send JSON messages:
  - `{ type: 'join', lobby: 'global', playerId: 'uid' }`
  - `{ type: 'heartbeat', x, y, color, level, ts }`
  - `{ type: 'leave', lobby, playerId }`

Server broadcasts messages of shape:
- `{ type: 'lobby', level }` (initial lobby state)
- `{ type: 'players', players: [ { id, x, y, color, level, ts } ], level }`

Notes

- State is in-memory; use Redis or a DB for persistence / multi-instance.
- Use a reverse proxy (nginx) and TLS in production.
- This server is intentionally simple and lightweight.
