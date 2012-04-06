var vows = require('vows'),
    assert = require('assert'),
    net = require('net'),
    fs = require('fs'),
    path = require('path'),
    hs = require('../http_server'),
    ss = require('../socket_server');

var suite = vows.describe('test_print_over_http');

var http_server = "127.0.0.1", 
    http_port = 8000;

hs.config.listen_address = http_server;
hs.config.listen_port = http_port;
// hs.config.target_server = null;
// hs.config.services = null;
// hs.config.printers = null;
// hs.config.received = false;

ss.config.listen_address = "127.0.0.1",
ss.config.http_server = http_server;
ss.config.http_port = http_port;
ss.config.target_server = "127.0.0.1";
ss.config.use_proxy = false;
ss.config.services = null;
ss.config.services2 = null;
ss.config.printers = { "127.0.0.1_9100" : 8001 };
// ss.config.printers = null;

console.log = function(d) {}

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
  'start socket server': {
    topic: function() {
      ss.start(this.callback);
    },
    'ss_started': function() {
      assert.deepEqual(hs.config.target_server, ss.config.target_server, "target_server");
      assert(hs.config.services == null, "services");
      assert.deepEqual(hs.config.printers, ss.config.printers, "printers");
      assert(hs.config.received, "received");
    }
  }
});

suite.addBatch({
  'close socket server': {
    topic: function() {
      ss.stop(this.callback);
    },
    'closed': function() {
      console.log("closed");
    }
  }
});

suite.addBatch({
  'close http server': {
    topic: function() {
      hs.stop(this.callback);
    },
    'closed': function() {
    }
  }
})

suite.export(module);