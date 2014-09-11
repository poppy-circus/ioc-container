/*
 * Defines grunt config for task jshint
 */

(function(exports) {

  'use strict';

  exports.getConfig = function() {
    return {
      all: ['Gruntfile.js', 'tasks/**/*.js', 'test/**/*.js'],
      options: {
        browser: true,
        expr: true,
        eqnull: true,
        predef: [
          'afterEach',
          'beforeEach',
          'describe',
          'expect',
          'it',
          'jasmine',
          'require',
          'spyOn',
          'createSpy',
          'console',
          'escape',
          'unescape',
          'runs',
          'xit',
          'xdescribe',
          'waitsFor'
        ]
      }
    };
  };
}(typeof exports === 'object' && exports || this));
