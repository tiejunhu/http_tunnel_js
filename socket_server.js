var net = require('net');
var http = require('http');

var listen_address = null;
var target_server = '127.0.0.1';
var target_port = 1338;

// local port to remote url mapping
var services = {
  1336: '/service0',
  1337: '/service1'
};

// printers to serve
var printers = {
  "192.168.20.112" : 9100
}

function createServer(request_path) {
  var server = net.createServer(function(socket) {
    var http_request = null;

    socket.on('connect', function() {
      var http_options = {
        host: target_server,
        port: target_port,
        path: request_path,
        headers: { 'Connection': 'keep-alive' },
        method: 'POST'
      };
      http_request = http.request(http_options, function(response) {
        response.pipe(socket);
      });
      // close socket on http error
      http_request.on('error', function() {
        socket.end();
      });
      socket.pipe(http_request);
    });

    // close http on socket close
    socket.on('close', function(had_error) {
      if (http_request) {
        http_request.end();
      }
    });
  });

  return server;
}

function connectPrinter(address, port) {
  var http_options = {
    host: target_server,
    port: target_port,
    path: "/printer/" + address + "_" + port,
    headers: { 'Connection': 'keep-alive' },
    method: 'POST'
  };
  var fullURL = "http://" + target_server + ":" + target_port + http_options.path;

  console.log("Connecting printer " + address + ":" + port + " to " + fullURL);

  var http_request = http.request(http_options, function(response) {
    var socket_client = net.connect(port, address, function() {
      console.log("Connected to printer " + address + ":" + port);
    });

    // on socket close,
    // disconnect current http connection, reconnect
    var socket_client.on('close', function(had_error) {
      if (http_request) {
        http_request.end();
        connectPrinter(address, port);
      }
    });
    response.pipe(socket_client);
  });

  // retry every 1 sec if cannot connect to http server
  http_request.on('error', function() {
    console.log("Error occurs during connection with " + fullURL + ", will retry in 1s.");
    setTimeout(function() {
      connectPrinter(address, port);
    }, 1000);
  });

  http_request.write("ping");
}

for(var port in services) {
  var request_path = services[port];
  var server = createServer(request_path);
  server.listen(port, listen_address);
  console.log('Server running at ' + listen_address + ':' + port + " for http://" + target_server + ":" + target_port + request_path);
};

var index = 0;
for (var address in printers) {
  var port = printers[address];
  connectPrinter(address, port, index);
  index ++;
}