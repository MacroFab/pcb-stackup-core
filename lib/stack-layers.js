// stack layers function (where the magic happens)
'use strict'

var viewbox = require('viewbox')
var wtg = require('whats-that-gerber')

var gatherLayers = require('./_gather-layers')

module.exports = function(
  element,
  id,
  side,
  layers,
  drills,
  outlines,
  useOutline
) {
  var classPrefix = id + '_'
  var idPrefix = id + '_' + side + '_'
  var mechMaskId = idPrefix + 'mech-mask'

  var layerProps = gatherLayers(
    element,
    idPrefix,
    layers,
    drills,
    outlines,
    useOutline
  )
  var defs = layerProps.defs
  var box = layerProps.box
  var units = layerProps.units

  layers = layerProps.layerIds
  drills = layerProps.drillIds

  var outlineIds = layerProps.outlineIds

  defs.push(mechMask(element, mechMaskId, box, [], []))

  // build the layer starting with an fr4 rectangle the size of the viewbox
  var layer = [createRect(element, box, 'currentColor', classPrefix + 'fr4')]
  var cuLayers = findLayers(layers, wtg.TYPE_COPPER)
  var smLayers = findLayers(layers, wtg.TYPE_SOLDERMASK)
  var ssLayers = findLayers(layers, wtg.TYPE_SILKSCREEN)
  var spLayers = findLayers(layers, wtg.TYPE_SOLDERPASTE)
  var primaryOutLayerId = layerProps.primaryOutlineId
  // add copper and copper finish
  for (var i = 0; i < cuLayers.length; i++) {
     var cuLayerId = cuLayers[i]
     var cfMaskId = idPrefix + 'cf-mask_' + (i + 1)
     var smLayerId = smLayers[0]
     var cfMaskShape = (smLayerId)
       ? [useLayer(element, smLayerId)]
       : [createRect(element, box)]
     var cfMaskGroupAttr = {fill: '#fff', stroke: '#fff'}
     var cfMaskGroup = [element('g', cfMaskGroupAttr, cfMaskShape)]

     defs.push(element('mask', {id: cfMaskId}, cfMaskGroup))

     layer.push(useLayer(element, cuLayerId, classPrefix + 'cu'))
     layer.push(useLayer(element, cuLayerId, classPrefix + 'cf', cfMaskId))
  }


  // add soldermask and silkscreen
  // silkscreen will not be added if no soldermask, because that's how it works in RL
  for (var i = 0; i < smLayers.length; i++) {
    var smLayerId = smLayers[i];
    var smMaskId = idPrefix + 'sm-mask_' + (i + 1);

    var maskBase = createRect(element, box, '#fff');

    var cutoutShapes = [useLayer(element, smLayerId)];
    var cutoutGroupAttr = {fill: '#000', stroke: '#000'};
    var cutoutGroup = element('g', cutoutGroupAttr, cutoutShapes);

    var maskChildren = [maskBase, cutoutGroup];
    defs.push(element('mask', {id: smMaskId}, maskChildren));

    var smGroupAttr = {mask: 'url(#' + smMaskId + ')'};
    var smGroupShape = [
        createRect(element, box, 'currentColor', classPrefix + 'sm'),
    ];
    layer.push(element('g', smGroupAttr, smGroupShape));
  }

  if (smLayers.length) {
    for (var i = 0; i < ssLayers.length; i++) {
      var ssLayerId = ssLayers[i]

      layer.push(useLayer(element, ssLayerId, classPrefix + 'ss'))
    }
  }




  // add solderpaste
   if (spLayers.length) {
    for (var i = 0; i < spLayers.length; i++) {
      var spLayerId = spLayers[i]

      layer.push(useLayer(element, spLayerId, classPrefix + 'sp'))
    }
  }

  // add board outline if necessary
  // add non-primary board outlines
  layerProps.outlineIds.forEach(function(outLayer) {
    var outLayerId = outLayer.id
    if (outLayerId != primaryOutLayerId){
        layer.push(useLayer(element, outLayerId, classPrefix + 'out'))
    }
  })

  // add drills outlines
  layerProps.drillIds.forEach(function(drillLayer) {
    var drillLayerId = drillLayer.id
    layer.push(useLayer(element, drillLayerId, classPrefix + 'drl'))
  })

  // add priamry board outline if necessary
  if (!useOutline) {
    layer.push(useLayer(element, primaryOutLayerId, classPrefix + 'out'))
  }

  return {
    defs: defs,
    layer: layer,
    mechMaskId: mechMaskId,
    outClipId: (primaryOutLayerId && useOutline) ? primaryOutLayerId : null,
    box: box,
    units: units,
  }
}

function findLayers(layers, type) {
  var layer
  var i

  var matches = []

  for (i = 0; i < layers.length; i++) {
    layer = layers[i]
    if (layer.type === type) {
      matches.push(layer.id)
    }
  }

  return matches
}

function useLayer(element, id, className, mask) {
  var attr = {'xlink:href': '#' + id}

  if (className) {
    attr.fill = 'currentColor'
    attr.stroke = 'currentColor'
    attr.class = className
  }

  if (mask) {
    attr.mask = 'url(#' + mask + ')'
  }

  return element('use', attr)
}

function createRect(element, box, fill, className) {
  var attr = viewbox.rect(box)

  if (fill) {
    attr.fill = fill
  }

  if (className) {
    attr.class = className
  }

  return element('rect', attr)
}

function mechMask(element, id, box, drills, outlines) {
  var children = drills.concat(outlines).map(function (layer) {
    return useLayer(element, layer.id)
  })

  children.unshift(createRect(element, box, '#fff'))

  var groupAttr = {fill: '#000', stroke: '#000'}
  var group = [element('g', groupAttr, children)]

  return element('mask', {id: id}, group)
}
