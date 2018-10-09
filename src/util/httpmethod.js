'use strict';

const has = require('has');
const querystringify = require('./querystringify');

module.exports = (opts) => {
    const { params } = opts;

    if (params) {
        const { action } = params;
        if (action && action !== 'retrieve') return 'POST';
        if (querystringify(params).length > 2000) return 'POST';
    }
    if (has(opts, 'jsonData')) return 'POST';

    return 'GET';
};
