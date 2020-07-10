const path = require('path');

const BUILD_DIR = path.join(__dirname, 'build');
const DIST_DIR = path.join(__dirname, 'dist');

module.exports = [{
    target: 'web',
    entry: path.join(BUILD_DIR, 'browser.js'),
    devtool: 'source-map',
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: {
                    presets: [
                        ['@babel/preset-env', {
                            targets: {
                                browsers: [
                                    'last 2 safari versions',
                                    'last 2 chrome versions',
                                    'last 2 firefox versions',
                                    'ie >= 11'
                                ]
                            }
                        }]
                    ]
                }
            }
        }]
    },
    output: {
        filename: 'index.browser.js',
        path: DIST_DIR,
        libraryTarget: 'umd'
    }
}, {
    target: 'node',
    entry: path.join(BUILD_DIR, 'node.js'),
    devtool: 'source-map',
    output: {
        filename: 'index.node.js',
        path: DIST_DIR,
        libraryTarget: 'commonjs2'
    }
}];
