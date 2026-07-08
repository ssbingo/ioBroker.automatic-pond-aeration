'use strict';

const { expect } = require('chai');
const { stepDwell, sequenceSlot, sequenceDesired } = require('./sequence');

const points = [
	{ id: 'pt-0', name: 'A' },
	{ id: 'pt-1', name: 'B' },
	{ id: 'pt-2', name: 'C' },
];
const groups = [
	{ id: 'grp-0', name: 'G0', members: [0, 1] },
	{ id: 'grp-1', name: 'G1', members: [2] },
];

describe('lib/control/sequence – stepDwell', () => {
	it('uses the step dwell when valid, else the default', () => {
		expect(stepDwell({ dwellSec: 30 }, 60)).to.equal(30);
		expect(stepDwell({}, 60)).to.equal(60);
		expect(stepDwell({ dwellSec: 0 }, 60)).to.equal(60);
		expect(stepDwell({ dwellSec: 'x' }, 0)).to.equal(1); // hard floor of 1
	});
});

describe('lib/control/sequence – sequenceSlot', () => {
	const steps = [{ targetId: 'pt-0' }, { targetId: 'grp-0' }, { targetId: 'pt-2' }];

	it('returns -1 for an empty sequence', () => {
		expect(sequenceSlot([], 60, 0)).to.equal(-1);
	});

	it('advances step by step using the default dwell', () => {
		expect(sequenceSlot(steps, 60, 0)).to.equal(0);
		expect(sequenceSlot(steps, 60, 59_000)).to.equal(0);
		expect(sequenceSlot(steps, 60, 60_000)).to.equal(1);
		expect(sequenceSlot(steps, 60, 120_000)).to.equal(2);
	});

	it('wraps around the whole cycle', () => {
		expect(sequenceSlot(steps, 60, 180_000)).to.equal(0); // 3 * 60 s → back to start
	});

	it('honours per-step dwell times', () => {
		const s = [{ targetId: 'pt-0', dwellSec: 10 }, { targetId: 'pt-1', dwellSec: 100 }];
		expect(sequenceSlot(s, 60, 5_000)).to.equal(0);
		expect(sequenceSlot(s, 60, 10_000)).to.equal(1); // first step is only 10 s
		expect(sequenceSlot(s, 60, 109_000)).to.equal(1);
		expect(sequenceSlot(s, 60, 110_000)).to.equal(0); // cycle = 110 s
	});
});

describe('lib/control/sequence – sequenceDesired', () => {
	const steps = [{ targetId: 'pt-0' }, { targetId: 'grp-0' }, { targetId: 'grp-1' }];

	it('opens a single point for a point step', () => {
		expect(sequenceDesired(steps, points, groups, 60, 0)).to.deep.equal([true, false, false]);
	});

	it('opens all members for a group step (mixed sequence)', () => {
		expect(sequenceDesired(steps, points, groups, 60, 60_000)).to.deep.equal([true, true, false]); // grp-0 = {0,1}
		expect(sequenceDesired(steps, points, groups, 60, 120_000)).to.deep.equal([false, false, true]); // grp-1 = {2}
	});

	it('returns all-closed for an unknown target id', () => {
		expect(sequenceDesired([{ targetId: 'nope' }], points, groups, 60, 0)).to.deep.equal([false, false, false]);
	});

	it('returns all-closed for an empty sequence', () => {
		expect(sequenceDesired([], points, groups, 60, 0)).to.deep.equal([false, false, false]);
	});
});
