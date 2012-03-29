var net = require('net');

var listen_address = null;

var ports = [
  1339
];

function createServer() {
  var server = net.createServer(function(socket) {
      socket.pipe(socket);
  });
  return server;
}

for(var index in ports) {
  var port = ports[index];
  var server = createServer();
  server.listen(port, listen_address);
  console.log('Mock echo server running at ' + listen_address + ':' + port);
};

