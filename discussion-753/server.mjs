import websockify from '@maximegris/node-websockify';
websockify({ source: '127.0.0.1:8080', target: 'localhost:5037', web: '.' });
