#!/usr/bin/env python
import json
import os
import socketio
from aiohttp import web


# Set up server
sio = socketio.AsyncServer(logger=True, engineio_logger=True,
                           async_mode='aiohttp')
app = web.Application()
STATIC_PATH = os.path.join(os.path.dirname(__file__), 'static')
app.router.add_static('/static/', STATIC_PATH, name='static')
sio.attach(app, socketio_path='socket.io')


# Set up redirects
async def root_handler(request):
    raise web.HTTPFound('/static/map.html')
app.router.add_get('/', root_handler)


# Configure events
@sio.on('connect')
async def connection(sid, environ, auth):
    print(f'user connected: {sid}')


@sio.on('disconnect')
async def disconnection(sid):
    print(f'user disconnected: {sid}')


@sio.on('update')
async def update(sid, data):
    values = json.loads(data)
    center = values['center']
    zoom = values['zoom']
    markers = values['markers']

    message = {
        "center": center,
        "zoom": zoom,
        "markers": markers
    }
    await sio.emit('update', message)


if __name__ == '__main__':
    web.run_app(app)
