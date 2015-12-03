'use strict';

var FloraClient = require('../'),
    expect = require('chai').expect;

describe('Flora client API', function () {
    describe('interface', function () {
        it('should require url on initialization', function () {
            expect(function () {
                new FloraClient({});
            }).to.throw(Error, 'Flora API url must be set');
        });

        it('should define execute function', function () {
            var api = new FloraClient({ url: 'http://example.com/' });
            expect(api.execute).to.be.a('function');
        });
    });

    it('should append trailing slash to URL', function () {
        var api = new FloraClient({ url: 'http://example.com' });
        expect(api.url).to.equal('http://example.com/');
    });
});
