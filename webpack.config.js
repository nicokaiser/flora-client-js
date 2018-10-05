const { resolve } = require('path');
const merge = require('webpack-merge');

/**
 *
 * @type {{entry: *, resolve: {alias: {public: *}}}}
 */

const baseConfig = {
    entry: resolve(__dirname, 'src/index.js')
};

/**
 *
 */

const browserConfig = merge(baseConfig, {
    output: {
        path: resolve(__dirname, './dist'),
        filename: 'index.browser.js'
    },
    resolve: {
        alias: {
            'HTTPAdapter': resolve(__dirname, './src/HTTPAdapter.browser')
        }
    }
});

/**
 *
 */

const nodeConfig = merge(baseConfig, {
    output: {
        path: resolve(__dirname, './dist'),
        filename: 'index.node.js'
    },
    resolve: {
        alias: {
            'HTTPAdapter': resolve(__dirname, './src/HTTPAdapter.node')
        }
    }
});

module.exports = [browserConfig, nodeConfig];
