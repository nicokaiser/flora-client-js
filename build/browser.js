'use strict';

const Client = require('../src/Client');
const Adapter = require('../src/Adapter/Fetch');
const timeout = require('./timeout');

class FloraClient extends Client {
    constructor(opts) {
        opts.adapter = opts.adapter || new Adapter({ timeout: timeout(opts) });
        super(opts);
    }
}

module.exports = FloraClient;
