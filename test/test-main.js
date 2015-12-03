var TEST_REGEXP = /(spec|test)\.js$/i;

/*global window*/
require.config({
    // Karma serves files under /base, which is the basePath from your config file
    baseUrl: '/base',

    paths: {
        'flora-client': 'index',
        jquery: 'node_modules/jquery/dist/jquery'
    },

    // dynamically load all test files
    deps: Object.keys(window.__karma__.files)
        .filter(function (file) {
            'use strict';
            return TEST_REGEXP.test(file);
        })
        .map(function (file) {
            'use strict';
            return file.replace(/^\/base\//, '').replace(/\.js$/, '');
        }),

    // we have to kickoff jasmine, as it is asynchronous
    callback: window.__karma__.start
});
