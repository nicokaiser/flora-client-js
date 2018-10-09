'use strict';

const { expect } = require('chai');
const nock = require('nock');
const FloraClient = require('../build/node');

describe('Flora node client', () => {
    const url = 'http://api.example.com/';
    const api = new FloraClient({ url });
    let req;

    afterEach(() => {
        if (req) req.done();
        nock.cleanAll();
    });

    after(() => nock.restore());

    describe('interface', () => {
        it('should require url on initialization', () => {
            expect(() => new FloraClient({})).to.throw(Error, 'Flora API url must be set');
        });

        it('should define execute function', () => {
            const api = new FloraClient({ url: 'http://example.com/' });
            expect(api.execute).to.be.a('function');
        });
    });

    describe('request', () => {
        const response = { meta: {}, data: {} };

        it('should add resource to path', done => {
            req = nock(url)
                .get('/user/')
                .reply(200, response);

            api.execute({ resource: 'user' })
                .then(() => done())
                .catch(done);
        });

        it('should add id to path', done => {
            req = nock(url)
                .get('/user/1337')
                .reply(200, response);

            api.execute({ resource: 'user', id: 1337 })
                .then(() => done())
                .catch(done);
        });

        it('should treat action=retrieve as standard (and not transmit it)', done => {
            req = nock(url)
                .get('/user/')
                .query((queryObj) => !queryObj.hasOwnProperty('action'))
                .reply(200, response);

            api.execute({ resource: 'user', action: 'retrieve' })
                .then(() => done())
                .catch(done);
        });

        it('should add action parameter', done => {
            req = nock(url)
                .post('/user/1337')
                .query({ action: 'update' })
                .reply(200, response);

            api.execute({ resource: 'user', id: 1337, action: 'update'})
                .then(() => done())
                .catch(done);
        });

        it('should add select parameter to query', done => {
            req = nock(url)
                .get('/user/?select=id%2Clastname%2Caddress.city%2Ccomments(order%3Dts%3Adesc)%5Bid%2Cbody%5D')
                .reply(200, response);

            api.execute({ resource: 'user', select: 'id,lastname,address.city,comments(order=ts:desc)[id,body]' })
                .then(() => done())
                .catch(done);
        });

        it('should add filter parameter to query', done => {
            req = nock(url)
                .get('/user/?filter=address%5Bcountry.iso2%3DDE%20AND%20city%3DMunich%5D%20OR%20profession%3DTrader')
                .reply(200, response);

            api.execute({ resource: 'user', filter: 'address[country.iso2=DE AND city=Munich] OR profession=Trader' })
                .then(() => done())
                .catch(done)
        });

        it('should add order parameter to query', done => {
            req = nock(url)
                .get('/user/?order=lastname%3Aasc%2Cfirstname%3Adesc')
                .reply(200, response);

            api.execute({ resource: 'user', order: 'lastname:asc,firstname:desc' })
                .then(() => done())
                .catch(done);
        });

        it('should add limit parameter to query', done => {
            req = nock(url)
                .get('/user/?limit=15')
                .reply(200, response);

            api.execute({ resource: 'user', limit: 15 })
                .then(() => done())
                .catch(done);
        });

        it('should add page parameter to query', done => {
            req = nock(url)
                .get('/user/?page=2')
                .reply(200, response);

            api.execute({ resource: 'user', page: 2 })
                .then(() => done())
                .catch(done);
        });

        it('should add search parameter to query', done => {
            req = nock(url)
                .get('/user/?search=full%20text%20search')
                .reply(200, response);

            api.execute({ resource: 'user', search: 'full text search' })
                .then(() => done())
                .catch(done);
        });

        it('should add cache breaker parameter to query', done => {
            req = nock(url)
                .filteringPath(/_=\d+/, '_=xxx')
                .get('/user/?_=xxx')
                .reply(200, response);

            api.execute({ resource: 'user', cache: false })
                .then(() => done())
                .catch(done);
        });

        it('should post content in data key as JSON', done => {
            const floraReq = {
                resource: 'article',
                action: 'create',
                data: {
                    title: 'Lorem Ipsum',
                    author: { id: 1337 }
                }
            };

            req = nock(url)
                .matchHeader('Content-Type', /application\/json/)
                .post('/article/', '{"title":"Lorem Ipsum","author":{"id":1337}}')
                .query({ action: 'create' })
                .reply(200, response);

            api.execute(floraReq)
                .then(() => done())
                .catch(done);
        });

        describe('HTTP method', () => {
            it('should use GET for "retrieve" actions', done => {
                req = nock(url)
                    .get('/user/1337')
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337, action: 'retrieve' })
                    .then(() => done())
                    .catch(done);
            });

            it('should use GET if action is not set', done => {
                req = nock(url)
                    .get('/user/1337')
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337 })
                    .then(() => done())
                    .catch(done);
            });

            it('should use POST for other actions than "retrieve"', done => {
                req = nock(url)
                    .post('/user/1337')
                    .query({ action: 'lock' })
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337, action: 'lock' })
                    .then(() => done())
                    .catch(done);
            });

            it('should explicitly overwrite method by parameter', done => {
                req = nock(url)
                    .head('/user/1337')
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337, httpMethod: 'HEAD' })
                    .then(() => done())
                    .catch(done);
            });

            it('should switch to POST if querystring gets too large', done => {
                const floraReq = {
                    resource: 'user',
                    select: 'select'.repeat(150),
                    filter: 'filter'.repeat(150),
                    search: 'search term'.repeat(150),
                    limit: 100,
                    page: 10
                };

                req = nock(url)
                    .post('/user/', /select=(select){100,}/)
                    .reply(200, response);

                api.execute(floraReq)
                    .then(() => done())
                    .catch(done);
            });
        });
    });

    describe('parameters', () => {
        it('should support default parameters', done => {
            req = nock(url)
                .get('/user/1337?param=abc')
                .reply(200, {});

            (new FloraClient({ url, defaultParams: { param: 'abc' } }))
                .execute({ resource: 'user', id: 1337 })
                .then(() => done())
                .catch(done);
        });

        it('should use request parameter if default exists with same name', done => {
            req = nock(url)
                .get('/user/1337?param=xyz')
                .reply(200, {});

            (new FloraClient({ url, defaultParams: { param: 'abc' } }))
                .execute({ resource: 'user', id: 1337, param: 'xyz' })
                .then(() => done())
                .catch(done);
        });

        it('should send selected parameters as part of the querystring', done => {
            const floraReq = {
                resource: 'article',
                action: 'create',
                data: {
                    title: 'Lorem Ipsum',
                    author: { id: 1337 }
                }
            };

            req = nock(url)
                .post('/article/', '{"title":"Lorem Ipsum","author":{"id":1337}}')
                .query({
                    client_id: 1,
                    action: 'create'
                })
                .reply(200, {});

            (new FloraClient({ url, defaultParams: { client_id: 1 }, forceGetParams: ['client_id']}))
                .execute(floraReq)
                .then(() => done())
                .catch(done);
        });

        it('should not add httpHeaders option to request params', done => {
            req = nock(url)
                .get('/user/')
                .query(queryObj => !queryObj.hasOwnProperty('httpHeaders'))
                .reply(200, { meta: {}, data: [] });

            api.execute({ resource: 'user', httpHeaders: { 'X-Awesome': 'test' }})
                .then(() => done())
                .catch(done);
        });

        describe('request id', () => {
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

    describe('response', () => {
        it('should resolve API response', done => {
            const data = [{ id: 1337, firstname: 'John', lastname: 'Doe' }];

            req = nock(url)
                .get('/user/')
                .reply(200, { meta: {}, data: data });

            api.execute({ resource: 'user' })
                .then(response => {
                    expect(response.data).to.eql(data);
                    done();
                })
                .catch(done);
        });

        it('should reject with error', done => {
            req = nock(url)
                .get('/user/')
                .reply(500, {
                    meta: {},
                    data: null,
                    error: {
                        message: 'foobar'
                    }
                });

            api.execute({ resource: 'user' })
                .then(() => done(new Error('Expected promise to reject')))
                .catch(err => {
                    expect(err).to.be.instanceof(Error);
                    expect(err.message).to.equal('foobar');
                    done();
                });
        });

        it('should add response to error object', done => {
            const floraReq = {
                resource: 'user',
                action: 'lock',
                id: 1337
            };

            req = nock(url)
                .post('/user/1337')
                .query({ action: 'lock' })
                .reply(400, {
                    meta: {},
                    data: null,
                    error: {
                        message: 'Account already locked',
                        additional: {
                            info: true
                        }
                    }
                });

            api.execute(floraReq)
                .then(() => done(new Error('Expected promise to reject')))
                .catch(err => {
                    expect(err)
                        .to.have.property('response')
                        .and.to.eql({
                            meta: {},
                            data: null,
                            error: {
                                message: 'Account already locked',
                                additional: {
                                    info: true
                                }
                            }
                        });
                    done();
                });
        });

        it('should trigger an error if JSON cannot be parsed', done => {
            req = nock(url)
                .get('/user/')
                .reply(200, 'foobar');

            api.execute({ resource: 'user' })
                .then(() => done(new Error('Expected promise to reject')))
                .catch(err => {
                    expect(err).to.be.instanceOf(Error);
                    done();
                });
        });
    });

    describe('authentication', () => {
        it('should call handler function if authentication option is enabled', done => {
            const authenticate = floraReq => {
                floraReq.httpHeaders.Authorization = 'Bearer __token__';
                return Promise.resolve();
            };

            req = nock(url, { reqheaders: { Authorization: 'Bearer __token__' } })
                .get('/user/')
                .reply(200, { meta: {}, data: [] });

            (new FloraClient({ url, authenticate }))
                .execute({ resource: 'user', authenticate: true })
                .then(() => done())
                .catch(done);
        });

        it('should add access_token parameter', done => {
            const authenticate = floraReq => {
                floraReq.access_token = '__token__';
                return Promise.resolve();
            };

            req = nock(url)
                .post('/user/1337')
                .query({
                    access_token: '__token__',
                    action: 'update'
                })
                .reply(200, { meta: {}, data: [] });

            (new FloraClient({ url, authenticate }))
                .execute({ resource: 'user', id: 1337, action: 'update', authenticate: true })
                .then(() => done())
                .catch(done);
        });

        it('should reject request if no authentication handler is set', done => {
            (new FloraClient({ url }))
                .execute({ resource: 'user', authenticate: true })
                .then(() => done(new Error('Expected promise to reject')))
                .catch(err => {
                    expect(err).to.be.instanceOf(Error)
                        .and.to.have.property('message')
                        .and.to.contain('Authenticated requests require an authentication handler');
                    done();
                });
        });

        it('should not add authenticate option as request parameter', done => {
            const authenticate = () => Promise.resolve();

            req = nock(url)
                .get('/user/')
                .query(queryObj => !queryObj.hasOwnProperty('authenticate'))
                .reply(200, { meta: {}, data: [] });

            (new FloraClient({ url, authenticate }))
                .execute({ resource: 'user', authenticate: true })
                .then(() => done())
                .catch(done);
        });
    });

    describe('formats', () => {
        it('should trigger an error on non-JSON formats', done => {
            api.execute({ resource: 'user', format: 'pdf' })
                .then(() => done(new Error('Expected promise to reject')))
                .catch(err => {
                    expect(err).to.be.instanceof(Error);
                    expect(err.message).to.equal('Only JSON format supported');
                    done();
                });
        });
    });

    describe('protocols', () => {
        it('should support HTTPS', done => {
            const httpsUrl = 'https://api.example.com';
            const secureApi = new FloraClient({ url: httpsUrl });

            req = nock(httpsUrl)
                .get('/user/')
                .reply(200, {});

            secureApi.execute({ resource: 'user' })
                .then(() => done())
                .catch(done);
        });
    });

    describe('headers', () => {
        it('should set referer', done => {
            req = nock(url)
                .matchHeader('Referer', /^file:\/\/\/.*/)
                .get('/user/')
                .reply(200, {});

            api.execute({ resource: 'user' })
                .then(() => done())
                .catch(done);
        });
    });

    describe('timeouts', () => {
        it('should use default request timeout', done => {
            req = nock(url)
                .get('/user/')
                .socketDelay(20000)
                .reply(200, {});

            api.execute({ resource: 'user' })
                .then(() => done(new Error('Expected promise to reject')))
                .catch(err => {
                    expect(err)
                        .to.be.instanceOf(Error)
                        .and.to.have.property('code', 'ECONNRESET');
                    done();
                });
        });

        it('should use configurable request timeout', done => {
            req = nock(url)
                .get('/user/')
                .socketDelay(6000)
                .reply(200, {});

            (new FloraClient({ url, timeout: 5000 }))
                .execute({ resource: 'user' })
                .then(() => done(new Error('Expected promise to reject')))
                .catch(err => {
                    expect(err).to.be.instanceOf(Error)
                        .and.to.have.property('code', 'ECONNRESET');
                    done();
                });
        });
    });

    it('should return API error on connection issues', done => {
        // nock can't fake request errors at the moment, so we have to make a real request to nonexistent host
        const nonExistentApi = new FloraClient({ url: 'http://non-existent.api.localhost' });

        nock.enableNetConnect();
        nonExistentApi.execute({ resource: 'user' })
            .then(() => done(new Error('Expected promise to reject')))
            .catch(err => {
                expect(err).to.be.instanceof(Error);
                done();
            });
        nock.disableNetConnect();
    });
});
