http = require 'http'
net = require 'net'

config =
  listen_address: null
  listen_port: 1338
  target_server: null
  services: null
  printers: null
  received: false

printer_regex = "/printer/(.*)"
printServers = {}
printServersSockets = {}
printServersQueue = {}

callServePrinterAsync = (printer, request, response) ->
  process.nextTick ->
    servePrinter printer, request, response

servePrinter = (printer, request, response) ->
  unless printServersQueue[printer]?
    callServePrinterAsync printer, request, response
    return

  buffer = printServersQueue[printer].shift()

  if typeof buffer == 'undefined'
    callServePrinterAsync printer, request, response
    return

  if buffer == null
    response.end()
  else
    response.write buffer
    callServePrinterAsync printer, request, response

stopPrintServers = ->
  for key, server of printServers
    server.close()
    socket = printServersSockets[key]
    socket.end()

    printServers[key] = null
    printServersSockets[key] = null
    printServersQueue[key] = []

startPrintServers = ->
  for key, port of config.printers
    server = net.createServer (socket) ->
      if printServersSockets[key]?
        socket.end()
        return
      printServersSockets[key] = socket
      printServersQueue[key] = []

      socket.on 'data', (buffer) ->
        printServersQueue[key].push buffer

      socket.on 'end', ->
        printServersSockets[key] = null
        printServersQueue[key].push(null)

    server.listen port, config.listen_address
    console.log 'listening at ' + config.listen_address + ':' + port + ' for ' + key
    printServers[key] = server

restartPrintServers = ->
  stopPrintServers()
  startPrintServers()

serveSocket = (request, response) ->
  port = config.services[request.url]
  if port?
    socket_client = net.connect port, config.target_server, ->
      console.log "Serving " + request.url + " to " + config.target_server + ":" + port

    # end response if cannot connect to remote
    socket_client.on 'error', ->
      console.log "cannot connect to " + config.target_server + ":" + port + ", ending http connection."
      response.end()

    socket_client.on 'end', ->
      console.log "connection to " + config.target_server + ":" + port + " closed, ending http connection."
      response.end()

    socket_client.pipe(response) # this will ends response on socket_client close
    request.pipe(socket_client) # this will close socket_client on request ends
  else
    console.log "cannot serve " + request.url

readConfig = (request, response) ->
  request.setEncoding 'utf8'

  request.on 'data', (data) ->
    obj = JSON.parse(data)
    config.target_server = obj.target_server
    if obj.services2
      config.services = obj.services2
    else
      config.services = obj.services

    config.printers = obj.printers

    console.log "received config, target_server: " + config.target_server
    console.log "received config, services: " + JSON.stringify(config.services)
    console.log "received config, printers: " + JSON.stringify(config.printers)

    config.received = true

    response.end "received"
    restartPrintServers()

server = null

start = (callback) ->
  server = http.createServer (request, response) ->
    response.writeHead 200, {'Content-Type': 'application/octet-stream'}

    if request.url == '/config'
      readConfig request, response
      return

    return unless config.received

    printer_match = request.url.match printer_regex

    if printer_match
      # serve printers
      printer = printer_match[1]
      servePrinter printer, request, response
    else
      # serve socket requests
      serveSocket request, response

  server.listen config.listen_port, config.listen_address, ->
    console.log 'Server running at http://' + config.listen_address + ':' + config.listen_port
    callback(config.listen_address, config.listen_port) if callback?

stop = ->
  server.close()


exports.start = start
exports.stop = stop
exports.config = config

# run alone
start() unless module.parent
