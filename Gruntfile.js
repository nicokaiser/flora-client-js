'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        env: {
            karma: { // use PhantomJS NPM version
                PHANTOMJS_BIN: 'node_modules/.bin/phantomjs'
            }
        },

        mkdir: {
            build: { // mocha bamboo reporter does not create directory automatically
                options: {
                    mode: '0755',
                    create: ['build']
                }
            }
        },

        eslint: {
            target: ['index.js']
        },

        mochaTest: {
            node: {
                options: {
                    reporter: 'spec',
                    quiet: false
                },
                src: ['test/flora-client-interface.spec.js', 'test/flora-client-node.spec.js']
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

        jsdoc: {
            dist: {
                src: '<%= eslint.target %>',
                options: {
                    destination: 'build/docs'
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
                        { pattern: 'index.js', included: false },
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
                        'index.js',
                        'test/flora-client-browser-global-var.spec.js'
                    ]
                }
            }
        },

        denodify: {
            floraClient: {
                src: '<%= eslint.target %>',
                dest: 'build/dist/flora-client.js'
            }
        },

        uglify: {
            floraClient: {
                files: {
                    'build/dist/flora-client.min.js': '<%= denodify.floraClient.dest %>'
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
    grunt.registerTask('test-browser', ['env:karma', 'karma:browserGlobalVariable', 'karma:browserAMD']);
    grunt.registerTask('test-browser-bamboo', ['env:karma', 'karma:browserAMDBamboo']);

    // create browser versions
    grunt.registerTask('dist', ['denodify:floraClient', 'uglify:floraClient']);

    grunt.registerTask('lint', 'eslint');
    grunt.registerTask('doc', 'jsdoc');

    grunt.registerTask('test', ['test-node', 'test-browser']);

    grunt.registerMultiTask('denodify', 'Remove node-specific part from client code', function () {

        // replace node.js specific logic in _nodeRequest by empty function
        function optimize(node) {
            for (var key in node) {
                if (!node.hasOwnProperty(key)) continue;

                if (typeof node[key] === 'object') {
                    if (node[key]
                        && node[key].type
                        && node[key].type === 'ExpressionStatement'
                        && node[key].expression.left
                        && node[key].expression.left.property
                        && node[key].expression.left.property.name
                        && node[key].expression.left.property.name === '_nodeRequest') {

                        node[key].expression.right = {
                            type: 'FunctionExpression',
                            id: null,
                            params: [],
                            defaults: [],
                            body: { type: 'BlockStatement', body: [] },
                            generator: false,
                            expression: false
                        };
                    } else {
                        optimize(node[key]);
                    }
                } else if (Array.isArray(node[key])) {
                    node[key].forEach(function (item) {
                        optimize(item);
                    });
                }
            }
        }

        this.files.forEach(function (file) {
            var esprima = require('esprima'),
                escodegen = require('escodegen');

            var src = grunt.file.read(file.src[0]),
                ast = esprima.parse(src);

            optimize(ast);
            grunt.file.write(file.dest, escodegen.generate(ast));
            return true;
        });
    });
};
