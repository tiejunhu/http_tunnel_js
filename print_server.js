var net = require('net');

var config = {
  listen_address: null,
  port: 9100,
  callback: null
};

function createServer() {
  var server = net.createServer(function(socket) {
      var size = 0;
      socket.on('data', function(data) {
        size += data.length;
      });
      socket.on('end', function() {
        if (config.callback) {
          config.callback(size);
        }
      });
  });
  return server;
}

var server;

function start(listen_callback) {
  server = createServer();
  server.listen(config.port, config.listen_address, function() {
    if (listen_callback) {
      listen_callback();
    }
  });
}

function stop() {
  server.close();
}

exports.start = start;
exports.stop = stop;
exports.config = config;

// run alone
if (!module.parent) {
  start();
}
