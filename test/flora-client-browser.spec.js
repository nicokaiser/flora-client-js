
/*global define, describe, it, beforeEach, afterEach, expect, sinon */
define(['flora-client'], function (FloraClient) {
    'use strict';

    var url = 'http://api.example.com';

    describe('Flora client', function () {
        var api;

        beforeEach(function () {
            api = new FloraClient({ url: url });
        });

        describe('request', function () {
            var requests, xhr;

            beforeEach(function () {
                requests = [];
                xhr = sinon.useFakeXMLHttpRequest();
                xhr.onCreate = function (req) {
                    requests.push(req);
                };
            });

            afterEach(function () {
                xhr.restore();
            });

            it('should add resource to path', function () {
                api.execute({ resource: 'user' });
                expect(requests[0].url).to.contain(url + '/user/');
                expect(requests[0].url).to.not.contain('resource='); // querystring shouldn't contain resource param
            });

            it('should add id to path', function () {
                api.execute({ resource: 'user', id: 1337 });
                expect(requests[0].url).to.contain(url + '/user/1337');
                expect(requests[0].url).to.not.contain('id=');  // querystring shouldn't contain id param
            });

            it('should treat action=retrieve as standard (and not transmit it)', function () {
                api.execute({ resource: 'user', action: 'retrieve' });
                expect(requests[0].url).not.to.contain('action=retrieve');
            });

            it('should add action parameter', function () {
                api.execute({ resource: 'user', id: 1337, action: 'awesome' });
                expect(requests[0]).to.have.property('url')
                    .and.to.contain('action=awesome');
            });

            it('should add select parameter to querystring', function () {
                api.execute({ resource: 'user', select: 'id,address.city,comments(order=ts:desc)[id,body]' });
                expect(requests[0].url).to.contain('select=id%2Caddress.city%2Ccomments(order%3Dts%3Adesc)%5Bid%2Cbody%5D');
            });

            it('should add filter parameter to querystring', function () {
                api.execute({ resource: 'user', filter: 'address[country.iso2=DE AND city=Munich]' });
                expect(requests[0].url).to.contain('filter=address%5Bcountry.iso2%3DDE%20AND%20city%3DMunich%5D');
            });

            it('should add order parameter to querystring', function () {
                api.execute({ resource: 'user', order: 'lastname:asc,firstname:desc' });
                expect(requests[0].url).to.contain('order=lastname%3Aasc%2Cfirstname%3Adesc');
            });

            it('should add limit parameter to querystring', function () {
                api.execute({ resource: 'user', limit: 15 });
                expect(requests[0].url).to.contain('limit=15');
            });

            it('should add page parameter to querystring', function () {
                api.execute({ resource: 'user', page: 2 });
                expect(requests[0].url).to.contain('page=2');
            });

            it('should add search parameter to querystring', function () {
                api.execute({ resource: 'user', search: 'full text search' });
                expect(requests[0].url).to.contain('search=full%20text%20search');
            });

            it('should add cache breaker to querystring', function () {
                api.execute({ resource: 'user', cache: false });
                expect(requests[0].url).to.match(/_=\d+/);
                expect(requests[0].url).to.not.contain('cache=');
            });

            it('should post content in data key as JSON', function () {
                var request;

                api.execute({
                    resource: 'article',
                    action: 'create',
                    data: {
                        title: 'Lorem Ipsum',
                        author: { id: 1337 }
                    }
                });

                request = requests[0];
                expect(request.method).to.equal('POST');
                expect(request.url).to.contain('action=create');
                expect(request.requestHeaders).to.include.keys('Content-Type');
                expect(request.requestHeaders['Content-Type']).to.contain('application/json');
                expect(request.requestBody).to.equal('{"title":"Lorem Ipsum","author":{"id":1337}}');
            });

            describe('parameters', function () {
                it('should ordered by name (better caching)', function () {
                    var queryString = [
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

                    expect(requests[0].url).to.contain('/user/?' + queryString);
                });

                it('should support defaults', function () {
                    var api = new FloraClient({
                        url: url,
                        defaultParams: {param: 'abc'}
                    });

                    api.execute({resource: 'user', id: 1337});

                    expect(requests[0].url).to.contain('/user/1337?param=abc');
                });

                it('should use request parameter if default exists with same name', function () {
                    var api = new FloraClient({
                        url: url,
                        defaultParams: {param: 'abc'}
                    });

                    api.execute({resource: 'user', id: 1337, param: 'xyz'});

                    expect(requests[0].url).to.contain('/user/1337?param=xyz');
                });

                it('should send selected parameters as part of the querystring', function () {
                    (new FloraClient({ url: url, forceGetParams: ['foobar'] })).execute({
                        resource: 'article',
                        action: 'create',
                        data: {
                            title: 'Lorem Ipsum',
                            author: { id: 1337 }
                        },
                        foobar: 1
                    });

                    var request = requests[0];
                    expect(request.url).to.contain('foobar=1');
                    expect(request.requestBody).to.equal('{"title":"Lorem Ipsum","author":{"id":1337}}');
                });
            });

            describe('HTTP method', function () {
                it('should use GET for "retrieve" actions', function () {
                    api.execute({ resource: 'user', id: 1337, action: 'retrieve' });
                    expect(requests[0].method).to.equal('GET');
                });

                it('should use GET if action is not set', function () {
                    api.execute({ resource: 'user', id: 1337 });
                    expect(requests[0].method).to.equal('GET');
                });

                it('should use POST for other actions than "retrieve"', function () {
                    api.execute({ resource: 'user', id: 1337, action: 'lock' });
                    expect(requests[0]).to.have.property('method', 'POST');
                    expect(requests[0].requestBody).to.be.undefined;
                });

                it('should explicitly overwrite method by parameter', function () {
                    api.execute({ resource: 'user', id: 1337, httpMethod: 'HEAD' });
                    expect(requests[0].method).to.equal('HEAD');
                });

                it('should switch to POST if querystring gets too large', function () {
                    function repeat(str, num) {
                        return (new Array(parseInt(num, 10))).join(str);
                    }

                    api.execute({
                        resource: 'user',
                        select: repeat('select', 150),
                        filter: repeat('filter', 150),
                        search: repeat('search term', 150),
                        limit: 100,
                        page: 10
                    });

                    expect(requests[0].method).to.equal('POST');
                });
            });
        });

        describe('return value', function () {
            var server;

            beforeEach(function () {
                server = sinon.fakeServer.create();
            });

            afterEach(function () {
                server.restore();
            });

            it('should be a promise', function (done) {
                server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
                const response = api.execute({ resource: 'user' });
                expect(response).to.be.instanceof(Promise);
                server.respond();
                setTimeout(done, 50);
            });

            it('should resolve promise with response', function (done) {
                var data = [{ id: 1337, firstname: 'John', lastname: 'Doe' }];
                var serverResponse = JSON.stringify({ meta: {}, data: data });

                server.respondWith([200, { 'Content-Type': 'application/json' }, serverResponse]);

                api.execute({ resource: 'user' })
                    .then(function (response) {
                        expect(response.data).to.eql(data);
                        done();
                    })
                    .catch(done);

                server.respond();
            });

            it('should reject promise with error', function (done) {
                var serverResponse = JSON.stringify({
                    meta: {},
                    data: null,
                    error: {
                        message: 'foobar'
                    }
                });

                server.respondWith([500, {'Content-Type': 'application/json'}, serverResponse]);

                api.execute({ resource: 'user' })
                    .then(function () {
                        done(new Error('Expected promise to reject'));
                    })
                    .catch(function (err) {
                        expect(err).to.be.instanceof(Error);
                        expect(err.message).to.equal('foobar');
                        done();
                    });

                server.respond();
            });
        });

        describe('timeouts', function () {
            var timeoutError = new Error('Expected promise to reject with timeout error');
            var xhr, clock;

            beforeEach(function () {
                clock = sinon.useFakeTimers();
                xhr = sinon.useFakeXMLHttpRequest();
            });

            afterEach(function () {
                clock.restore();
                xhr.restore();
            });

            it('should use default timeout', function () {
                api.execute({ resource: 'user' })
                    .then(function () {
                        throw timeoutError;
                    })
                    .catch(function (err) {
                        expect(err).to.be.instanceOf(Error)
                            .and.to.have.property('message', 'Request timed out after ' + api.timeout + ' milliseconds');
                    });

                clock.tick(18000);
            });

            it('should use custom timeout', function () {
                (new FloraClient({ url: url, timeout: 3000 })).execute({ resource: 'user' })
                    .then(function () {
                        throw timeoutError;
                    })
                    .catch(function (err) {
                        expect(err).to.be.instanceOf(Error)
                            .and.to.have.property('message', 'Request timed out after 3000 milliseconds');
                    });

                clock.tick(5000);
            });
        });

        describe('formats', function () {
            it('should trigger an error on non-JSON formats', function (done) {
                api.execute({ resource: 'user', format: 'pdf' })
                    .then(function () {
                        throw new Error('Expected promise to reject');
                    })
                    .catch(function (err) {
                        expect(err).to.be.instanceof(Error);
                        expect(err.message).to.equal('Only JSON format supported');
                        done();
                    });
            });
        });
    });
});
