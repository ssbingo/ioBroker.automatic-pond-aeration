'use strict';

const { expect } = require('chai');
const { roundRobinSlot, roundRobinDesired } = require('./round-robin');

describe('lib/control/round-robin – roundRobinSlot', () => {
	it('advances one slot per dwell period and wraps around', () => {
		const order = [0, 1, 2];
		expect(roundRobinSlot(order, 60, 0)).to.equal(0);
		expect(roundRobinSlot(order, 60, 60_000)).to.equal(1);
		expect(roundRobinSlot(order, 60, 120_000)).to.equal(2);
		expect(roundRobinSlot(order, 60, 180_000)).to.equal(0); // wrap
	});
	it('returns -1 for an empty order or a non-positive dwell', () => {
		expect(roundRobinSlot([], 60, 0)).to.equal(-1);
		expect(roundRobinSlot([0, 1], 0, 0)).to.equal(-1);
	});
});

describe('lib/control/round-robin – roundRobinDesired', () => {
	it('opens exactly the current point', () => {
		expect(roundRobinDesired([0, 1, 2], 60, 60_000, 3)).to.deep.equal([false, true, false]);
	});
	it('defaults the order to all points when none is given', () => {
		expect(roundRobinDesired([], 30, 0, 2)).to.deep.equal([true, false]);
		expect(roundRobinDesired([], 30, 30_000, 2)).to.deep.equal([false, true]);
	});
	it('respects a custom order', () => {
		expect(roundRobinDesired([2, 0], 10, 0, 3)).to.deep.equal([false, false, true]);
		expect(roundRobinDesired([2, 0], 10, 10_000, 3)).to.deep.equal([true, false, false]);
	});
	it('opens nothing when disabled (no order, empty points)', () => {
		expect(roundRobinDesired([], 60, 0, 0)).to.deep.equal([]);
	});
});
