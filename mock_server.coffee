net = require 'net'

config =
  listen_address: null
  port: 9100

server = null

createServer = ->
  net.createServer (socket) ->
    size = 0
    socket.on 'data', (data) ->
      size += data.length
      socket.write data, null

exports.start = (callback) ->
  server = createServer()
  server.listen config.port, config.listen_address, () ->
    callback() if callback
  console.log 'Mock echo server running at ' + config.listen_address + ':' + config.port

exports.stop = () ->
  server.close()

exports.config = config

# run alone
exports.start() unless module.parent
