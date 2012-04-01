var config = {
  listen_address: null,
  target_port: 1338,
  target_server: '127.0.0.1',
  // service url to remote port mapping
  services: {
    1336: '/service0',
    1337: '/service1'
  }, 
  // printers url to printer ports mapping
  printers: {
    "127.0.0.1" : 9100
  }
}

// ---- config ends

var net = require('net');
var http = require('http');

function fullURL(path) {
  return "http://" + config.target_server + ":" + config.target_port + path;
}

function httpOptions(path) {
  return {
    host: config.target_server,
    port: config.target_port,
    path: path,
    headers: { 'Connection': 'keep-alive' },
    method: 'POST'
  };
}

function createServer(request_path) {
  var server = net.createServer(function(socket) {
    var http_request = null;

    socket.on('connect', function() {
      http_request = http.request(httpOptions(request_path), function(response) {
        response.pipe(socket); // this will close socket on response ends
      });
      socket.pipe(http_request);
      
      // close socket on http error
      http_request.on('error', function() {
        console.log("request to " + fullURL(request_path) + " error.");
        socket.end();
      });

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
  var request_path = "/printer/" + address + "_" + port;

  console.log("Connecting printer " + address + ":" + port + " to " + fullURL(request_path));

  var http_request = http.request(httpOptions(request_path), function(response) {
    // connect the printer to pass the data

    var socket_client = null;
    var length = 0;

    response.on('data', function(buffer) {
        length += buffer.length;
        if (socket_client) {
          socket_client.write(buffer);
        } else {
          socket_client = net.connect(port, address, function() {
            console.log("Connected to printer " + address + ":" + port);
            socket_client.write(buffer);
          });
        }
    });

    response.on('end', function() {
      console.log("Printer http tunnel response ends, disconnect printer socket, reconnect the tunnel. total bytes: " + length);
      if (socket_client) {
        socket_client.end();
      }
      connectPrinter(address, port);
    });

    response.on('close', function() {
      console.log("Printer http tunnel closed, reconnect. total bytes: " + length);
      if (socket_client) {
        socket_client.end();
      }
      connectPrinter(address, port);
    });

  });


  // retry every 1 sec if cannot connect to http server
  http_request.on('error', function(e) {
    console.log("Error occurs during connection with " + fullURL(request_path) + ", will retry in 1s. Error is " + e);
    setTimeout(function() {
      connectPrinter(address, port);
    }, 1000);
  });

  http_request.write("ping");
  setInterval(function() {
    http_request.write("ping");
  }, 1000);
}

for(var port in config.services) {
  var request_path = config.services[port];
  var server = createServer(request_path);
  server.listen(port, config.listen_address);
  console.log('Server running at ' + config.listen_address + ':' + port + " for " + fullURL(request_path));
};

var index = 0;
for (var address in config.printers) {
  var port = config.printers[address];
  connectPrinter(address, port, index);
  index ++;
}