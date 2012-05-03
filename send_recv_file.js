var net = require('net');
var fs = require('fs');
var log = require('./log');

if (process.argv.length < 5) {
  console.log(process.argv[0] + " " + process.argv[1] + " <host> <port> <file>");
  process.exit(1);
}

var host = process.argv[2];
var port = process.argv[3];
var file = process.argv[4];

var ws = fs.createWriteStream("received.dat", { flags: 'w+' });

var socket_client = net.connect(port, host, function() {
  console.log("connected to " + host + ":" + port);

  fs.open(file, 'r', function(err, fd) {
    var buffer_size = 32 * 1024;
    var buffer = new Buffer(buffer_size);

    function read_and_send() {
      var bytes = fs.readSync(fd, buffer, 0, buffer_size);
      socket_client.write(buffer.slice(0, bytes));        
      log.info('sent ' + bytes);
      if (bytes == buffer_size) {
        setTimeout(function() {
          read_and_send();
        }, 100);
      }
    }

    process.nextTick(function() {
      read_and_send();
    });
  
  });

  // fs.readFile(file, function(err, data) {
  //   if (err) throw err;
  //   console.log("sending data");
  //   socket_client.write(data);
  // });
});

socket_client.on('data', function(chunk) {
  log.info('received ' + chunk.length);
  ws.write(chunk);
});

socket_client.on('end', function() {
  ws.end();
});
 