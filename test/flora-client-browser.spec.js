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
                expect(requests[0].requestBody).to.contain('action=awesome');
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
                    expect(requests[0].method).to.equal('POST');
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

        describe('callbacks', function () {
            var server;

            beforeEach(function () {
                server = sinon.fakeServer.create();
            });

            afterEach(function () {
                server.restore();
            });

            it('should be an optional parameter', function (done) {
                server.respondWith([200, { 'Content-Type': 'application/json' }, '{}']);
                api.execute({ resource: 'user' });
                server.respond();
                setTimeout(done, 30);
            });

            it('should return API response as second parameter', function (done) {
                var data = [{ id: 1337, firstname: 'John', lastname: 'Doe' }],
                    serverResponse = JSON.stringify({ meta: {}, data: data });

                server.respondWith([200, { 'Content-Type': 'application/json' }, serverResponse]);
                api.execute({ resource: 'user' }, function (err, response) {
                    expect(err).to.equal(null);
                    expect(response.data).to.eql(data);
                    done();
                });
                server.respond();
            });

            it('should return error as first parameter', function (done) {
                var serverResponse = JSON.stringify({
                        meta: {},
                        data: null,
                        error: {
                            message: 'foobar'
                        }
                    });

                server.respondWith([500, { 'Content-Type': 'application/json' }, serverResponse ]);
                api.execute({ resource: 'user' }, function (err) {
                    expect(err).to.be.instanceof(Error);
                    expect(err.message).to.equal('foobar');
                    done();
                });
                server.respond();
            });
        });

        describe('formats', function () {
            it('should trigger an error on non-JSON formats', function (done) {
                api.execute({ resource: 'user', format: 'pdf' }, function (err) {
                    expect(err).to.be.instanceof(Error);
                    expect(err.message).to.equal('Only JSON format supported');
                    done();
                });
            });
        });
    });
});
