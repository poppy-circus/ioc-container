function getConfigOf(value) {
  var helper = './tasks/helper/grunt_config_';
  return require(helper + value).getConfig();
}

module.exports = function(grunt) {

  'use strict';

  grunt.initConfig({
    copy:         getConfigOf('copy'),
    clean:        getConfigOf('clean'),
    jasmine_node: getConfigOf('jasmine'),
    jsdoc:        getConfigOf('jsdoc'),
    jshint:       getConfigOf('jshint')
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.loadTasks('tasks');
  grunt.registerTask('default', ['jshint', 'jasmine_node']);
};
