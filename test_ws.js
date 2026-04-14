const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8091');

ws.on('open', function open() {
  console.log('connected');
  ws.send(JSON.stringify({command: 'START', filter: ''}));
});

ws.on('message', function message(data) {
  console.log('received item length: ' + data.length);
  // Do not exit, keep listening to see if it disconnects
});

ws.on('close', function close() {
  console.log('disconnected!!!');
  process.exit(1);
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});
