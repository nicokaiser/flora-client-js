'use strict';

const FloraClient = require('../');
const { expect }= require('chai');

describe('Flora client API', () => {
    describe('interface', () => {
        it('should require url on initialization', () => {
            expect(() => new FloraClient({})).to.throw(Error, 'Flora API url must be set');
        });

        it('should define execute function', () => {
            const api = new FloraClient({ url: 'http://example.com/' });
            expect(api.execute).to.be.a('function');
        });
    });

    it('should append trailing slash to URL', () => {
        const api = new FloraClient({ url: 'http://example.com' });
        expect(api.url).to.equal('http://example.com/');
    });
});
