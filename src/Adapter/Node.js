'use strict';

const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');

const querystringify = require('../util/querystringify');

class Node {
    /**
     * @param {Object}      opts
     * @param {?number}     [opts.timeout=15000]     - Timeout in milliseconds
     */
    constructor(opts) {
        this.timeout = opts.timeout;
    }

    request(cfg) {
        const { headers } = cfg;
        const method = cfg.httpMethod;
        const opts = Object.assign(url.parse(cfg.url), { headers }, { method });
        let postBody;

        opts.headers.Referer = process.argv.length > 0 ? 'file://' + path.resolve(process.argv[1]) : '';

        if (cfg.jsonData) postBody = cfg.jsonData;
        if (cfg.params && method === 'POST') postBody = querystringify(cfg.params);
        if (postBody) opts.headers['Content-Length'] = postBody.length;

        return new Promise((resolve, reject) => {
            const req = (cfg.url.indexOf('https:') === 0 ? https : http).request(opts, (res) => {
                let str = '';

                res.on('data', (chunk) => { str += chunk; });

                res.on('end', () => {
                    const { headers: { 'content-type': contentType } } = res;
                    let response;

                    if (!contentType.startsWith('application/json')) {
                        return reject(new Error(`Received response with invalid content type: "${contentType}"`));
                    }

                    try {
                        response = JSON.parse(str);
                    } catch (e) {
                        return reject(e);
                    }

                    if (res.statusCode < 400) return resolve(response);

                    const msg = response.error && response.error.message ? response.error.message : 'error';
                    const err = new Error(msg);
                    err.response = response;
                    return reject(err);
                });
            });

            req.setTimeout(this.timeout, () => req.abort());

            if (postBody) req.write(postBody);

            req.on('error', (err) => {
                if (req.aborted) {
                    err = new Error(`Request timed out after ${this.timeout} milliseconds`);
                    err.code = 'ETIMEDOUT';
                }
                reject(err);
            });
            req.end();
        });
    }
}

module.exports = Node;
