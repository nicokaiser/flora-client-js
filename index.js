/*global define*/
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else root.FloraClient = factory();
}(this, function factory() {
    'use strict';

    function has(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    function isValidRequestId(id) {
        var type = typeof id;

        if (type === 'number') {
            if (isNaN(id)) return false;
            if (!isFinite(id)) return false;
        }

        return type === 'string' || type === 'number';
    }

    function getErrorMessage(response) {
        if (response.error && response.error.message) return response.error.message;
        return 'error';
    }

    /**
     * Simple client to access Flora APIs.
     *
     * Uses {@link https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest|XMLHttpRequest} in browsers and
     * {@link https://nodejs.org/api/http.html|http}/{@link https://nodejs.org/api/https.html|https} module in Node.js
     * to run requests against Flora instance.
     *
     * @param {Object}      options                     - Client config options
     * @param {string}      options.url                 - URL of Flora instance
     * @param {?Object}     options.defaultParams       - Parameters added to each request automatically
     * @param {?Array}      [options.forceGetParams=['client_id', 'action', 'access_token']]
     *                                                  - Parameters are always send in query string
     * @param {?number}     [options.timeout=15000]     - Timeout in milliseconds
     * @param {?Function}   options.authenticate        - Authentication handler (Promise)
     * @constructor
     */
    function FloraClient(options) {
        if (!options.url) throw new Error('Flora API url must be set');

        /**
         * URL of Flora instance
         *
         * @name FloraClient#url
         * @type {string}
         * @readonly
         */
        this.url = options.url.substr(-1) === '/' ? options.url : options.url + '/';
        this.timeout = options.timeout && !isNaN(Number(options.timeout)) ? parseInt(options.timeout, 10) : 15000;

        if (options.defaultParams && typeof options.defaultParams === 'object') {
            this.defaultParams = {};
            for (var key in options.defaultParams) {
                if (has(options.defaultParams, key)) {
                    this.defaultParams[key] = options.defaultParams[key];
                }
            }
        }

        this.forceGetParams = ['client_id', 'action', 'access_token'];
        if (options.forceGetParams && Array.isArray(options.forceGetParams) && options.forceGetParams.length) {
            Array.prototype.push.apply(this.forceGetParams, options.forceGetParams);
        }

        if (options.authenticate && typeof options.authenticate === 'function') {
            this.authenticate = options.authenticate;
        }
    }

    /**
     * Execute request against configured Flora instance.
     *
     * @param {Object}              request                     - Request configuration object
     * @param {string}              request.resource            - Resource name
     * @param {(number|string)=}    request.id                  - Unique identifier of an item
     * @param {string=}             [request.format=json]       - Response format
     * @param {string=}             [request.action=retrieve]   - API action
     * @param {string=}             request.select              - Retrieve given resource attributes
     * @param {string=}             request.filter              - Filter items by given criteria
     * @param {string=}             request.order               - Order items by given criteria
     * @param {number=}             request.limit               - Limit result set
     * @param {number=}             request.page                - Paginate through result
     * @param {string=}             request.search              - Search items by full text search
     * @param {Object=}             request.data                - Send data as JSON
     * @param {boolean=}            [request.cache=true]        - Use HTTP caching
     * @param {string=}             request.httpMethod          - Explicitly overwrite HTTP method
     * @param {Object=}             request.httpHeaders         - Additional HTTP headers
     * @param {boolean=}            [request.authenticate=false]- Use the authentication handler on this request
     * @return {Promise}
     */
    FloraClient.prototype.execute = function (request) {
        var scope = this;

        if (has(request, 'id') && !isValidRequestId(request.id)) {
            return Promise.reject(new Error('Request id must be of type number or string'));
        }

        if (request.authenticate) {
            if (!this.authenticate) {
                return Promise.reject(new Error('Authenticated requests require an authentication handler'));
            }

            request.httpHeaders = request.httpHeaders || {};
            return this.authenticate(request)
                .then(function () {
                    return scope._execute(request);
                });
        }

        return this._execute(request);
    };

    FloraClient.prototype._execute = function (request) {
        var opts = {
                resource: request.resource,
                id: request.id,
                params: {},
                headers: request.httpHeaders || {}
            },
            param,
            key, i, l,
            getParams = {},
            specialKeys = ['resource', 'id', 'cache', 'data'],
            skipCache = has(request, 'cache') && !!request.cache === false;

        opts.url = this.url + request.resource + '/' + (request.id || '');

        if (request.format && String(request.format).toLocaleLowerCase() !== 'json') {
            return Promise.reject(new Error('Only JSON format supported'));
        }

        if (request.data) { // post property as JSON
            opts.jsonData = JSON.stringify(request.data);
            opts.headers['Content-Type'] = 'application/json';
        }

        // remove special keys from request before assembling Flora request parameters
        for (i = 0, l = specialKeys.length; i < l; ++i) {
            delete request[specialKeys[i]];
        }

        for (key in request) {
            if (!has(request, key)) continue;
            if (['authenticate', 'httpHeaders'].indexOf(key) !== -1) continue;
            opts.params[key] = request[key];
        }

        if (this.defaultParams) {
            for (key in this.defaultParams) {
                //noinspection JSUnfilteredForInLoop
                if (!has(opts.params, key)) { //noinspection JSUnfilteredForInLoop
                    opts.params[key] = this.defaultParams[key];
                }
            }
        }

        if (opts.params.action && opts.params.action === 'retrieve') delete opts.params.action;
        opts.httpMethod = !has(request, 'httpMethod') ? getHttpMethod(opts) : request.httpMethod;

        if (this.forceGetParams.length) {
            for (i = 0, l = this.forceGetParams.length; i < l; ++i) {
                param = this.forceGetParams[i];
                if (!opts.params[param]) continue;
                getParams[param] = opts.params[param];
                delete opts.params[param];
            }
        }

        if (typeof opts.params === 'object' && !isEmpty(opts.params)) {
            if (opts.jsonData || opts.httpMethod === 'GET') {
                for (param in opts.params) {
                    if (!has(opts.params, param)) continue;
                    getParams[param] = opts.params[param];
                }
                delete opts.params;
            }
        }

        if (isEmpty(opts.params)) delete opts.params;
        if (!isEmpty(getParams)) opts.url += '?' + urlencode(getSortedParams(getParams));

        // add cache breaker to bypass HTTP caching
        if (skipCache) opts.url += (opts.url.indexOf('?') !== -1 ? '&' : '?') + '_=' + (new Date()).getTime();

        return this._request(opts);
    };

    // Execute HTTP request in a browser
    FloraClient.prototype._browserRequest = function (cfg) {
        var xhr = new XMLHttpRequest();
        var scope = this;

        xhr.open(cfg.httpMethod, cfg.url);

        xhr.timeout = scope.timeout;

        if (!isEmpty(cfg.headers)) {
            for (var header in cfg.headers) {
                if (!has(cfg.headers, header)) continue;
                xhr.setRequestHeader(header, cfg.headers[header]);
            }
        }

        if (cfg.httpMethod !== 'POST') xhr.send();
        else {
            xhr.setRequestHeader('Content-Type', 'application/' + (cfg.jsonData ? 'json' : 'x-www-form-urlencoded'));
            xhr.send(cfg.params ? urlencode(cfg.params) : cfg.jsonData);
        }

        return new Promise(function (resolve, reject) {
            xhr.addEventListener('timeout', function () {
                reject(new Error('Request timed out after ' + scope.timeout + ' milliseconds'));
            });

            xhr.addEventListener('load', function () {
                var response;

                try {
                    response = JSON.parse(xhr.responseText);
                } catch (e) {
                    return reject(e);
                }

                if (xhr.status < 400) resolve(response);
                else {
                    const err = new Error(getErrorMessage(response));
                    err.response = response;
                    reject(err);
                }
            });
        });
    };

    // Execute HTTP request in Node.js
    FloraClient.prototype._nodeRequest = function (cfg) {
        var protocol = require('http' + (this.url.indexOf('http:') !== -1 ? '' : 's')),
            url = require('url'),
            path = require('path');

        var scope = this,
            opts = url.parse(cfg.url),
            postBody;

        opts.headers = cfg.headers;
        opts.headers['Referer'] = process.argv.length > 0 ? 'file://' + path.resolve(process.argv[1]) : '';

        if (cfg.jsonData) postBody = cfg.jsonData;
        if (cfg.params && cfg.httpMethod === 'POST') postBody = urlencode(cfg.params);

        opts.method = cfg.httpMethod;

        return new Promise(function (resolve, reject) {
            var req = protocol.request(opts, function onFloraResponse(res) {
                var str = '';

                res.on('data', function (chunk) {
                    str += chunk;
                });

                res.on('end', function () {
                    var response;

                    try {
                        response = JSON.parse(str);
                    } catch (e) {
                        // eslint-disable-next-line consistent-return
                        return reject(new Error('Couldn\'t parse response: ' + e.message));
                    }

                    if (res.statusCode < 400) resolve(response);
                    else {
                        const err = new Error(getErrorMessage(response));
                        err.response = response;
                        reject(err);
                    }
                });
            });

            req.setTimeout(scope.timeout, function () {
                req.abort();
            });

            if (postBody) req.write(postBody);

            req.on('error', reject);
            req.end();
        });
    };

    // Small helper to hide implementation details from execute method
    FloraClient.prototype._request = (function () { // use IIFE to avoid environment checks on each call
        return FloraClient.prototype[(typeof window === 'object' ? '_browserRequest' : '_nodeRequest')];
    })();

    function getHttpMethod(requestOpts) {
        if ((requestOpts.params && requestOpts.params.action && requestOpts.params.action !== 'retrieve')
            || urlencode(requestOpts.params).length > 2000
            || has(requestOpts, 'jsonData')) return 'POST';
        return 'GET';
    }

    // Small helper function to save some code ($.param vs. querystring.stringify)
    function urlencode(obj) {
        var params = [];

        for (var key in obj) {
            //noinspection JSUnfilteredForInLoop
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]));
        }

        return params.join('&');
    }

    // sort parameters for better caching
    function getSortedParams(params) {
        var key, i,
            keys = [],
            sortedParams = {};

        for (key in params) {
            if (params.hasOwnProperty(key)) keys.push(key);
        }

        if (!keys.length) return {};

        keys.sort();
        for (i = 0; i < keys.length; ++i) {
            sortedParams[keys[i]] = params[keys[i]];
        }

        return sortedParams;
    }

    // Object.keys(obj).length doesn't work in older browsers
    function isEmpty(obj) {
        if (typeof obj !== 'object') return false;
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) return false;
        }
        return true;
    }

    return FloraClient;
}));
