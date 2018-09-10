define(['flora-client'], (FloraClient) => {
    'use strict';

    const url = 'http://api.example.com';

    describe('Flora client', () => {
        let api;

        beforeEach(() => {
            api = new FloraClient({ url });
        });

        describe('request', () => {
            let requests;
            let xhr;

            beforeEach(() => {
                requests = [];
                xhr = sinon.useFakeXMLHttpRequest();
                xhr.onCreate = (req) => requests.push(req);
            });

            afterEach(() => xhr.restore());

            it('should add resource to path', () => {
                api.execute({ resource: 'user' });
                expect(requests[0].url).to.contain(`${url}/user/`);
                expect(requests[0].url).to.not.contain('resource='); // querystring shouldn't contain resource param
            });

            it('should add id to path', () => {
                api.execute({ resource: 'user', id: 1337 });
                expect(requests[0].url).to.contain(`${url}/user/1337`);
                expect(requests[0].url).to.not.contain('id=');  // querystring shouldn't contain id param
            });

            it('should treat action=retrieve as standard (and not transmit it)', () => {
                api.execute({ resource: 'user', action: 'retrieve' });
                expect(requests[0].url).not.to.contain('action=retrieve');
            });

            it('should add action parameter', () => {
                api.execute({ resource: 'user', id: 1337, action: 'awesome' });
                expect(requests[0]).to.have.property('url')
                    .and.to.contain('action=awesome');
            });

            it('should add select parameter to querystring', () => {
                api.execute({ resource: 'user', select: 'id,address.city,comments(order=ts:desc)[id,body]' });
                expect(requests[0].url).to.contain('select=id%2Caddress.city%2Ccomments(order%3Dts%3Adesc)%5Bid%2Cbody%5D');
            });

            it('should add filter parameter to querystring', () => {
                api.execute({ resource: 'user', filter: 'address[country.iso2=DE AND city=Munich]' });
                expect(requests[0].url).to.contain('filter=address%5Bcountry.iso2%3DDE%20AND%20city%3DMunich%5D');
            });

            it('should add order parameter to querystring', () => {
                api.execute({ resource: 'user', order: 'lastname:asc,firstname:desc' });
                expect(requests[0].url).to.contain('order=lastname%3Aasc%2Cfirstname%3Adesc');
            });

            it('should add limit parameter to querystring', () => {
                api.execute({ resource: 'user', limit: 15 });
                expect(requests[0].url).to.contain('limit=15');
            });

            it('should add page parameter to querystring', () => {
                api.execute({ resource: 'user', page: 2 });
                expect(requests[0].url).to.contain('page=2');
            });

            it('should add search parameter to querystring', () => {
                api.execute({ resource: 'user', search: 'full text search' });
                expect(requests[0].url).to.contain('search=full%20text%20search');
            });

            it('should add cache breaker to querystring', () => {
                api.execute({ resource: 'user', cache: false });
                expect(requests[0].url).to.match(/_=\d+/);
                expect(requests[0].url).to.not.contain('cache=');
            });

            it('should post content in data key as JSON', () => {
                api.execute({
                    resource: 'article',
                    action: 'create',
                    data: {
                        title: 'Lorem Ipsum',
                        author: { id: 1337 }
                    }
                });

                const request = requests[0];
                expect(request.method).to.equal('POST');
                expect(request.url).to.contain('action=create');
                expect(request.requestHeaders).to.include.keys('Content-Type');
                expect(request.requestHeaders['Content-Type']).to.contain('application/json');
                expect(request.requestBody).to.equal('{"title":"Lorem Ipsum","author":{"id":1337}}');
            });

            it('should not add httpHeaders option to request params', () => {
                api.execute({ resource: 'user', httpHeaders: { 'X-Awesome': 'test' } });
                expect(requests[0]).to.have.property('url')
                    .and.not.to.contain('httpHeaders=');
            });

            describe('parameters', () => {
                it('should ordered by name (better caching)', () => {
                    const queryString = [
                        'filter=address.country.iso2%3DAT',
                        'limit=10',
                        'order=lastname%3Adesc',
                        'page=3',
                        'search=John',
                        'select=id%2Cfirstname%2Clastname'
                    ].join('&');

                    api.execute({
                        resource: 'user',
                        search: 'John',
                        page: 3,
                        limit: 10,
                        order: 'lastname:desc',
                        select: 'id,firstname,lastname',
                        filter: 'address.country.iso2=AT'
                    });

                    expect(requests[0].url).to.contain(`/user/?${queryString}`);
                });

                it('should support defaults', () => {
                    (new FloraClient({ url, defaultParams: { param: 'abc' } }))
                        .execute({ resource: 'user', id: 1337 });

                    expect(requests[0].url).to.contain('/user/1337?param=abc');
                });

                it('should use request parameter if default exists with same name', () => {
                    (new FloraClient({ url, defaultParams: { param: 'abc' } }))
                        .execute({ resource: 'user', id: 1337, param: 'xyz' });

                    expect(requests[0].url).to.contain('/user/1337?param=xyz');
                });

                it('should send selected parameters as part of the querystring', () => {
                    (new FloraClient({ url, forceGetParams: ['foobar'] }))
                        .execute({
                            resource: 'article',
                            action: 'create',
                            data: {
                                title: 'Lorem Ipsum',
                                author: { id: 1337 }
                            },
                            foobar: 1
                        });

                    const request = requests[0];
                    expect(request.url).to.contain('foobar=1');
                    expect(request.requestBody).to.equal('{"title":"Lorem Ipsum","author":{"id":1337}}');
                });
            });

            describe('HTTP method', () => {
                it('should use GET for "retrieve" actions', () => {
                    api.execute({ resource: 'user', id: 1337, action: 'retrieve' });
                    expect(requests[0].method).to.equal('GET');
                });

                it('should use GET if action is not set', () => {
                    api.execute({ resource: 'user', id: 1337 });
                    expect(requests[0].method).to.equal('GET');
                });

                it('should use POST for other actions than "retrieve"', () => {
                    api.execute({ resource: 'user', id: 1337, action: 'lock' });
                    expect(requests[0]).to.have.property('method', 'POST');
                    expect(requests[0].requestBody).to.be.undefined;
                });

                it('should explicitly overwrite method by parameter', () => {
                    api.execute({ resource: 'user', id: 1337, httpMethod: 'HEAD' });
                    expect(requests[0].method).to.equal('HEAD');
                });

                it('should switch to POST if querystring gets too large', () => {
                    api.execute({
                        resource: 'user',
                        select: 'select'.repeat(150),
                        filter: 'filter'.repeat(150),
                        search: 'search term'.repeat(150),
                        limit: 100,
                        page: 10
                    });

                    expect(requests[0].method).to.equal('POST');
                });
            });
        });

        describe('authentication', () => {
            let server;

            beforeEach(() => {
                server = sinon.createFakeServer();
                server.autoRespond = true;
                server.respondWith([
                    200,
                    { "Content-Type": "application/json" },
                    '{"meta":{},"data":{},"cursor":{}}'
                ]);
            });

            afterEach(() => server.restore());

            it('should call handler function if authentication option is enabled', done => {
                const authenticate = floraReq => {
                    floraReq.httpHeaders.Authorization = 'Bearer __token__';
                    return Promise.resolve();
                };

                (new FloraClient({ url, authenticate }))
                    .execute({ resource: 'user', authenticate: true })
                    .then(() => {
                        expect(server.requests).to.have.length(1);
                        expect(server.requests[0]).to.have.property('requestHeaders')
                            .and.to.have.property('Authorization', 'Bearer __token__');
                        done();
                    })
                    .catch(done);
            });

            it('should add access_token parameter', done => {
                const authenticate = floraReq => {
                    floraReq.access_token = '__token__';
                    return Promise.resolve();
                };

                (new FloraClient({ url, authenticate }))
                    .execute({ resource: 'user', id: 1337, action: 'update', authenticate: true })
                    .then(() => {
                        expect(server.requests).to.have.length(1);
                        expect(server.requests[0]).to.have.property('url')
                            .and.to.contain('access_token=__token__');
                        done();
                    })
                    .catch(done);
            });

            it('should reject request if authentication handler is not set', done => {
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
                (new FloraClient({ url, authenticate: sinon.stub().resolves() }))
                    .execute({ resource: 'user', authenticate: true })
                    .then(() => {
                        expect(server.requests[0]).to.have.property('url')
                            .and.to.not.contain('authenticate=');
                        done();
                    })
                    .catch(done);
            });
        });

        describe('return value', () => {
            let server;

            beforeEach(() => {
                server = sinon.fakeServer.create();
            });

            afterEach(() => {
                server.restore();
            });

            it('should be a promise', done => {
                server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
                const response = api.execute({ resource: 'user' });
                expect(response).to.be.instanceof(Promise);
                server.respond();
                setTimeout(done, 50);
            });

            it('should resolve promise with response', done => {
                const data = [{ id: 1337, firstname: 'John', lastname: 'Doe' }];
                const serverResponse = JSON.stringify({ meta: {}, data: data });

                server.respondWith([200, { 'Content-Type': 'application/json' }, serverResponse]);

                api.execute({ resource: 'user' })
                    .then(response => {
                        expect(response.data).to.eql(data);
                        done();
                    })
                    .catch(done);

                server.respond();
            });

            it('should reject promise with error', done => {
                const serverResponse = JSON.stringify({
                    meta: {},
                    data: null,
                    error: {
                        message: 'foobar'
                    }
                });

                server.respondWith([500, {'Content-Type': 'application/json'}, serverResponse]);

                api.execute({ resource: 'user' })
                    .then(() => done(new Error('Expected promise to reject')))
                    .catch(err => {
                        expect(err).to.be.instanceof(Error);
                        expect(err.message).to.equal('foobar');
                        done();
                    });

                server.respond();
            });

            it('should add response to error object', done => {
                const floraReq = {
                    resource: 'user',
                    action: 'lock',
                    id: 1337
                };
                const serverResponse = JSON.stringify({
                    meta: {},
                    data: null,
                    error: {
                        message: 'Account already locked',
                        additional: {
                            info: true
                        }
                    }
                });

                server.respondWith([400, {'Content-Type': 'application/json'}, serverResponse]);

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

                server.respond();
            });
        });

        describe('timeouts', () => {
            const timeoutError = new Error('Expected promise to reject with timeout error');
            let xhr;
            let clock;

            beforeEach(() => {
                clock = sinon.useFakeTimers();
                xhr = sinon.useFakeXMLHttpRequest();
            });

            afterEach(() => {
                clock.restore();
                xhr.restore();
            });

            it('should use default timeout', done => {
                api.execute({ resource: 'user' })
                    .then(() => done(timeoutError))
                    .catch(err => {
                        expect(err).to.be.instanceOf(Error)
                            .and.to.have.property('message', `Request timed out after ${api.timeout} milliseconds`);
                        done();
                    });

                clock.tick(18000);
            });

            it('should use custom timeout', done => {
                const timeout = 3000;

                (new FloraClient({ url, timeout }))
                    .execute({ resource: 'user' })
                    .then(() => done(timeoutError))
                    .catch(err => {
                        expect(err).to.be.instanceOf(Error)
                            .and.to.have.property('message', `Request timed out after ${timeout} milliseconds`);
                        done();
                    });

                clock.tick(5000);
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
    });
});
