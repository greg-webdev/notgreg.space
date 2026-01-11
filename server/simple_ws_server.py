#!/usr/bin/env python3
"""
Minimal WebSocket broadcast server using the `websockets` library.
- Accepts JSON messages of form {"type":"join"|"heartbeat"|"leave","lobby":"...","id":"...","x":num,"y":num}
- Broadcasts aggregated player snapshots to all connected clients at BROADCAST_HZ (default 100).
Run: `BROADCAST_HZ=100 PORT=3000 python simple_ws_server.py`
"""
import asyncio
import json
import os
import signal
from collections import defaultdict
import websockets

PORT = int(os.environ.get('PORT', '3000'))
BROADCAST_HZ = int(os.environ.get('BROADCAST_HZ', '100'))

# In-memory lobbies: lobby_id -> {players: {id: {x,y,ts}}}
lobbies = defaultdict(lambda: {'players': {}})
clients = set()

async def handler(ws, path):
    clients.add(ws)
    try:
        async for msg in ws:
            try:
                data = json.loads(msg)
            except Exception:
                continue
            t = data.get('type')
            lobby = data.get('lobby', 'global')
            pid = data.get('id')
            if t == 'join' and pid:
                l = lobbies[lobby]
                l['players'][pid] = {'x': data.get('x',0), 'y': data.get('y',0), 'ts': data.get('ts') or asyncio.get_event_loop().time()}
            elif t == 'heartbeat' and pid:
                l = lobbies[lobby]
                l['players'][pid] = {'x': data.get('x',0), 'y': data.get('y',0), 'ts': data.get('ts') or asyncio.get_event_loop().time()}
            elif t == 'leave' and pid:
                l = lobbies[lobby]
                if pid in l['players']:
                    del l['players'][pid]
    finally:
        clients.discard(ws)

async def broadcaster():
    interval = 1.0 / max(1, BROADCAST_HZ)
    while True:
        if clients:
            now = asyncio.get_event_loop().time()
            payload = {}
            for lid, lobby in lobbies.items():
                # remove stale players (5s)
                stale = [pid for pid, p in lobby['players'].items() if now - p.get('ts', now) > 5]
                for pid in stale:
                    del lobby['players'][pid]
                payload[lid] = list(lobby['players'].items())
            if payload:
                msg = json.dumps({'type': 'snapshot', 'lobbies': payload})
                await asyncio.gather(*[c.send(msg) for c in list(clients) if not c.closed], return_exceptions=True)
        await asyncio.sleep(interval)

async def main():
    stop = asyncio.Event()

    async def _stop():
        stop.set()

    loop = asyncio.get_event_loop()
    loop.add_signal_handler(signal.SIGINT, lambda: asyncio.ensure_future(_stop()))
    loop.add_signal_handler(signal.SIGTERM, lambda: asyncio.ensure_future(_stop()))

    server = await websockets.serve(handler, '0.0.0.0', PORT, max_size=2**20)
    print(f"WebSocket server listening on :{PORT}, broadcast {BROADCAST_HZ} Hz")
    bg = asyncio.create_task(broadcaster())
    await stop.wait()
    bg.cancel()
    server.close()
    await server.wait_closed()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
