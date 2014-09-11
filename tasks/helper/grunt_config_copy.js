/*
 * Defines grunt config for task copy
 */

(function(exports) {

  'use strict';

  exports.getConfig = function() {
    return {
      coverage: {
        files: [
          { src: ['**'], dest: 'doc/coverage', expand: true, cwd: 'coverage/lcov-report/'}
        ]
      }
    };
  };
}(typeof exports === 'object' && exports || this));
