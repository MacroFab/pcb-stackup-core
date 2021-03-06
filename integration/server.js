// integration test server
// expects a post request with an array of gerber files
// responds with the stackup object
'use strict'

var fs = require('fs')
var path = require('path')
var hapi = require('hapi')
var inert = require('inert')
var async = require('async')
var gerberToSvg = require('gerber-to-svg')
var whatsThatGerber = require('whats-that-gerber')

var pcbStackupCore = require('../lib/index')

var PORT = 8001

var server = new hapi.Server()

server.connection({port: PORT})
server.register(inert, function () {})

// asynchronously map a gerber filename to a layer object expected by pcbStackupCore
var mapGerberToLayerObject = function (layer, done) {
  var filename = path.join(__dirname, layer.path)
  var type = whatsThatGerber(filename)
  var gerber = fs.createReadStream(filename, 'utf8')
  var id = layer.id
  var converterOptions = {
    id: id,
    plotAsOutline: (type === 'out')
  }

  console.log('converting: ' + id)

  var converter = gerberToSvg(gerber, converterOptions, function (error) {
    console.log('conversion done for: ' + layer.id)

    if (error) {
      console.warn(filename + ' failed to convert')

      return done()
    }

    done(null, {type: type, converter: converter})
  })

  converter.on('warning', function (warning) {
    var msg = warning.message
    var line = warning.line

    console.warn('warning from ' + id + ' at ' + line + ': ' + msg)
  })
}

server.route({
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: path.join(__dirname, '/public'),
      redirectToSlash: true,
      index: true
    }
  }
})

server.route({
  method: 'POST',
  path: '/stackup',
  handler: function (request, reply) {
    var name = request.payload.name
    var layers = request.payload.layers
    var maskWithOutline = request.payload.maskWithOutline

    console.log('building stackup for: ' + name)
    async.map(layers, mapGerberToLayerObject, function (error, results) {
      if (error) {
        return reply(error)
      }

      console.log('building stackup for: ' + name)
      reply(pcbStackupCore(results, {id: name, maskWithOutline: maskWithOutline}))
    })
  }
})

server.start(function (error) {
  if (error) {
    throw error
  }

  console.log('server running at: ' + server.info.uri)
})
