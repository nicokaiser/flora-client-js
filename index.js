/*global define*/
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(['jquery'], factory);
    else root.FloraClient = factory(root.jQuery);
}(this, function factory($) {
    'use strict';

    /**
     * Simple client to access Flora APIs.
     *
     * Uses {@link http://api.jquery.com/jQuery.ajax/|jQuery.ajax} in browsers and
     * {@link https://nodejs.org/api/http.html|http}/{@link https://nodejs.org/api/https.html|https} module in Node.js
     * to run requests against Flora instance.
     *
     * @param {Object}  options                 - Client config options
     * @param {string}  options.url             - URL of Flora instance
     * @param {?Object} options.defaultParams   - Parameters added to each request automatically
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

        if (options.defaultParams && typeof options.defaultParams === 'object') {
            this.defaultParams = {};
            for (var key in options.defaultParams) {
                if (options.defaultParams.hasOwnProperty(key)) {
                    this.defaultParams[key] = options.defaultParams[key];
                }
            }
        }
    }

    /**
     * Execute request against configured Flora instance.
     *
     * @param {Object}              request              - Request configuration object
     * @param {string}              request.resource     - Resource name
     * @param {(number|string)=}    request.id           - Unique identifier of an item
     * @param {string=}             request.format       - Response format (default: JSON - no other formats supported)
     * @param {string=}             request.action       - API action (default: retrieve)
     * @param {string=}             request.select       - Retrieve given resource attributes
     * @param {string=}             request.filter       - Filter items by given criteria
     * @param {string=}             request.order        - Order items by given criteria
     * @param {number=}             request.limit        - Limit result set
     * @param {number=}             request.page         - Paginate through result
     * @param {string=}             request.search       - Search items by full text search
     * @param {Object=}             request.data         - Send data as JSON
     * @param {boolean=}            request.cache        - Use HTTP caching (default: true)
     * @param {string=}             request.httpMethod   - Explicitly overwrite HTTP method
     * @param {function=}           callback
     */
    FloraClient.prototype.execute = function (request, callback) {
        var opts = {
                resource: request.resource,
                id: request.id,
                params: {},
                headers: {}
            },
            key,
            specialKeys = ['resource', 'id', 'cache', 'data'],
            skipCache = request.hasOwnProperty('cache') && !!request.cache === false;

        opts.url = this.url + request.resource + '/' + (request.id || '');

        if (request.format && String(request.format).toLocaleLowerCase() !== 'json') {
            return callback(new Error('Only JSON format supported'));
        }

        if (request.data) { // post property as JSON
            opts.jsonData = JSON.stringify(request.data);
            opts.headers['Content-Type'] = 'application/json';
        }

        // remove special keys from request before assembling Flora request parameters
        for (var i = 0, l = specialKeys.length; i < l; ++i) {
            delete request[specialKeys[i]];
        }

        for (key in request) {
            if (request.hasOwnProperty(key)) {
                if (request.hasOwnProperty(key)) opts.params[key] = request[key];
            }
        }

        if (this.defaultParams) {
            for (key in this.defaultParams) {
                //noinspection JSUnfilteredForInLoop
                if (!opts.params.hasOwnProperty(key)) { //noinspection JSUnfilteredForInLoop
                    opts.params[key] = this.defaultParams[key];
                }
            }
        }

        opts.httpMethod = !request.hasOwnProperty('httpMethod') ? getHttpMethod(opts) : request.httpMethod;

        if (opts.params.action && opts.params.action === 'retrieve') delete opts.params.action;
        if (typeof opts.params === 'object' && !isEmpty(opts.params)) {
            if (opts.jsonData || opts.httpMethod === 'GET') {
                opts.url += '?' + urlencode(getSortedParams(opts.params));
                delete opts.params;
            }
        }

        // add cache breaker to bypass HTTP caching
        if (skipCache) opts.url += (opts.url.indexOf('?') !== -1 ? '&' : '?') + '_=' + (new Date()).getTime();

        this._request(opts, callback);
    };

    // Execute HTTP request in a browser
    FloraClient.prototype._browserRequest = function (cfg, callback) {
        var opts = { method: cfg.httpMethod, headers: cfg.headers },
            err;

        opts.data = cfg.jsonData ? cfg.jsonData : cfg.params;

        if (typeof callback === 'function') {
            opts.success = function (response) {
                callback(null, response);
            };
            opts.error = function (jqXHR) {
                //noinspection JSUnresolvedVariable
                err = jqXHR.responseJSON && jqXHR.responseJSON.error || {};
                callback(new Error(err.message || 'error'));
            };
        }

        $.ajax(cfg.url, opts);
    };

    // Execute HTTP request in Node.js
    FloraClient.prototype._nodeRequest = function (cfg, callback) {
        var protocol = require('http' + (this.url.indexOf('http:') !== -1 ? '' : 's')),
            url = require('url'),
            path = require('path');

        var hasCallback = typeof callback === 'function',
            opts = url.parse(cfg.url),
            postBody,
            req;

        opts.headers = cfg.headers;
        opts.headers['Referer'] = process.argv.length > 0 ? 'file://' + path.resolve(process.argv[1]) : '';

        if (cfg.jsonData) postBody = cfg.jsonData;
        if (cfg.params && cfg.httpMethod === 'POST') postBody = urlencode(cfg.params);

        opts.method = cfg.httpMethod;

        req = protocol.request(opts, function onFloraResponse(res) {
            var str = '';

            res.on('data', function (chunk) {
                str += chunk;
            });

            res.on('end', function () {
                var response;

                if (!hasCallback) return;

                response = JSON.parse(str);
                if (res.statusCode < 400) callback(null, response);
                else callback(new Error(response.error && response.error.message || 'error'));
            });
        });

        if (postBody) req.write(postBody);

        if (hasCallback) req.on('error', callback);
        req.end();
    };

    // Small helper to hide implementation details from execute method
    FloraClient.prototype._request = (function () { // use IIFE to avoid environment checks on each call
        return FloraClient.prototype[($ ? '_browserRequest' : '_nodeRequest')];
    })();

    function getHttpMethod(requestOpts) {
        if ((requestOpts.params && requestOpts.params.action && requestOpts.params.action !== 'retrieve')
            || urlencode(requestOpts.params).length > 2000
            || requestOpts.hasOwnProperty('jsonData')) return 'POST';
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
