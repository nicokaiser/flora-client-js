'use strict';

const Client = require('../src/Client');
const Adapter = require('../src/Adapter/Node');

class FloraClient extends Client {
    constructor(opts) {
        const timeout = opts.timeout && !isNaN(Number(opts.timeout)) ? parseInt(opts.timeout, 10) : 15000;
        opts.adapter = opts.adapter || new Adapter({ timeout });
        super(opts);
    }
}

module.exports = FloraClient;
