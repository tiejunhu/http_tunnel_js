var net = require('net');

var config = {
  listen_address: null,
  port: 9100
};

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

var server;

function start(callback) {
  server = createServer();
  server.listen(config.port, config.listen_address, function() {
    if (callback) {
      callback();
    }
  });
  console.log('Mock echo server running at ' + config.listen_address + ':' + config.port);
}

function stop(callback) {
  server.close();
  if (callback) {
    callback();
  }  
}

exports.start = start;
exports.stop = stop;
exports.config = config;

// run alone
if (!module.parent) {
  start();
}
