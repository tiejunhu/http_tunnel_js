var net = require('net');
var fs = require('fs');

if (process.argv.length < 5) {
  console.log(process.argv[0] + " " + process.argv[1] + " <host> <port> <file>");
  process.exit(1);
}

var host = process.argv[2];
var port = process.argv[3];
var file = process.argv[4];

var ws = fs.createWriteStream("received.dat", { flags: 'w+' });

var socket_client = net.connect(port, host, function() {
  console.log("Connected to printer " + host + ":" + port);
  fs.readFile(file, function(err, data) {
    if (err) throw err;
    console.log("sending data");
    socket_client.write(data);
  });
});

socket_client.pipe(ws);

socket_client.on('end', function() {
  ws.end();
});
 