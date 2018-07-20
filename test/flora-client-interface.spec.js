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

    describe('request id check', () => {
        const api = new FloraClient({ url: 'http://example.com/' });
        const invalidIds = {
            /*'undefined': undefined,
            'null': null,*/
            'boolean': true,
            'NaN': NaN,
            'Infinity': Infinity
        };

        Object.keys(invalidIds).forEach(type => {
            it(`should reject ${type} as request id`, done => {
                const invalidId = invalidIds[type];

                api.execute({ resource: 'user', id: invalidId })
                    .then(() => done(new Error('Expected promise to reject')))
                    .catch((err) => {
                        expect(err).to.be.instanceof(Error)
                            .and.to.have.property('message', 'Request id must be of type number or string');
                        done();
                    });
            });
        });
    });
});
