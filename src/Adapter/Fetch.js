'use strict';

// const path = require('path');
const querystringify = require('../util/querystringify');

class Fetch {
    /**
     * @param {Object}      opts
     * @param {?number}     [opts.timeout=15000]     - Timeout in milliseconds
     */
    constructor(opts) {
        this.timeout = opts.timeout;
        this.referer = opts.referer;
    }

    request(method, {
        url, headers, params, jsonData
    }) {
        let postBody;

        if (jsonData) postBody = jsonData;
        if (params && method === 'POST') postBody = querystringify(params);

        if (typeof process === 'object' && typeof require === 'function' && typeof Buffer === 'function') {
            // Node.js
            // eslint-disable-next-line global-require
            headers.Referer = process.argv.length > 0 ? 'file://' + require('path').resolve(process.argv[1]) : '';
            if (postBody) headers['Content-Length'] = Buffer.from(postBody).byteLength;
        }

        const timeoutMilliseconds = this.timeout || 15000;
        const signal = AbortSignal.timeout(timeoutMilliseconds);

        const opts = { method, headers, signal };
        if (postBody) opts.body = postBody;

        return fetch(url, opts).then((response) => {
            const contentType = response.headers.get('content-type');
            if (!contentType.startsWith('application/json')) {
                throw new Error(`Server Error: Invalid content type: "${contentType}"`);
            }
            return response.json().then((data) => {
                if (response.status < 400) return data;

                const msg = data.error && data.error.message ? data.error.message : `Server Error: ${response.statusText || 'Invalid JSON'}`;
                const err = new Error(msg);
                err.response = data;
                throw err;
            });
        }).catch((err) => {
            if (err.name === 'TimeoutError') {
                err = new Error(`Request timed out after ${timeoutMilliseconds} milliseconds`);
                err.code = 'ETIMEDOUT';
            }
            throw err;
        });
    }
}

module.exports = Fetch;
