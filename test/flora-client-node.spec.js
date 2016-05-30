'use strict';

var expect = require('chai').expect,
    nock = require('nock'),
    FloraClient = require('../');

describe('Flora node client', function () {
    var url = 'http://api.example.com/',
        api = new FloraClient({ url: url }),
        req;

    afterEach(function () {
        if (req) req.done();
        nock.cleanAll();
    });

    after(function () {
        nock.restore();
    });

    describe('request', function () {
        var response = { meta: {}, data: {} };

        it('should add resource to path', function (done) {
            req = nock(url)
                .get('/user/')
                .reply(200, response);

            api.execute({ resource: 'user' }, done);
        });

        it('should add id to path', function (done) {
            req = nock(url)
                .get('/user/1337')
                .reply(200, response);

            api.execute({ resource: 'user', id: 1337 }, done);
        });

        it('should treat action=retrieve as standard (and not transmit it)', function (done) {
            req = nock(url)
                .get('/user/')
                .reply(200, response);

            api.execute({ resource: 'user', action: 'retrieve' }, done);
        });

        it('should add action parameter', function (done) {
            req = nock(url)
                .post('/user/1337', /action=update/)
                .reply(200, response);

            api.execute({ resource: 'user', id: 1337, action: 'update'}, done);
        });

        it('should add select parameter to query', function (done) {
            req = nock(url)
                .get('/user/?select=id%2Clastname%2Caddress.city%2Ccomments(order%3Dts%3Adesc)%5Bid%2Cbody%5D')
                .reply(200, response);

            api.execute({
                resource: 'user',
                select: 'id,lastname,address.city,comments(order=ts:desc)[id,body]'
            }, done);
        });

        it('should add filter parameter to query', function (done) {
            req = nock(url)
                .get('/user/?filter=address%5Bcountry.iso2%3DDE%20AND%20city%3DMunich%5D%20OR%20profession%3DTrader')
                .reply(200, response);

            api.execute({
                resource: 'user',
                filter: 'address[country.iso2=DE AND city=Munich] OR profession=Trader'
            }, done);
        });

        it('should add order parameter to query', function (done) {
            req = nock(url)
                .get('/user/?order=lastname%3Aasc%2Cfirstname%3Adesc')
                .reply(200, response);

            api.execute({ resource: 'user', order: 'lastname:asc,firstname:desc' }, done);
        });

        it('should add limit parameter to query', function (done) {
            req = nock(url)
                .get('/user/?limit=15')
                .reply(200, response);

            api.execute({ resource: 'user', limit: 15 }, done);
        });

        it('should add page parameter to query', function (done) {
            req = nock(url)
                .get('/user/?page=2')
                .reply(200, response);

            api.execute({ resource: 'user', page: 2 }, done);
        });

        it('should add search parameter to query', function (done) {
            req = nock(url)
                .get('/user/?search=full%20text%20search')
                .reply(200, response);

            api.execute({ resource: 'user', search: 'full text search' }, done);
        });

        it('should add cache breaker parameter to query', function (done) {
            req = nock(url)
                .filteringPath(/_=\d+/, '_=xxx')
                .get('/user/?_=xxx')
                .reply(200, response);

            api.execute({ resource: 'user', cache: false }, done);
        });

        it('should post content in data key as JSON', function (done) {
            req = nock(url)
                .matchHeader('Content-Type', /application\/json/)
                .post('/article/?action=create', '{"title":"Lorem Ipsum","author":{"id":1337}}')
                .reply(200, response);

            api.execute({
                resource: 'article',
                action: 'create',
                data: {
                    title: 'Lorem Ipsum',
                    author: { id: 1337 }
                }
            }, done);
        });

        describe('HTTP method', function () {
            it('should use GET for "retrieve" actions', function (done) {
                req = nock(url)
                    .get('/user/1337')
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337, action: 'retrieve' }, done);
            });

            it('should use GET if action is not set', function (done) {
                req = nock(url)
                    .get('/user/1337')
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337 }, done);
            });

            it('should use POST for other actions than "retrieve"', function (done) {
                req = nock(url)
                    .post('/user/1337', /action=lock/)
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337, action: 'lock' }, done);
            });

            it('should explicitly overwrite method by parameter', function (done) {
                req = nock(url)
                    .head('/user/1337')
                    .reply(200, response);

                api.execute({ resource: 'user', id: 1337, httpMethod: 'HEAD' }, done);
            });

            it('should switch to POST if querystring gets too large', function (done) {
                function repeat(str, num) {
                    return (new Array(parseInt(num, 10))).join(str);
                }

                req = nock(url)
                    .post('/user/', /select=(select){100,}/)
                    .reply(200, response);

                api.execute({
                    resource: 'user',
                    select: repeat('select', 150),
                    filter: repeat('filter', 150),
                    search: repeat('search term', 150),
                    limit: 100,
                    page: 10
                }, done);
            });
        });
    });

    describe('parameters', function () {
        it('should be ordered by name (better caching)', function (done) {
            var queryString = [
                'filter=address.country.iso2%3DAT',
                'limit=10',
                'order=lastname%3Adesc',
                'page=3',
                'search=John',
                'select=id%2Cfirstname%2Clastname'
            ].join('&');

            req = nock(url)
                .get('/user/?' + queryString)
                .reply(200, {});

            api.execute({
                resource: 'user',
                search: 'John',
                page: 3,
                limit: 10,
                order: 'lastname:desc',
                select: 'id,firstname,lastname',
                filter: 'address.country.iso2=AT'
            }, done);
        });

        it('should support default parameters', function (done) {
            var api = new FloraClient({
                url: url,
                defaultParams: {param: 'abc'}
            });

            req = nock(url)
                .get('/user/1337?param=abc')
                .reply(200, {});

            api.execute({resource: 'user', id: 1337}, done);
        });

        it('should use request parameter if default exists with same name', function (done) {
            var api = new FloraClient({
                url: url,
                defaultParams: {param: 'abc'}
            });

            req = nock(url)
                .get('/user/1337?param=xyz')
                .reply(200, {});

            api.execute({resource: 'user', id: 1337, param: 'xyz'}, done);
        });
    });

    describe('callbacks', function () {
        it('should be an optional parameter', function (done) {
            req = nock(url)
                .get('/user/')
                .reply(200, {});

            api.execute({ resource: 'user' });
            setTimeout(done, 30);
        });

        it('should return API response as second parameter', function (done) {
            var data = [{ id: 1337, firstname: 'John', lastname: 'Doe' }];

            req = nock(url)
                .get('/user/')
                .reply(200, { meta: {}, data: data });

            api.execute({ resource: 'user' }, function (err, response) {
                expect(err).to.equal(null);
                expect(response.data).to.eql(data);
                done();
            });
        });

        it('should return API error as first parameter', function (done) {
            req = nock(url)
                .get('/user/')
                .reply(500, {
                    meta: {},
                    data: null,
                    error: {
                        message: 'foobar'
                    }
                });

            api.execute({ resource: 'user' }, function (err) {
                expect(err).to.be.instanceof(Error);
                expect(err.message).to.equal('foobar');
                done();
            });
        });

        it('should trigger an error if JSON cannot be parsed', function (done) {
            req = nock(url)
                .get('/user/')
                .reply(200, 'foobar');

            api.execute({ resource: 'user' }, function (err) {
                expect(err).to.be.instanceOf(Error);
                done();
            });
        });
    });

    describe('formats', function () {
        it('should trigger an error on non-JSON formats', function (done) {
            req = api.execute({ resource: 'user', format: 'pdf' }, function (err) {
                expect(err).to.be.instanceof(Error);
                expect(err.message).to.equal('Only JSON format supported');
                done();
            });
        });
    });

    describe('protocols', function () {
        it('should support HTTPS', function (done) {
            var httpsUrl = 'https://api.example.com',
                secureApi = new FloraClient({ url: httpsUrl });

            req = nock(httpsUrl)
                .get('/user/')
                .reply(200, {});

            secureApi.execute({ resource: 'user' }, done);
        });
    });

    describe('headers', function () {
        it('should set referer', function (done) {
            req = nock(url)
                .matchHeader('Referer', /^file:\/\/\/.*/)
                .get('/user/')
                .reply(200, {});

            api.execute({ resource: 'user' }, done);
        });
    });

    it('should return API error on connection issues', function (done) {
        // nock can't fake request errors at the moment, so we have to make a real request to nonexistent host
        var nonExistentApi = new FloraClient({ url: 'http://non-existent.api.localhost' });

        nock.enableNetConnect();
        nonExistentApi.execute({ resource: 'user' }, function (err) {
            expect(err).to.be.instanceof(Error);
            done();
        });
        nock.disableNetConnect();
    });
});
