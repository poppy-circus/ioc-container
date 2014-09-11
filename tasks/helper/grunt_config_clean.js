/*
 * Defines grunt config for task clean
 */

(function(exports) {

  'use strict';

  exports.getConfig = function() {
    return {
      coverage: ['coverage'],
      doc: ['doc']
    };
  };
}(typeof exports === 'object' && exports || this));
