/*
 * Defines grunt config for task jsdoc
 */
 
(function(exports) {

  'use strict';

  exports.getConfig = function() {
    return {
      api : {
        src: [
          'README.md',
          'src/ioc_container.js'
        ],

        options: {
          destination: 'doc'
        }
      }
    };
  };
}(typeof exports === 'object' && exports || this));
