/*global window*/
require.config({
    // Karma serves files under /base, which is the basePath from your config file
    baseUrl: '/base',

    paths: {
        'flora-client': 'dist/index.browser'
    },

    // dynamically load all test files
    deps: Object.keys(window.__karma__.files)
        .filter(file => /(spec|test)\.js$/i.test(file))
        .map(file => file.replace(/^\/base\//, '').replace(/\.js$/, '')),

    // we have to kickoff jasmine, as it is asynchronous
    callback: window.__karma__.start
});
