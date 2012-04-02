var config = {
  listen_address: null,
  http_port: 1338,
  http_server: '127.0.0.1',
  target_server: '127.0.0.1',
  // service url to remote port mapping
  services: {
    '/service0': 1336,
    '/service1': 1337
  },
  // set services2 to map services to different ports on http_server
  // set services2 as null to use above services
  services2: {
    '/service0': 1338,
    '/service1': 1339
  }, 
  // printers url to printer ports mapping
  printers: {
    "127.0.0.1_9100" : 9001
  }
}

var configConfirmed = false;

// ---- config ends

var net = require('net');
var http = require('http');

function fullURL(path) {
  return "http://" + config.http_server + ":" + config.http_port + path;
}

function httpOptions(path) {
  return {
    host: config.http_server,
    port: config.http_port,
    path: path,
    agent: false,
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
  });

  return server;
}

function connectPrinterToHttpServer(address, port, socket)
{
  var request_path = "/printer/" + address + "_" + port;
  console.log("Connecting printer " + address + ":" + port + " to " + fullURL(request_path));
  var http_request = http.request(httpOptions(request_path), function(response) {
    response.pipe(socket);
    response.on('end', function() {
      console.log("Printer http tunnel response ends, reconnecting.");
      connectPrinterToHttpServer(address, port, socket);
    });
  });

  http_request.on('error', function(e) {
    console.log("Error occurs during connection with " + fullURL(request_path) + ", will retry in 1s. Error is " + e);
    configConfirmed = false;
    setTimeout(function() {
      connectPrinterToHttpServer(address, port, socket);
    }, 1000);
  });

  http_request.write("ping");
  setInterval(function() {
    http_request.write("ping");
  }, 1000);
}

function connectPrinter(address, port) {
  socket_client = net.connect(port, address, function() {
    console.log("Connected to printer " + address + ":" + port);
    connectPrinterToHttpServer(address, port, socket_client);
  });

  socket_client.on('error', function(e) {
    console.log("Connection to printer " + address + ":" + port + " error, reconnect: " + e);
    setTimeout(function() {
      connectPrinter(address, port);
    }, 1000);
  });  
}

var serverStarted = false;

function startServer() {
  if (serverStarted) {
    return;
  }
  serverStarted = true;

  for(var request_path in config.services) {
    var port = config.services[request_path];
    var server = createServer(request_path);
    server.listen(port, config.listen_address);
    console.log('Server running at ' + config.listen_address + ':' + port + " for " + fullURL(request_path));
  };

  for (var address_port in config.printers) {
    var ap = address_port.split('_');
    var address = ap[0];
    var port = ap[1];
    connectPrinter(address, port);
  }  
}


function _sendConfig() {
  if (configConfirmed) {
    return;
  }

  var request_path = "/config"
  var http_request = http.request(httpOptions(request_path), function(response) {
    response.on('data', function(data) {
      if (data == 'received') {
        configConfirmed = true;
      }
    })
  });
  // http_request.setEncoding('utf8');
  http_request.write(JSON.stringify(config));
  http_request.on('error', function(e) {
    console.log("Error occurs _sending config, will retry in 1s. Error is " + e);
  });
  return http_request;  
}

function sendConfig() {
  _sendConfig();
  setInterval(function() {
    _sendConfig();
  }, 100);
}

startServer();
sendConfig();
