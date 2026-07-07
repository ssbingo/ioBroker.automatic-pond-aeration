'use strict';

const { expect } = require('chai');
const { isFeeding, anyFeeding, feederForcedOff } = require('./pause');

describe('lib/feeder/pause – isFeeding / anyFeeding', () => {
	it('treats truthy values as feeding', () => {
		expect(isFeeding(true)).to.equal(true);
		expect(isFeeding(1)).to.equal(true);
		expect(isFeeding(0)).to.equal(false);
		expect(isFeeding(false)).to.equal(false);
	});
	it('detects any active switch', () => {
		expect(anyFeeding({ a: false, b: true })).to.equal(true);
		expect(anyFeeding({ a: false, b: false })).to.equal(false);
		expect(anyFeeding({})).to.equal(false);
		expect(anyFeeding(null)).to.equal(false);
	});
});

describe('lib/feeder/pause – feederForcedOff', () => {
	it('is all-false when the pause is inactive', () => {
		expect(feederForcedOff(false, [0, 1], 3)).to.deep.equal([false, false, false]);
	});
	it('forces the affected points off while paused', () => {
		expect(feederForcedOff(true, [0, 2], 3)).to.deep.equal([true, false, true]);
	});
	it('ignores out-of-range indices', () => {
		expect(feederForcedOff(true, [1, 5, -1], 2)).to.deep.equal([false, true]);
	});
});
