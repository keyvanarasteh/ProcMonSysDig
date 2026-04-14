const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8091');

ws.on('open', function open() {
  console.log('connected... sending GET_PROCESS_TREE and closing immediately!');
  ws.send(JSON.stringify({command: 'GET_PROCESS_TREE'}));
  ws.close();
});
