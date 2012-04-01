var net = require('net');

var listen_address = null;

var ports = [
  9100
];

function createServer() {
  var server = net.createServer(function(socket) {
      var size = 0;
      socket.on('data', function(data) {
        size += data.length;
        socket.write(data);
        console.log(data.length + ", " + size);
      });
  });
  return server;
}

for(var index in ports) {
  var port = ports[index];
  var server = createServer();
  server.listen(port, listen_address);
  console.log('Mock echo server running at ' + listen_address + ':' + port);
};

