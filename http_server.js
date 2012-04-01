var config = {
  listen_address: null,
  listen_port: 1338,
  target_server: '127.0.0.1',
  // service url to remote port mapping
  services: {
    '/service1': 9100
  }, 
  // printers url to printer ports mapping
  printers: {
    '127.0.0.1_9100': 9001
  }
}

// ---- config ends

var http = require('http');
var net = require('net');

var printer_regex = "/printer/(.*)"


function createPrintServer(port, response) {
  var length = 0;
  var server = net.createServer(function(socket) {
    socket.on('data', function(buffer) {
      length += buffer.length;
      response.write(buffer);
    });

    socket.on('close', function(had_error) {
      console.log("Print server peer closed, ending response. total bytes sent: " + length);
      response.end();
    });    
  });

  server.on('error', function(e) {
    console.log("Print server error, ending response. total bytes sent: " + length);
    response.end();    
  });
  
  server.listen(port, config.listen_address);

  return server;
}

function servePrinter(printer, request, response) {
    var port = config.printers[printer];
    if (port) {
      var server = createPrintServer(port, response);
      console.log('Acting as printer at ' + config.listen_address + ':' + port + " for " + printer);

      // if http connection ends, close the print server
      request.socket.on('close', function() {
        console.log("Print server http request socket closed, closing server.");
        server.close();
      });
    }  
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

var server = http.createServer(function(request, response) {

  response.writeHead(200, {'Content-Type': 'application/octet-stream'});

  var printer_match = request.url.match(printer_regex);

  if (printer_match) {
    // serve printers
    printer = printer_match[1];
    servePrinter(printer, request, response);
  } else {
    // serve socket requests
    serveSocket(request, response);
  }

});

server.listen(config.listen_port, config.listen_address);
console.log('Server running at http://' + config.listen_address + ':' + config.listen_port);