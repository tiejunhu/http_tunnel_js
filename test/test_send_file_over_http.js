var vows = require('vows'),
    assert = require('assert'),
    net = require('net'),
    fs = require('fs'),
    path = require('path'),
    hs = require('../http_server'),
    ss = require('../socket_server'),
    ms = require('../mock_server');

var suite = vows.describe('test_send_file_over_http');

var http_server = "127.0.0.1", 
    http_port = 9000;

hs.config.listen_address = http_server;
hs.config.listen_port = http_port;

ss.config.listen_address = "127.0.0.1",
ss.config.http_server = http_server;
ss.config.http_port = http_port;
ss.config.target_server = "127.0.0.1";
ss.config.use_proxy = false;
ss.config.services = { '/service0': 9001 };
ss.config.services2 = { '/service0': 9002 };
ss.config.printers = null;

ms.config.port = 9002;
ms.config.listen_address = "127.0.0.1";

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
      assert.deepEqual(hs.config.services, ss.config.services2, "services");
      assert(hs.config.printers == null, "printers");
      assert(hs.config.received, "received");
    }
  }
});

suite.addBatch({
  'start mock server': {
    topic: function() {
      ms.start(this.callback);
    },
    'ms_started': function() {
    }
  }
});

suite.addBatch({
  'connect to socket server': {
    topic: function() {
      function connect(conn_callback) {
        var client = net.connect(9001, "127.0.0.1", function() {
          conn_callback(null, client);
        });        
      };
      connect(this.callback);
    },
    'connected': function(client) {
      client.end('testtest');
    }
  }
});

function testSendData(server_address, port, callback)
{
  var sent_data_length = 0;
  var received_data_length = 0;

  var client = net.connect(port, server_address, function() {
      fs.readFile(path.join(path.dirname(module.filename), 'test_bin_data'), function(err, data) {
        sent_data_length = data.length;
        client.write(data, null);
      });
  });

  client.on('data', function(data) {
    received_data_length += data.length;
    if (received_data_length >= sent_data_length) {
      client.end();
    }
  });

  client.on('end', function() {
    if (callback) {
      callback(sent_data_length, received_data_length);    
    }
  });  
}

suite.addBatch({
  'test mock server': {
    topic: function() {
      testSendData('127.0.0.1', 9002, this.callback);
    },
    'mock server test': function(sent_data_length, received_data_length) {
      assert.equal(received_data_length, sent_data_length);
    }
  }
});

suite.addBatch({
  'test socket server': {
    topic: function() {
      testSendData('127.0.0.1', 9001, this.callback);
    },
    'socket server test': function(sent_data_length, received_data_length) {
      assert.equal(received_data_length, sent_data_length);
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