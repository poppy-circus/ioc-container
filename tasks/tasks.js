var exec = require('child_process').exec;

module.exports = function(grunt) {

  'use strict';

  grunt.registerTask('coverage-report', 'Execute unit tests with coverage report', function() {
    var done = this.async();

    exec('npm test --coverage', function(error, stdout, stderr) {
      if (error) {
        grunt.fatal('Error occurred while creating coverage report: ' + stderr);
        done(false);
      } else {
        grunt.task.run(
          'copy:coverage',
          'clean:coverage'
        );
        grunt.log.ok('coverage report created');
        done();
      }
    });
  });
};
