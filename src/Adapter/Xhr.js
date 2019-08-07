'use strict';

const has = require('has');

const isEmpty = require('../util/isempty');
const querystringify = require('../util/querystringify');

class Xhr {
    /**
     * @param {Object}      opts
     * @param {?number}     [opts.timeout=15000]     - Timeout in milliseconds
     */
    constructor(opts) {
        this.timeout = opts.timeout;
    }

    request(cfg) {
        const xhr = new XMLHttpRequest();

        xhr.open(cfg.httpMethod, cfg.url);
        xhr.timeout = this.timeout; // must be placed after call to open method for IE11

        if (!isEmpty(cfg.headers)) {
            Object.keys(cfg.headers)
                .filter(header => has(cfg.headers, header))
                .forEach(header => xhr.setRequestHeader(header, cfg.headers[header]));
        }

        if (cfg.httpMethod !== 'POST') xhr.send();
        else {
            xhr.setRequestHeader('Content-Type', 'application/' + (cfg.jsonData ? 'json' : 'x-www-form-urlencoded'));
            xhr.send(cfg.params ? querystringify(cfg.params) : cfg.jsonData);
        }

        return new Promise((resolve, reject) => {
            xhr.addEventListener('error', () => reject(new Error('Request failed')));
            xhr.addEventListener('timeout', () => reject(new Error(`Request timed out after ${this.timeout} milliseconds`)));

            xhr.addEventListener('load', () => {
                const contentType = xhr.getResponseHeader('Content-Type');
                let response;

                if (contentType.indexOf('application/json') !== 0) {
                    return reject(new Error(`Received response with invalid content type: "${contentType}"`));
                }

                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    return reject(e);
                }

                if (xhr.status < 400) return resolve(response);

                const msg = response.error && response.error.message ? response.error.message : 'error';
                const err = new Error(msg);
                err.response = response;
                return reject(err);
            });
        });
    }
}

module.exports = Xhr;
