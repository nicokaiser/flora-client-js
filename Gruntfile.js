'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        mkdir: {
            build: { // mocha bamboo reporter does not create directory automatically
                options: {
                    mode: '0755',
                    create: ['build']
                }
            }
        },

        mochaTest: {
            node: {
                options: {
                    reporter: 'spec',
                    quiet: false
                },
                src: ['test/flora-client-node.spec.js']
            },
            nodeBamboo: {
                options: {
                    reporter: 'mocha-bamboo-reporter',
                    quiet: false
                },
                src: ['<%= mochaTest.node.src %>']
            }
        },

        'mocha_istanbul': {
            'coverageBamboo': {
                src: '<%= mochaTest.node.src %>',
                options: {
                    coverageFolder: 'build',
                    reportFormats: ['clover', 'lcov']
                }
            }
        },

        karma: {
            browserAMD: {
                configFile: 'karma.conf.js',
                options: {
                    reporters: ['mocha'],
                    files: [
                        'test/test-main.js',
                        { pattern: 'dist/index.browser.js', included: false },
                        { pattern: 'test/flora-client-browser.spec.js', included: false }
                    ]
                }
            },
            browserAMDBamboo: {
                configFile: '<%= karma.browserAMD.configFile %>',
                options: {
                    reporters: ['bamboo'],
                    files: '<%= karma.browserAMD.options.files %>'
                }
            },
            browserGlobalVariable: {
                configFile: '<%= karma.browserAMD.configFile %>',
                frameworks: ['mocha', 'chai'], // don't use require.js from karam.conf.js
                options: {
                    reporters: ['mocha'],
                    files: [
                        'dist/index.browser.js',
                        'test/flora-client-browser-global-var.spec.js'
                    ]
                }
            }
        }
    });

    require('load-grunt-tasks')(grunt);

    // node.js tests
    grunt.registerTask('test-node', 'mochaTest:node');
    grunt.registerTask('test-node-bamboo', ['mkdir:build', 'mochaTest:nodeBamboo']);
    grunt.registerTask('node-cov', 'mocha_istanbul:coverageBamboo');

    // browser tests
    grunt.registerTask('test-browser', ['karma:browserGlobalVariable', 'karma:browserAMD']);
    grunt.registerTask('test-browser-bamboo', 'karma:browserAMDBamboo');

    grunt.registerTask('test', ['test-node', 'test-browser']);

};
