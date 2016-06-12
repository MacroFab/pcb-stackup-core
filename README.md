# pcb stackup core

[![npm](https://img.shields.io/npm/v/pcb-stackup-core.svg?style=flat-square)](https://www.npmjs.com/package/pcb-stackup-core)
[![Travis](https://img.shields.io/travis/tracespace/pcb-stackup-core.svg?style=flat-square)](https://travis-ci.org/tracespace/pcb-stackup-core)
[![Coveralls](https://img.shields.io/coveralls/tracespace/pcb-stackup-core.svg?style=flat-square)](https://coveralls.io/github/tracespace/pcb-stackup-core)
[![David](https://img.shields.io/david/tracespace/pcb-stackup-core.svg?style=flat-square)](https://david-dm.org/tracespace/pcb-stackup-core)
[![David](https://img.shields.io/david/dev/tracespace/pcb-stackup-core.svg?style=flat-square)](https://david-dm.org/tracespace/pcb-stackup-core#info=devDependencies)

If you're looking for an easy way to generate beautiful SVG renders of printed circuit boards, check out [pcb-stackup](https://github.com/tracespace/pcb-stackup) first.

This is the low-level module that powers the rendering of `pcb-stackup`.  It takes individual printed circuit board layer converters as output by [gerber-to-svg](https://github.com/mcous/gerber-to-svg) and uses them to build SVG renders of what the manufactured PCB will look like from the top and the bottom.

Install with:

```
$ npm install --save pcb-stackup-core
```

## example

```
$ npm run example
```

[The example script](./example/clockblock.js) builds a render of the [clockblock](https://github.com/wileycousins/clockblock) PCB.

## usage

This module is designed to work in Node or in the browser with Browserify or Webpack. The  function takes two parameters: an array of layer objects and an options object. It returns an object with a `top` key and a `bottom` key, each of which contains the SVG element and various properties of the render.

``` javascript
var pcbStackupCore = require('pcb-stackup-core')
var options = {id: 'my-board'}
var stackup = pcbStackupCore(layersArray, options)

// stackup =>
// {
//   top: {
//     svg: '<svg...',
//     defs: [DEFS_ARRAY...],
//     layer: [LAYER_ARRAY...],
//     viewBox: [X_MIN_X_1000, Y_MIN_X_1000, WIDTH_X_1000, HEIGHT_X_1000],
//     width: WIDTH,
//     height: HEIGHT,
//     units: UNITS
//   },
//   bottom: {
//     svg: '<svg...',
//     defs: [DEFS_ARRAY...],
//     layer: [LAYER_ARRAY...],
//     viewBox: [X_MIN_X_1000, Y_MIN_X_1000, WIDTH_X_1000, HEIGHT_X_1000],
//     width: WIDTH,
//     height: HEIGHT,
//     units: UNITS
//   }
// }
```

`svg` is the SVG element (by default as an XML string). The rest of the properties all correspond to the [public properties of a gerber-to-svg-converter](https://github.com/mcous/gerber-to-svg/blob/master/API.md#public-properties). `units` is a string value of 'in' or 'mm'. `viewBox` is the minimum x value, minimum y value, width, and height in thousandths of (1000x) `units`. `width` and `height` are the width and height in `units`. `defs` and `layer` are arrays of XML elements that are used as children of the `defs` node and the SVG's main `g` node.

Astute readers will notice this is the same interface as `gerber-to-svg` converters, and this means the [render](https://github.com/mcous/gerber-to-svg/blob/master/API.md#render) and [clone](https://github.com/mcous/gerber-to-svg/blob/master/API.md#clone) static methods of `gerber-to-svg` will also work on the `pcb-stackup-core` renders.

### layers array

The first parameter to the function is an array of layer objects. A layer object is an object with a `type` key and a `converter` key, where `type` is a Gerber filetype as output by [whats-that-gerber](https://www.npmjs.com/package/whats-that-gerber) and `converter` is the converter object returned by gerber-to-svg for that Gerber file (note: this is the actual return value of gerber-to-svg, not the value that is emitted by the stream or passed to the callback).

It is expected that the converters will have already finished before being passed to `pcbStackupCore`. This can be done by listening for the converter's `end` event or by using `gerber-to-svg` in callback mode, as shown in the example above.

``` javascript
var topCopperLayer = {
  type: GERBER_FILE_TYPE,
  converter: FINISHED_GERBER_TO_SVG_CONVERTER
}
```

### options

The second parameter of the pcbStackupCore function is an options object. The only required option is the `id` options. For ease, if no other options are being specified, the id string may be passed as the second parameter directly.

``` javascript
// stackup 1 and 2 are equivalent
var stackup1 = pcbStackupCore(layers, 'my-unique-board-id')
var stackup2 = pcbStackupCore(layers, {id: 'my-unique-board-id'})
```

key              | default   | description
-----------------|-----------|-----------------------------------------------------------
id               | N/A       | Unique board identifier
color            | see below | Colors to apply to the board render by layer type
maskWithOutline  | false     | Use the board outline layer as a mask for the board shape
createElement    | see below | Function used to create the XML element nodes
includeNamespace | true      | Whether or not to include the `xmlns` attribute in the top level SVG node

#### id

The board ID is a string that is prefixed to `id` and `class` attributes of the internal nodes to the SVG documents. The IDs of any two stackups that may appear on the same web-page must be unique to avoid id collisions and potentially weird styling issues.

This option is required and the function will throw if it is missing.

#### color

The color object allows the user to override the default styling of the stackup. It consists of layer identifiers as the keys and CSS colors as the values. Any to all layers may be overridden. The default color object is:

``` javascript
var DEFAULT_COLOR = {
  fr4: '#666',
  cu: '#ccc',
  cf: '#c93',
  sm: 'rgba(0, 66, 0, 0.75)',
  ss: '#fff',
  sp: '#999',
  out: '#000'
}
```

The keys represent the following layers:

layer | component        
------|------------------
fr4   | Substrate
cu    | Copper
cf    | Copper (finished)
sm    | Soldermask
ss    | Silkscreen
sp    | Solderpaste
out   | Board outline

If a value is falsey (e.g. an empty string), the layer will not be added to the style node. This is useful if you want to add styles with an external stylesheet. If applying colors with an external stylesheet, use the following classnames and specify the `color` attribute:

layer | classname   | example (id = 'my-board')
------|-------------|-------------------------------------------------
fr4   | id + `_fr4` | `.my-board_fr4 {color: #666;}`
cu    | id + `_cu`  | `.my-board_cu {color: #ccc;}`
cf    | id + `_cf`  | `.my-board_cf {color: #c93;}`
sm    | id + `_sm`  | `.my-board_sm {color: #rgba(0, 66, 0, 0.75);}`
ss    | id + `_ss`  | `.my-board_ss {color: #fff;}`
sp    | id + `_sp`  | `.my-board_sp {color: #999;}`
out   | id + `_out` | `.my-board_out {color: #000;}`

#### mask board shape with outline

When constructing the stackup, a "mechanical mask" is built and applied to the final image to remove the image wherever there are drill hits. If the `maskWithOutline` option is passed as true, the stackup function will also add the board outline to this mechanical mask, effectively (but not literally) using the outline layer as a [clipping path](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath) and removing areas outside the outline from the final image.

setting           | result
------------------|-------------------------------------------------
`false` (default) | Board shape is a rectangle that fits all layers
`true`            | Board shape is the shape of the outline layer

`maskWithOutline` works by taking the `<path>`s of the outline layer and setting their `fill` attributes. To work, the outline layer must be one or more fully-enclosed loops. If it isn't, setting `maskWithOutline` to true will likely result in the final image being incorrect (or non-existent), because the `<path>`s won't fill in properly.

To improve your chances of a board outline layer working for `maskWithOutline`, make sure you set the `plotAsOutline` [option of gerber-to-svg](https://github.com/mcous/gerber-to-svg/blob/master/API.md#options) to `true` when converting the outline gerber. If the board outline still doesn't work, please open an issue to see if we can improve the masking process.

#### create element and include namespace

Both `gerber-to-svg` and `pcb-stackup-core` take a `createElement` function as an option. It defaults to [`xml-element-string`](https://github.com/tracespace/xml-element-string), which outputs a string. However, any function that takes a tag name, attributes object, and children array may be used. For example, you could pass in `React.createElement` and create virtual DOM nodes instead.

If you choose to use this option, the function you pass into `pcb-stackup-core` must be the same one you passed into `gerber-to-svg`.

The `includeNamespace` option specifies whether or not to include the `xmlns` attribute in the top level SVG node. Some VDOM implementations get angry when you pass the `xmlns` attribute, so you may need to set it to false.

### layer types

The stackup can be made up of the following layer types:

layer type               | abbreviation
-------------------------|--------------
top / bottom copper      | tcu / bcu
top / bottom soldermask  | tsm / bsm
top / bottom silkscreen  | tss / bss
top / bottom solderpaste | tsp / bsp
board outline            | out      
drill hits               | drl      

## developing and contributing

Clone and then `$ npm install`. Please accompany all PRs with applicable tests. Please test your code in browsers, as Travis CI cannot run browser tests for PRs.

### unit testing

This module uses [Mocha](http://mochajs.org/) and [Chai](http://chaijs.com/) for unit testing, [Istanbul](https://github.com/gotwarlost/istanbul) for coverage, and [ESLint](http://eslint.org/) for linting.

* `$ npm test` - run the tests, calculate coverage, and lint
* `$ npm run test:watch` - run the tests on code changes (does not lint nor cover)
* `$ npm run lint` - lint the code (will be run as a pre-commit script)

### integration testing

The integration tests run the example code on a variety of gerber files to ensure proper interfacing with `gerber-to-svg` and proper rendering of different stackups.

1. `$ npm run test:integration`
2. Open http://localhost:8001 in a browser

### browser testing

Browser tests are run with [Zuul](https://github.com/defunctzombie/zuul) and [Sauce Labs](https://saucelabs.com/opensauce/).

* `$ npm run test:browser` - run the unit tests in a local browser
* `$ npm run test:sauce` - run the units tests in several browsers using Open Sauce (Sauce Labs account and local [.zuulrc](https://github.com/defunctzombie/zuul/wiki/Zuulrc) required)
