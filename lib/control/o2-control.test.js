'use strict';

const { expect } = require('chai');
const { oxygenBoostActive, resolveOxygenControl } = require('./o2-control');

describe('lib/control/o2-control – oxygenBoostActive', () => {
	it('is off when no threshold or no reading is given', () => {
		expect(oxygenBoostActive(4, null, null, 0.5, false)).to.equal(false);
		expect(oxygenBoostActive(null, 5, 7, 0.5, false)).to.equal(false);
		expect(oxygenBoostActive('n/a', 5, 7, 0.5, false)).to.equal(false);
	});

	it('starts boosting below the low threshold', () => {
		expect(oxygenBoostActive(4.9, 5, 7, 0.5, false)).to.equal(true);
		expect(oxygenBoostActive(5.1, 5, 7, 0.5, false)).to.equal(false);
	});

	it('keeps boosting until it recovers to the target', () => {
		expect(oxygenBoostActive(6, 5, 7, 0.5, true)).to.equal(true); // below target, still boosting
		expect(oxygenBoostActive(7, 5, 7, 0.5, true)).to.equal(false); // reached target → stop
	});

	it('uses low + hysteresis as the release level when no target is set', () => {
		expect(oxygenBoostActive(5.2, 5, null, 0.5, true)).to.equal(true); // below 5.5
		expect(oxygenBoostActive(5.6, 5, null, 0.5, true)).to.equal(false); // above 5.5 → stop
	});
});

describe('lib/control/o2-control – resolveOxygenControl', () => {
	const base = {
		enabled: true,
		value: 4,
		low: 5,
		target: 7,
		hysteresis: 0.5,
		wasBoosting: false,
		pointCount: 3,
		affectedPoints: [],
	};

	it('is off when disabled', () => {
		const r = resolveOxygenControl({ ...base, enabled: false });
		expect(r.boosting).to.equal(false);
		expect(r.forcedOn).to.deep.equal([false, false, false]);
	});

	it('forces all points on while boosting with no selection', () => {
		const r = resolveOxygenControl(base);
		expect(r.boosting).to.equal(true);
		expect(r.forcedOn).to.deep.equal([true, true, true]);
	});

	it('forces only the selected points on', () => {
		const r = resolveOxygenControl({ ...base, affectedPoints: [0, 2] });
		expect(r.forcedOn).to.deep.equal([true, false, true]);
	});

	it('is off once oxygen is above the threshold', () => {
		const r = resolveOxygenControl({ ...base, value: 8 });
		expect(r.boosting).to.equal(false);
		expect(r.forcedOn).to.deep.equal([false, false, false]);
	});
});
