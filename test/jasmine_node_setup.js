/*
 * NOTE: This file is executed before every spec-file is loaded. It has the following context:
 * https://github.com/mhevery/jasmine-node/blob/2e6670f469fd4be026a7567b4fa5df3259020db5/lib/jasmine-node/requirejs-runner.js#L15-L36
 *
 * That means that we don't have access to the global scope where our `src` is executed, just to the scope of
 * the spec-files.
 */
var path = require('path');
var requirejs = require('requirejs');

// this is the scope where the spec-files are executed
/*jshint evil:true*/
var specScope = Function('return this;')();

// jasmine-node does not pass the dirname of this file
// so we need to calculate the project root on our own
var relativePathArgs = baseUrl.split('/')
  .filter(function(val) { return val !== ''; })
  .map(function() { return '..'; });
var projectRootPath = path.join.apply(null, [__dirname].concat(relativePathArgs));

var requireConfig = {
  baseUrl: projectRootPath,
  nodeRequire: require,
  packages: [{
    name: 'ioc-container',
    location: 'src'
  }]
};

requirejs.config(requireConfig);

// expose requirejs API to spec execution context
specScope.require = requirejs;
specScope.define = requirejs.define;
