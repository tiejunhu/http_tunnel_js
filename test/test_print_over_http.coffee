vows = require 'vows'
assert = require 'assert'
net = require 'net'
fs = require 'fs'
path = require 'path'

hs = require '../http_server'
ps = require '../print_server'
ss = require '../socket_server'

http_server = "127.0.0.1"
http_port = 8000

hs.config.listen_address = http_server
hs.config.listen_port = http_port

ss.config.listen_address = "127.0.0.1"
ss.config.http_server = http_server
ss.config.http_port = http_port
ss.config.target_server = "127.0.0.1"
ss.config.use_proxy = false
ss.config.services = null
ss.config.services2 = null
ss.config.printers = 
  "127.0.0.1_8100" : 8001

ps.config.listen_address = "127.0.0.1"
ps.config.port = 8100

console.log = (d) ->

testSendData = (server_address, port, callback) ->
  sent_data_length = 0

  ps.config.callback = (length) ->
    callback sent_data_length, length

  socket = net.connect port, server_address

  socket.on 'connect', () ->
    data_file = path.join path.dirname(module.filename), 'test_bin_data'
    fs.readFile data_file, (err, data) ->
      sent_data_length = data.length;
      socket.end data, null

################################################################################ 

vows
  .describe('test_print_over_http.coffee')

  .addBatch
    'start http server':
      topic: () ->
        hs.start this.callback
        return
      'started': (address, port) ->
        assert.equal address, http_server
        assert.equal port, http_port

  .addBatch
    'start print server':
      topic: () ->
        ps.start this.callback
        return
      'ps_started': () ->
        assert ps != null

  .addBatch
    'start socket server':
      topic: () ->
        ss.start this.callback
        return
      'ss_started': () ->
        assert.equal hs.config.target_server, ss.config.target_server, "target_server"
        assert hs.config.services == null, "services"
        assert.deepEqual hs.config.printers, ss.config.printers, "printers"
        assert hs.config.received, "received"

  .addBatch
    'test print data':
      topic: () ->
        testSendData "127.0.0.1", 8001, this.callback
        return
      'print data': (sent_data_length, received_data_length) ->
        assert sent_data_length > 0, 'sent_data_length'
        assert.equal received_data_length, sent_data_length, 'data length equal'

  .addBatch
    'test print data 2':
      topic: () ->
        testSendData "127.0.0.1", 8001, this.callback
        return
      'print data 2': (sent_data_length, received_data_length) ->
        assert sent_data_length > 0, 'sent_data_length'
        assert.equal received_data_length, sent_data_length, 'data length equal'

  .export(module)
