/*global describe, it, expect, FloraClient */
describe('Flora client', function () {
    'use strict';

    it('should define a global variable', function () {
        expect(FloraClient).to.be.a('function');
    });
});
