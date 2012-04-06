var vows = require('vows'),
    assert = require('assert'),
    net = require('net'),
    hs = require('../http_server');

var suite = vows.describe('subject');

var http_server, http_port;

suite.addBatch({
  'start http server': {
    topic: function() {
      hs.startHttpServer(this.callback);
    },
    'started': function(address, port) {
      http_server = address;
      if (address == null) {
        http_server = "127.0.0.1";
      }
      http_port = port;
      assert.isNotZero(port);
    }
  }
});

suite.addBatch({
  'connect to http server': {
    topic: function() {
      function connect(conn_callback) {
        var client = net.connect(http_port, http_server, function() {
          conn_callback(null, client);
        });        
      };
      connect(this.callback);
    },
    'connected': function(client) {
      client.end('101010');
    }
  }
});


suite.run();