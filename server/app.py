import asyncio
import json
from aiohttp import web, WSMsgType

# In-memory lobbies store
# lobbies: { lobbyId: { 'level': int, 'players': { playerId: {x,y,color,level,ts,ws} } } }
lobbies = {}

def ensure_lobby(lobby_id):
    if lobby_id not in lobbies:
        lobbies[lobby_id] = {'level': 1, 'players': {}}
    return lobbies[lobby_id]

async def get_lobby(request):
    lid = request.match_info['lobbyId']
    lobby = ensure_lobby(lid)
    return web.json_response({'level': lobby['level']})

async def post_lobby(request):
    lid = request.match_info['lobbyId']
    data = await request.json()
    level = data.get('level')
    if not isinstance(level, int):
        return web.json_response({'error': 'level must be an integer'}, status=400)
    lobby = ensure_lobby(lid)
    if level >= lobby['level']:
        lobby['level'] = level
    return web.json_response({'level': lobby['level']})

async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)

    current = {'lobby': None, 'player': None}

    async for msg in ws:
        if msg.type == WSMsgType.TEXT:
            try:
                data = json.loads(msg.data)
            except Exception:
                continue

            t = data.get('type')
            if t == 'join' and data.get('lobby') and data.get('playerId'):
                lid = str(data['lobby'])
                pid = str(data['playerId'])
                current['lobby'] = lid
                current['player'] = pid
                lobby = ensure_lobby(lid)
                lobby['players'][pid] = {'x':0,'y':0,'color':'#fff','level':lobby['level'],'ts':int(asyncio.get_event_loop().time()*1000),'ws':ws}
                # send initial lobby state
                await ws.send_json({'type':'lobby','level':lobby['level']})
                await broadcast_players(lid)
            elif t == 'heartbeat' and current['lobby'] and current['player']:
                lid = current['lobby']
                pid = current['player']
                lobby = ensure_lobby(lid)
                player = lobby['players'].get(pid, {})
                player.update({
                    'x': int(data.get('x', 0)),
                    'y': int(data.get('y', 0)),
                    'color': data.get('color', player.get('color', '#fff')),
                    'level': int(data.get('level', lobby['level'])),
                    'ts': int(asyncio.get_event_loop().time()*1000),
                    'ws': ws
                })
                lobby['players'][pid] = player
                if isinstance(data.get('level'), int) and data['level'] > lobby['level']:
                    lobby['level'] = data['level']
                await broadcast_players(lid)
            elif t == 'leave' and current['lobby'] and current['player']:
                lid = current['lobby']
                pid = current['player']
                lobby = lobbies.get(lid)
                if lobby and pid in lobby['players']:
                    del lobby['players'][pid]
                    await broadcast_players(lid)
        elif msg.type == WSMsgType.ERROR:
            print('ws connection closed with exception %s' % ws.exception())

    # cleanup on close
    if current['lobby'] and current['player']:
        lobby = lobbies.get(current['lobby'])
        if lobby and current['player'] in lobby['players']:
            del lobby['players'][current['player']]
            await broadcast_players(current['lobby'])
    return ws

async def broadcast_players(lobby_id):
    lobby = lobbies.get(lobby_id)
    if not lobby: return
    snapshot = []
    for pid, p in list(lobby['players'].items()):
        # remove dead websockets
        w = p.get('ws')
        if not w or w.closed:
            try:
                del lobby['players'][pid]
            except Exception:
                pass
            continue
        snapshot.append({'id': pid, 'x': p.get('x',0), 'y': p.get('y',0), 'color': p.get('color','#fff'), 'level': p.get('level', lobby['level']), 'ts': p.get('ts')})
    payload = {'type': 'players', 'players': snapshot, 'level': lobby['level']}
    dead = []
    for pid, p in list(lobby['players'].items()):
        w = p.get('ws')
        try:
            if w and not w.closed:
                await w.send_json(payload)
        except Exception:
            dead.append(pid)
    for pid in dead:
        try:
            del lobby['players'][pid]
        except Exception:
            pass

async def cleanup_task():
    while True:
        now = int(asyncio.get_event_loop().time()*1000)
        for lid, lobby in list(lobbies.items()):
            changed = False
            for pid, p in list(lobby['players'].items()):
                if now - int(p.get('ts', now)) > 30000:
                    try:
                        del lobby['players'][pid]
                        changed = True
                    except Exception:
                        pass
            if changed:
                await broadcast_players(lid)
        await asyncio.sleep(10)

async def on_startup(app):
    app['cleanup'] = app.loop.create_task(cleanup_task())

async def on_cleanup(app):
    app['cleanup'].cancel()
    await app['cleanup']

app = web.Application()
app.router.add_get('/lobbies/{lobbyId}', get_lobby)
app.router.add_post('/lobbies/{lobbyId}', post_lobby)
app.router.add_get('/ws', ws_handler)
app.on_startup.append(on_startup)
app.on_cleanup.append(on_cleanup)

if __name__ == '__main__':
    web.run_app(app, port=int(__import__('os').environ.get('PORT', 3000)))
