var config = {
  listen_address: null,
  listen_port: 1338,

  target_server: null,
  services: null, 
  printers: null,
  received: false
};

// ---- config ends

var http = require('http');
var net = require('net');

var printer_regex = "/printer/(.*)";

var printServers = {};
var printServersSockets = {};
var printServersQueue = {};

function callServePrinterAsync(printer, request, response)
{
  process.nextTick(function tickServePrinter() {
    servePrinter(printer, request, response);
  });  
}

function servePrinter(printer, request, response) {
  if (printServersQueue[printer] === null) {
    callServePrinterAsync(printer, request, response);
    return;
  }

  var buffer = printServersQueue[printer].shift();
  if (typeof buffer == 'undefined') {
    callServePrinterAsync(printer, request, response);
    return;
  }

  if (buffer === null) {
    response.end();
  } else {
    response.write(buffer);
    callServePrinterAsync(printer, request, response);
  }
}

function stopPrintServers()
{
  for (var key in printServers) {
    var server = printServers[key];
    server.close();
    var socket = printServersSockets[key];
    socket.end();

    printServers[key] = null;
    printServersSockets[key] = null;
    printServersQueue[key] = [];
  }  
}

function startPrintServers()
{
  for (var key in config.printers) {
    var port = config.printers[key];
    var server = net.createServer(function(socket) {
      if (printServersSockets[key]) {
        socket.end();
        return;
      }
      printServersSockets[key] = socket;
      printServersQueue[key] = [];
      socket.on('data', function(buffer) {
        printServersQueue[key].push(buffer);
      });
      socket.on('end', function() {
        printServersSockets[key] = null;
        printServersQueue[key].push(null);
      });
    });
    server.listen(port, config.listen_address);
    printServers[key] = server;
  }  
}

function restartPrintServers()
{
  stopPrintServers();
  startPrintServers();
}

function serveSocket(request, response) {
  var port = config.services[request.url];
  if (port) {
    var socket_client = net.connect(port, config.target_server, function() {
      console.log("Serving " + request.url + " to " + config.target_server + ":" + port);
    });

    // end response if cannot connect to remote
    socket_client.on('error', function() {
      console.log("cannot connect to " + config.target_server + ":" + port + ", ending http connection.");
      response.end();
    });

    socket_client.on('end', function() {
      console.log("connection to " + config.target_server + ":" + port + " closed, ending http connection.");
      response.end();
    });

    socket_client.pipe(response); // this will ends response on socket_client close
    request.pipe(socket_client); // this will close socket_client on request ends
  } else {
    console.log("cannot serve " + request.url);
  }  
}

function readConfig(request, response) {
  request.setEncoding('utf8');
  request.on('data', function(data) {
    var obj = JSON.parse(data);
    config.target_server = obj.target_server;
    if (obj.services2) {
      config.services = obj.services2;
    } else {
      config.services = obj.services;
    }
    config.printers = obj.printers;
    console.log("received config, target_server: " + config.target_server);
    console.log("received config, services: " + JSON.stringify(config.services));
    console.log("received config, printers: " + JSON.stringify(config.printers));    
    config.received = true;
    response.end("received");
    restartPrintServers();
  });
}

var server;

function start(callback) {
  server = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/octet-stream'});

    if (request.url == '/config') {
      readConfig(request, response);
      return;
    }

    if (!config.received) {
      return;
    }

    var printer_match = request.url.match(printer_regex);

    if (printer_match) {
      // serve printers
      var printer = printer_match[1];
      servePrinter(printer, request, response);
    } else {
      // serve socket requests
      serveSocket(request, response);
    }

  });

  server.listen(config.listen_port, config.listen_address, function() {
    console.log('Server running at http://' + config.listen_address + ':' + config.listen_port);
    if (callback) {
      callback(config.listen_address, config.listen_port);
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