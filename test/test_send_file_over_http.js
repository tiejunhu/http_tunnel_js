var vows = require('vows'),
    assert = require('assert'),
    net = require('net'),
    hs = require('../http_server');

var suite = vows.describe('subject');

var http_server = "127.0.0.1", 
    http_port = 1338;

hs.config.listen_address = http_server;
hs.config.listen_port = http_port;

suite.addBatch({
  'start http server': {
    topic: function() {
      hs.start(this.callback);
    },
    'started': function(address, port) {
      assert.equal(address, http_server);
      assert.equal(port, http_port);
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

suite.addBatch({
  'close server': {
    topic: function() {
      hs.stop(this.callback);
    },
    'closed': function() {
    }
  }
})


suite.run();