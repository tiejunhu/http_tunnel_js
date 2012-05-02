net = require 'net'

config =
  listen_address: null
  port: 9100
  callback: null

server = null

createServer = ->
  net.createServer (socket) ->
    size = 0;
    socket.on 'data', (data) ->
      size += data.length
    socket.on 'end', ->
      config.callback size if config.callback

exports.start = (listen_callback) ->
  server = createServer()
  server.listen config.port, config.listen_address, ->
    listen_callback() if listen_callback

exports.stop = ->
  server.close()

exports.config = config

# run alone
exports.start() unless module.parent
