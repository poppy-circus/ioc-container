/*
 * Defines grunt config for task jasmine
 */

(function(exports) {

  'use strict';

  exports.getConfig = function() {
    return {
      specMatcher: '.',
      projectRoot: './test',
      requirejs: './test/jasmine_node_setup.js',
      match: '<%= jasmine_node.specMatcher %>',
      forceExit: true
    };
  };
}(typeof exports === 'object' && exports || this));
