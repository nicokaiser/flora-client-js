'use strict';

/*
* Adapter for the Ejecta-V8 Ajax Module
* https://github.com/godmodelabs/ejecta-v8
*/

const querystringify = require('../util/querystringify');

const ajax = require('ajax');

class App {
    /**
     * @param {Object}      opts
     * @param {?number}     [opts.timeout=15000]     - Timeout in milliseconds
     */
    constructor(opts) {
        this.timeout = opts.timeout;
    }

    request(cfg) {
        const headers = { ...cfg.headers };
        let body = null;
        if (cfg.httpMethod === 'POST') {
            headers['Content-Type'] = 'application/' + (cfg.jsonData ? 'json' : 'x-www-form-urlencoded');
            body = cfg.params ? querystringify(cfg.params) : cfg.jsonData;
        }

        return new Promise((resolve, reject) => {
                const request = ajax.request(
                        cfg.url,
                        cfg.httpMethod,
                        headers,
                        body,
                        this.timeout
                    );

                request.always(function(response, statusCode) {
                    if(typeof response !== 'object') {
                        return reject(new Error('Invalid response received'));
                    }

                    if (statusCode < 400) return resolve(response);

                    const msg = response.error && response.error.message ? response.error.message : 'error';
                    const err = new Error(msg);
                    err.response = response;
                    return reject(err);
                });
            });
    }
}

module.exports = App;