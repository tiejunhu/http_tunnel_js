var vows    = require('vows'),
    assert  = require('assert'),
    net     = require('net'),
    fs      = require('fs'),
    path    = require('path'),
    hs      = require('../http_server'),
    ss      = require('../socket_server'),
    ps      = require('../print_server');

var suite = vows.describe('test_print_over_http');

var http_server = "127.0.0.1", 
    http_port = 8000;

hs.config.listen_address = http_server;
hs.config.listen_port = http_port;

ss.config.listen_address = "127.0.0.1";
ss.config.http_server = http_server;
ss.config.http_port = http_port;
ss.config.target_server = "127.0.0.1";
ss.config.use_proxy = false;
ss.config.services = null;
ss.config.services2 = null;
ss.config.printers = { "127.0.0.1_8100" : 8001 };

ps.config.listen_address = "127.0.0.1";
ps.config.port = 8100;

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
  'start print server': {
    topic: function() {
      ps.start(this.callback);
    },
    'ps_started': function() {
    }
  }
});

suite.addBatch({
  'start socket server': {
    topic: function() {
      ss.start(this.callback);
    },
    'ss_started': function() {
      assert.equal(hs.config.target_server, ss.config.target_server, "target_server");
      assert(hs.config.services == null, "services");
      assert.deepEqual(hs.config.printers, ss.config.printers, "printers");
      assert(hs.config.received, "received");
    }
  }
});

function testSendData(server_address, port, callback)
{
  var sent_data_length = 0;
  var received_data_length = 0;

  function printDataReceived(length) {
    callback(sent_data_length, length);
  }

  ps.config.callback = printDataReceived;

  var client = net.connect(port, server_address, function() {
      fs.readFile(path.join(path.dirname(module.filename), 'test_bin_data'), function(err, data) {
        sent_data_length = data.length;
        client.end(data, null);
      });
  });

}

suite.addBatch({
  'test print data': {
    topic: function() {
      testSendData("127.0.0.1", 8001, this.callback);
    },
    'print data': function(sent_data_length, received_data_length) {
      assert(sent_data_length > 0);
      assert.equal(received_data_length, sent_data_length);
    }
  }
});

function testSendDataWithDelay(server_address, port, callback)
{
  setTimeout(function() {
    testSendData(server_address, port, callback);
  }, 100);
}

suite.addBatch({
  'test print data 2': {
    topic: function() {
      testSendDataWithDelay("127.0.0.1", 8001, this.callback);
    },
    'print data 2': function(sent_data_length, received_data_length) {
      assert(sent_data_length > 0);
      assert.equal(received_data_length, sent_data_length);
    }
  }
});

suite.addBatch({
  'close print server': {
    topic: function() {
      ps.stop();
      return 1;
    },
    'closed': function(topic) {
    }
  }
});

suite.addBatch({
  'close socket server': {
    topic: function() {
      ss.stop();
      return 1;
    },
    'closed': function(topic) {
    }
  }
});

suite.addBatch({
  'close http server': {
    topic: function() {
      hs.stop();
      return 1;
    },
    'closed': function(topic) {
    }
  }
})

suite.export(module);