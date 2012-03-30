var listen_address = null;
var listen_port = 1338;
var target_server = '127.0.0.1';

// service url to remote port mapping
var ports = {
  '/service1': 1339
};

// printers url to printer ports mapping
var printers = {
  '127.0.0.1_9100': 9001
}

// ---- config ends

var http = require('http');
var net = require('net');

var printer_regex = "/printer/(.*)"


function createPrintServer(response) {
  response.writeHead(200, {'Content-Type': 'application/octet-stream'});

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

  return server;
}

var server = http.createServer(function(request, response) {

  var printer_match = request.url.match(printer_regex);

  // serve printers
  if (printer_match) {
    printer = printer_match[1];
    var port = printers[printer];
    if (port) {
      var server = createPrintServer(response);
      server.listen(port, listen_address);
      console.log('Acting as printer at ' + listen_address + ':' + port + " for " + printer);

      // if http connection ends, close the print server
      request.socket.on('close', function() {
        console.log("Print server http request socket closed, closing server.");
        server.close();
      });
    }
    return;
  }

  var port = ports[request.url];
  if (port) {
    var socket_client = net.connect(port, target_server, function() {
      console.log("Serving " + request.url + " to " + target_server + ":" + port);
    });

    // end response if cannot connect to remote
    socket_client.on('error', function() {
      console.log("cannot connect to " + target_server + ":" + port + ", ending http connection.");
      response.end();
    });

    socket_client.pipe(response); // this will ends response on socket_client close
    request.pipe(socket_client); // this will close socket_client on request ends
  } else {
    console.log("cannot serve " + request.url);
  }
});

server.listen(listen_port, listen_address);
console.log('Server running at http://' + listen_address + ':' + listen_port);