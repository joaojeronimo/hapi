// Load modules

var Chai = require('chai');
var Async = require('async');
var Hapi = require('../helpers');
var Route = process.env.TEST_COV ? require('../../lib-cov/route') : require('../../lib/route');


// Declare internals

var internals = {};


// Test shortcuts

var expect = Chai.expect;


describe('Route', function () {

    var paths = [
        '/',
        '/a',
        '/b',
        '/ab',
        '/{p}',
        '/a/b',
        '/a/{p}',
        '/b/',
        '/a/b/c',
        '/a/b/{p}',
        '/a/{p}/b',
        '/a/{p}/c',
        '/a/{p*2}',
        '/a/b/c/d',
        '/a/b/{p*2}',
        '/a/{p}/b/{x}',
        '/{p*5}',
        '/a/b/{p*}',
        '/{p*}'
    ];

    it('compares every combination both ways', function (done) {

        for (var ai = 0, al = paths.length; ai < al; ++ai) {
            var a = { path: paths[ai], server: { settings: { router: { isCaseSensitive: true } } } };
            Route.prototype._generateRegex.call(a);

            for (var bi = 0, bl = paths.length; bi < bl; ++bi) {
                if (ai === bi) {
                    continue;
                }

                var b = { path: paths[bi], server: { settings: { router: { isCaseSensitive: true } } } };
                Route.prototype._generateRegex.call(b);

                var a2b = Route.sort(a, b);
                var b2a = Route.sort(b, a);

                if (a2b !== (-1 * b2a)) {
                    console.log('a: \'' + paths[ai] + '\' | b: \'' + paths[bi] + '\'');
                }

                if (ai < bi && a2b !== -1) {
                    console.log('a: \'' + paths[ai] + '\' | b: \'' + paths[bi] + '\'');
                }

                expect(a2b).to.not.equal(0);
                expect(a2b).to.equal(-1 * b2a);
                expect(a2b).to.equal(ai < bi ? -1 : 1);
            }
        }

        done();
    });

    var handler = function (path) {

        return function (request) {

            request.reply(path);
        };
    }

    var randomLoad = function () {

        it('sorts random routes in right order', function (done) {

            var server = new Hapi.Server();
            var copy = Hapi.utils.clone(paths);
            while (copy.length) {
                var i = Math.floor(Math.random() * (copy.length - 1));
                var path = copy[i];
                copy = copy.filter(function (item, index, array) { return index != i; });
                server.route({ path: path, method: 'GET', handler: handler(path) });
            }

            var routes = server._router.table['get'];
            var list = [];
            for (var i = 0, il = routes.length; i < il; ++i) {
                var route = routes[i];
                list.push(route.path);
            }

            expect(list).to.deep.equal(paths);
            done();
        });
    };

    for (var i = 0; i < 50; i++) {
        randomLoad();
    }

    var server = new Hapi.Server();
    for (var i = 0, il = paths.length; i < il; ++i) {

        var path = paths[i];
        server.route({ path: path, method: 'GET', handler: handler(path) });
    }

    it('sorts routes in right order', function (done) {

        var routes = server._router.table['get'];
        var list = [];
        for (var i = 0, il = routes.length; i < il; ++i) {
            var route = routes[i];
            list.push(route.path);
        }

        expect(list).to.deep.equal(paths);
        done();
    });

    it('matches routes in right order', function (done) {

        var requests = [
            ['/', '/'],
            ['/a', '/a'],
            ['/b', '/b'],
            ['/ab', '/ab'],
            ['/c', '/{p}'],
            ['/a/b', '/a/b'],
            ['/a/c', '/a/{p}'],
            ['/b/', '/b/'],
            ['/a/b/c', '/a/b/c'],
            ['/a/b/d', '/a/b/{p}'],
            ['/a/a/b', '/a/{p}/b'],
            ['/a/d/c', '/a/{p}/c'],
            ['/a/d/d', '/a/{p*2}'],
            ['/a/b/c/d', '/a/b/c/d'],
            ['/a/b/c/e', '/a/b/{p*2}'],
            ['/a/c/b/d', '/a/{p}/b/{x}'],
            ['/a/b/c/d/e', '/{p*5}'],
            ['/a/b/c/d/e/f', '/a/b/{p*}'],
            ['/x/b/c/d/e/f/g', '/{p*}']
        ];

        Async.forEachSeries(requests, function (request, next) {

            server.inject({ method: 'GET', url: request[0] }, function (res) {

                expect(res.result).to.equal(request[1]);
                next();
            });
        },
        function (err) {

            done();
        });
    });
});
