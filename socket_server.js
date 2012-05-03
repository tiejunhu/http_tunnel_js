var config = {
  listen_address: null,
  http_port: 1338,
  http_server: '127.0.0.1',
  target_server: '127.0.0.1',
  // proxy server settings
  use_proxy: false,
  proxy_server: '127.0.0.1',
  proxy_port: 8080,
  // service url to remote port mapping
  services: {
    '/PageCounter': 2055
  },
  // set services2 to map services to different ports on http_server
  // set services2 as null to use above services
  services2: {
    '/PageCounter': 2056,
  }, 
  // printers url to printer ports mapping
  printers: {
    // "127.0.0.1_9100" : 9001
  }
};

var configConfirmed = false;

// ---- config ends

var net = require('net');
var http = require('http');
var log = require('./log');

function fullURL(path) {
  return "http://" + config.http_server + ":" + config.http_port + path;
}

function httpOptions(path) {
  if (config.use_proxy) {
    return {
      host: config.proxy_server,
      port: config.proxy_port,
      path: 'http://' + config.http_server + ":" + config.http_port + path,
      agent: false,
      headers: {
        'Connection': 'keep-alive',
        'Host': config.http_server
      },
      method: 'POST'
    };
  } else {
    return {
      host: config.http_server,
      port: config.http_port,
      path: path,
      agent: false,
      headers: { 'Connection': 'keep-alive' },
      method: 'POST'
    };    
  }
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
        log.error("request to " + fullURL(request_path) + " error.");
        socket.end();
      });
    });
  });

  return server;
}

function connectPrinterToHttpServer(address, port, socket)
{
  var request_path = "/printer/" + address + "_" + port;
  log.info("Connecting printer " + address + ":" + port + " to " + fullURL(request_path));
  var http_request = http.request(httpOptions(request_path), function(response) {
    response.pipe(socket);
    response.on('end', function() {
      log.info("Printer http tunnel response ends, reconnecting.");
      connectPrinter(address, port);
    });
  });

  http_request.on('error', function(e) {
    log.error("Error occurs during connection with " + fullURL(request_path) + ", will retry in 1s. Error is " + e);
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
  var socket_client = net.connect(port, address, function() {
    log.info("Connected to printer " + address + ":" + port);
    connectPrinterToHttpServer(address, port, socket_client);
  });

  socket_client.on('error', function(e) {
    log.info("Connection to printer " + address + ":" + port + " error, reconnect: " + e);
    setTimeout(function() {
      connectPrinter(address, port);
    }, 1000);
  });  
}

var serverStarted = false;
var servers = [];

function startServer() {
  if (serverStarted) {
    return;
  }
  serverStarted = true;

  if (config.services) {
    for(var request_path in config.services) {
      var port = config.services[request_path];
      var server = createServer(request_path);
      server.listen(port, config.listen_address);
      log.info('Server running at ' + config.listen_address + ':' + port + " for " + fullURL(request_path));
      servers.push(server);
    }    
  }

  if (config.printers) {
    for (var address_port in config.printers) {
      var ap = address_port.split('_');
      var address = ap[0];
      var pport = ap[1];
      connectPrinter(address, pport);
    }      
  }
}


function _sendConfig(configCallback) {
  if (configConfirmed) {
    return;
  }

  var request_path = "/config";
  var http_request = http.request(httpOptions(request_path), function(response) {
    response.on('data', function(data) {
      if (data == 'received') {
        configConfirmed = true;
        if (configCallback) {
          configCallback();
        }
      }
    });
  });
  http_request.end(JSON.stringify(config));
  http_request.on('error', function(e) {
    log.error("Error occurs _sending config, will retry in 1s. Error is " + e);
  });
}

var configInterval;

function sendConfig(configCallback) {
  _sendConfig(configCallback);
  configInterval = setInterval(function() {
    _sendConfig(configCallback);
  }, 1000);
}

function start(configCallback) {
  startServer();
  sendConfig(configCallback);  
}

function stop() {
  clearInterval(configInterval);
  for (var index in servers) {
    var server = servers[index];
    server.close();
  }
}

exports.start = start;
exports.stop = stop;
exports.config = config;

// run alone
if (!module.parent) {
  start();
}