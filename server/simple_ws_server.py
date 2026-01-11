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
import subprocess

try:
    import psutil
except Exception:
    psutil = None

PORT = int(os.environ.get('PORT', '2343'))
BROADCAST_HZ = int(os.environ.get('BROADCAST_HZ', '15'))
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'gregbloxd@gmail.com')

# In-memory lobbies: lobby_id -> {players: {id: {x,y,ts}}}
lobbies = defaultdict(lambda: {'players': {}})
clients = set()
ws_player_map = {}  # websocket -> (lobby, pid)

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
                # store extra fields if provided (email, color, level)
                l['players'][pid] = {
                    'x': data.get('x', 0),
                    'y': data.get('y', 0),
                    'name': data.get('name') or None,
                    'email': data.get('email') or data.get('by_email') or None,
                    'color': data.get('color') or None,
                    'level': data.get('level') or 1,
                    'ts': data.get('ts') or asyncio.get_event_loop().time()
                }
                ws_player_map[ws] = (lobby, pid)
            elif t == 'heartbeat' and pid:
                l = lobbies[lobby]
                l['players'][pid] = {
                    'x': data.get('x', 0),
                    'y': data.get('y', 0),
                    'name': data.get('name') or None,
                    'email': data.get('email') or data.get('by_email') or None,
                    'color': data.get('color') or None,
                    'level': data.get('level') or 1,
                    'ts': data.get('ts') or asyncio.get_event_loop().time()
                }
                ws_player_map[ws] = (lobby, pid)
            elif t == 'kick':
                # admin-triggered kick: requires requester to be admin
                target = data.get('target')
                target_lobby = data.get('lobby')
                # determine requester email (prefer stored player email)
                requester_email = None
                if ws in ws_player_map:
                    req_lobby, req_pid = ws_player_map[ws]
                    req_player = lobbies.get(req_lobby, {}).get('players', {}).get(req_pid, {})
                    requester_email = req_player.get('email')
                if not requester_email:
                    requester_email = data.get('by_email')
                if requester_email == ADMIN_EMAIL and target:
                    # remove target player from specified lobby or search all lobbies
                    removed = False
                    if target_lobby:
                        l = lobbies.get(target_lobby)
                        if l and target in l['players']:
                            try:
                                del l['players'][target]
                                removed = True
                            except Exception:
                                pass
                    else:
                        for lid, l in lobbies.items():
                            if target in l['players']:
                                try:
                                    del l['players'][target]
                                    removed = True
                                    break
                                except Exception:
                                    pass
                    # also try to find a websocket for the kicked player and close it
                    for w, (wl, wp) in list(ws_player_map.items()):
                        if wp == target:
                            try:
                                await w.close(code=4000, reason='kicked')
                            except Exception:
                                pass
                            try:
                                del ws_player_map[w]
                            except Exception:
                                pass
                    if removed:
                        # broadcast a small event informing clients (snapshot loop will reflect removal)
                        try:
                            notice = json.dumps({'type': 'kicked', 'target': target})
                            await asyncio.gather(*[c.send(notice) for c in list(clients) if not c.closed], return_exceptions=True)
                        except Exception:
                            pass
            elif t == 'leave' and pid:
                l = lobbies[lobby]
                if pid in l['players']:
                    del l['players'][pid]
                    # clear mapping for this websocket if it matches
                    if ws in ws_player_map and ws_player_map[ws][1] == pid:
                        del ws_player_map[ws]
    finally:
        # on disconnect, remove associated player from lobby if any
        clients.discard(ws)
        if ws in ws_player_map:
            lobby, pid = ws_player_map.pop(ws)
            l = lobbies.get(lobby)
            if l and pid in l['players']:
                try:
                    del l['players'][pid]
                except Exception:
                    pass

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
            # gather simple server metrics
            def get_metrics():
                metrics = {}
                try:
                    if psutil:
                        metrics['cpu_pct'] = psutil.cpu_percent(interval=None)
                        vm = psutil.virtual_memory()
                        metrics['mem_pct'] = round(vm.percent, 1)
                    else:
                        # fallback: use loadavg and /proc/meminfo
                        try:
                            load1 = os.getloadavg()[0]
                            cpu_count = os.cpu_count() or 1
                            metrics['cpu_pct'] = round((load1 / cpu_count) * 100, 1)
                        except Exception:
                            metrics['cpu_pct'] = None
                        try:
                            meminfo = {}
                            with open('/proc/meminfo', 'r') as f:
                                for line in f:
                                    k, v = line.split(':')
                                    meminfo[k.strip()] = int(v.split()[0])
                            total = meminfo.get('MemTotal')
                            avail = meminfo.get('MemAvailable') if 'MemAvailable' in meminfo else meminfo.get('MemFree')
                            if total and avail:
                                used_pct = round((1 - (avail / total)) * 100, 1)
                                metrics['mem_pct'] = used_pct
                            else:
                                metrics['mem_pct'] = None
                        except Exception:
                            metrics['mem_pct'] = None
                    # GPU via nvidia-smi if available
                    try:
                        out = subprocess.check_output(['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'], stderr=subprocess.DEVNULL)
                        line = out.decode().strip().split('\n')[0]
                        if line:
                            parts = [p.strip() for p in line.split(',')]
                            metrics['gpu_util_pct'] = float(parts[0])
                            metrics['gpu_mem_used'] = float(parts[1])
                            metrics['gpu_mem_total'] = float(parts[2])
                        else:
                            metrics['gpu_util_pct'] = None
                    except Exception:
                        metrics['gpu_util_pct'] = None
                except Exception:
                    metrics = {'cpu_pct': None, 'mem_pct': None, 'gpu_util_pct': None}
                return metrics

            server_metrics = get_metrics()
            if payload:
                msg = json.dumps({'type': 'snapshot', 'lobbies': payload, 'server': server_metrics})
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
