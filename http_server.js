var listen_address = null;
var listen_port = 1338;
var target_server = '127.0.0.1';

// service url to remote port mapping
var ports = {
  '/service1': 1339
};

// printers url to printer ports mapping
var printers = {
  '192.168.20.112_9100': 9001
}


var http = require('http');
var net = require('net');

var printer_regex = "/printer/(.*)"


function createPrintServer(response) {
  var server = net.createServer(function(socket) {
    socket.on('connect', function() {
      socket.pipe(response);
    });
  });

  return server;
}

var server = http.createServer(function(request, response) {
  var printer_match = request.url.match(printer_regex);
  if (printer_match) {
    printer = printer_match[1];
    var port = printers[printer];
    if (port) {
      var server = createPrintServer(response);
      server.listen(port, listen_address);
      console.log('Acting as printer at ' + listen_address + ':' + port + " for " + printer);
    }
    return;
  }

  var port = ports[request.url];
  if (port) {
    var socket_client = net.connect(port, target_server, function() {
      console.log("Serving " + request.url + " to " + target_server + ":" + port);
    });
    socket_client.pipe(response);
    request.pipe(socket_client);
  } else {
    console.log("cannot serve " + request.url);
  }
});

server.listen(listen_port, listen_address);
console.log('Server running at http://' + listen_address + ':' + listen_port);