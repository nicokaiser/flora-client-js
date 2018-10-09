const path = require('path');

const BUILD_DIR = path.join(__dirname, 'build');
const DIST_DIR = path.join(__dirname, 'dist');

module.exports = [{
    target: 'web',
    entry: path.join(BUILD_DIR, 'browser.js'),
    devtool: 'source-map',
    output: {
        filename: 'index.browser.js',
        path: DIST_DIR,
        library: 'FloraClient',
        libraryTarget: 'umd',
        umdNamedDefine: false
    }
}, {
    target: 'node',
    entry: path.join(BUILD_DIR, 'node.js'),
    devtool: 'source-map',
    output: {
        filename: 'index.node.js',
        path: DIST_DIR
    }
}];
