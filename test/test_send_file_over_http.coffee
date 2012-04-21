vows = require 'vows'
assert = require 'assert'
net = require 'net'
fs = require 'fs'
path = require 'path'
hs = require '../http_server'
ss = require '../socket_server'
ms = require '../mock_server'

http_server = "127.0.0.1"
http_port = 9000

hs.config.listen_address = http_server
hs.config.listen_port = http_port

ss.config.listen_address = "127.0.0.1"
ss.config.http_server = http_server
ss.config.http_port = http_port
ss.config.target_server = "127.0.0.1"
ss.config.use_proxy = false
ss.config.services = { '/service0': 9001 }
ss.config.services2 = { '/service0': 9002 }
ss.config.printers = null

ms.config.port = 9002
ms.config.listen_address = "127.0.0.1"


console.log = () ->

testSendData = (server_address, port, callback) ->
  sent_data_length = 0;
  received_data_length = 0;

  client = net.connect port, server_address, () ->
    data_file = path.join path.dirname(module.filename), 'test_bin_data'
    fs.readFile data_file, (err, data) ->
      sent_data_length = data.length
      client.write data, null

  client.on 'data', (data) ->
    received_data_length += data.length
    if received_data_length >= sent_data_length
      callback sent_data_length, received_data_length if callback
      client.end

vows
  .describe('test_send_file_over_http.coffee')

  .addBatch
    'start http server':
      topic: () ->
        hs.start this.callback
        return
      'started': (address, port) ->
        assert.equal address, http_server
        assert.equal port, http_port

  .addBatch
    'start socket server':
      topic: ->
        ss.start this.callback
        return
      'ss_started': ->
        assert.deepEqual hs.config.target_server, ss.config.target_server, "target_server"
        assert.deepEqual hs.config.services, ss.config.services2, "services"
        assert hs.config.printers == null, "printers"
        assert hs.config.received, "received"

  .addBatch
    'start mock server':
      topic: () ->
        ms.start this.callback
        return
      'ms_started': () ->

  .addBatch
    'test mock server':
      topic: () ->
        testSendData '127.0.0.1', 9002, this.callback
        return
      'mock server test': (sent_data_length, received_data_length) ->
        assert.equal received_data_length, sent_data_length

  .addBatch
    'test socket server':
      topic: () ->
        testSendData '127.0.0.1', 9001, this.callback
        return
      'socket server test': (sent_data_length, received_data_length) ->
        assert.equal received_data_length, sent_data_length

  .export(module)