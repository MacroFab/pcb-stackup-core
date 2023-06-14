// helper for stack layers that scales, wraps, gathers the defs of layers
'use strict'

var viewbox = require('viewbox')
var wtg = require('whats-that-gerber')

var wrapLayer = require('./wrap-layer')

module.exports = function gatherLayers(
  element,
  idPrefix,
  layers,
  drills,
  outlines,
  useOutline
) {
  var defs = []
  var layerIds = []
  var drillIds = []
  var units = ''
  var unitsCount = {in: 0, mm: 0}
  var allLayers = layers.concat(drills, outlines || [])
  var typeCounts = {}

  var getUniqueId = function(type) {
    if (typeCounts[type] == undefined) {
      typeCounts[type] = 0
    }

    var idSuffix = ++typeCounts[type]

    id = idPrefix + type + idSuffix
    return id
  }

  allLayers.forEach(function(layer) {
    if (!layer.externalId) {
      defs = defs.concat(layer.converter.defs)
    }

    if (layer.converter.units === 'mm') {
      unitsCount.mm++
    } else {
      unitsCount.in++
    }
  })

  if (unitsCount.in + unitsCount.mm) {
    units = unitsCount.in > unitsCount.mm ? 'in' : 'mm'
  }

  var viewboxLayers = useOutline && outlines ? outlines : allLayers

  var box = viewboxLayers.reduce(function(result, layer) {
    var layerBox = layer.converter.viewBox
    var layerUnits = layer.converter.units

    if (layerUnits && layerBox[2] !== 0 && layerBox[3] !== 0) {
      return viewbox.add(
        result,
        viewbox.scale(layerBox, getScale(units, layerUnits))
      )
    }

    return result
  }, viewbox.create())

  var wrapConverterLayer = function(collection) {
    return function(layer) {
      var id = layer.externalId
      var converter = layer.converter

      if (!id) {
        id = getUniqueId(layer.type)
        defs.push(
          wrapLayer(element, id, converter, getScale(units, converter.units))
        )
      }

      collection.push({type: layer.type, id: id})
    }
  }

  layers.forEach(wrapConverterLayer(layerIds))
  drills.forEach(wrapConverterLayer(drillIds))

  var primaryOutlineId
  var outlineArea = 0
  var primaryOutline = null

  outlines.forEach(function(outline) {
    var currentOutlineArea = outline.converter.viewBox[2] * outline.converter.viewBox[3]
    if (currentOutlineArea > outlineArea) {
        primaryOutline = outline
        outlineArea = currentOutlineArea
    }
  })

  // add the primary outline to defs if it's not defined externally or if we're using it to clip

  var primaryOutlineId = null

  if (primaryOutline)
  {
    if (primaryOutline.externalId  && !useOutline) {
        primaryOutlineId = primaryOutline.externalId
    } else {
      primaryOutlineId = getUniqueId(primaryOutline.type)
        defs.push(wrapLayer(
            element,
            primaryOutlineId,
            primaryOutline.converter,
            getScale(units, primaryOutline.converter.units),
            useOutline ? 'clipPath' : 'g'))
    }
  }


  outlines.filter( outline => outline != primaryOutline).forEach(function(outline) {
    var id = outline.externalId
    var converter = outline.converter

    //
    // HACK 
    // Gerber-to-svg sets fill to none for outline layers
    // For non-primary outlines, we actually want a fill
    // so this forces it to do so
    //
    converter.layer = converter.layer.map(function(element) {
        return element.replace('fill="none"', 'fill="currentColor"')
    })

    if (!id) {
      id = getUniqueId(outline.type)
      defs.push(wrapLayer(
        element, 
        id, 
        converter, 
        getScale(units, converter.units)
      ))  

    }
    
    outlineIds.push({type: outline.type, id: id})
  })
  return {
     defs: defs,
      box: box,
      units: units,
      layerIds: layerIds,
      drillIds: drillIds,
      primaryOutlineId: primaryOutlineId,
      outlineIds: outlineIds
  }
}

function getScale(units, layerUnits) {
  var scale = units === 'in' ? 1 / 25.4 : 25.4
  var result = units === layerUnits ? 1 : scale

  return result
}
