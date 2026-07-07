'use strict';

const { expect } = require('chai');
const { mmddToOrdinal, inWinterWindow, frostActive, resolveWinter } = require('./winter');

describe('lib/control/winter – mmddToOrdinal', () => {
	it('converts valid MM-DD to a comparable ordinal', () => {
		expect(mmddToOrdinal('01-01')).to.equal(101);
		expect(mmddToOrdinal('03-15')).to.equal(315);
		expect(mmddToOrdinal('11-01')).to.equal(1101);
		expect(mmddToOrdinal('9-5')).to.equal(905); // tolerates single digits
	});

	it('returns NaN for invalid input', () => {
		expect(mmddToOrdinal('')).to.be.NaN;
		expect(mmddToOrdinal('13-01')).to.be.NaN;
		expect(mmddToOrdinal('05-40')).to.be.NaN;
		expect(mmddToOrdinal('not-a-date')).to.be.NaN;
		expect(mmddToOrdinal(undefined)).to.be.NaN;
	});
});

describe('lib/control/winter – inWinterWindow', () => {
	it('handles a window that wraps the turn of the year (11-01 .. 03-15)', () => {
		expect(inWinterWindow('11-01', '03-15', '12-24')).to.equal(true);
		expect(inWinterWindow('11-01', '03-15', '01-06')).to.equal(true);
		expect(inWinterWindow('11-01', '03-15', '11-01')).to.equal(true); // inclusive start
		expect(inWinterWindow('11-01', '03-15', '03-15')).to.equal(true); // inclusive end
		expect(inWinterWindow('11-01', '03-15', '10-31')).to.equal(false);
		expect(inWinterWindow('11-01', '03-15', '03-16')).to.equal(false);
		expect(inWinterWindow('11-01', '03-15', '07-01')).to.equal(false);
	});

	it('handles a same-year window (06-01 .. 08-31)', () => {
		expect(inWinterWindow('06-01', '08-31', '07-15')).to.equal(true);
		expect(inWinterWindow('06-01', '08-31', '05-31')).to.equal(false);
		expect(inWinterWindow('06-01', '08-31', '09-01')).to.equal(false);
	});

	it('returns false on invalid bounds', () => {
		expect(inWinterWindow('bad', '03-15', '01-01')).to.equal(false);
	});
});

describe('lib/control/winter – frostActive', () => {
	it('activates at/below the threshold and releases past threshold + hysteresis', () => {
		expect(frostActive(2, 2, 1, false)).to.equal(true); // at threshold
		expect(frostActive(3, 2, 1, false)).to.equal(false); // above threshold, not yet active
		expect(frostActive(3, 2, 1, true)).to.equal(true); // still within hysteresis band
		expect(frostActive(3.5, 2, 1, true)).to.equal(false); // clearly warmed up → release
	});

	it('keeps the hole open (true) when no reading is available', () => {
		expect(frostActive(null, 2, 1, false)).to.equal(true);
		expect(frostActive(undefined, 2, 1, true)).to.equal(true);
		expect(frostActive(NaN, 2, 1, false)).to.equal(true);
	});
});

describe('lib/control/winter – resolveWinter', () => {
	const base = {
		enabled: true,
		start: '11-01',
		end: '03-15',
		monthDay: '12-24',
		frostProtect: false,
		airTemp: null,
		threshold: 2,
		hysteresis: 1,
		wasFrostActive: false,
		pointCount: 3,
		affectedPoints: [],
	};

	it('is inactive when disabled', () => {
		const r = resolveWinter({ ...base, enabled: false });
		expect(r.active).to.equal(false);
		expect(r.forcedOn).to.deep.equal([false, false, false]);
	});

	it('is inactive outside the window', () => {
		const r = resolveWinter({ ...base, monthDay: '07-01' });
		expect(r.active).to.equal(false);
		expect(r.forcedOn).to.deep.equal([false, false, false]);
	});

	it('forces all points on inside the window when no selection is given', () => {
		const r = resolveWinter(base);
		expect(r.active).to.equal(true);
		expect(r.forcedOn).to.deep.equal([true, true, true]);
	});

	it('forces only the selected points on', () => {
		const r = resolveWinter({ ...base, affectedPoints: [1] });
		expect(r.active).to.equal(true);
		expect(r.forcedOn).to.deep.equal([false, true, false]);
	});

	it('gates on frost when frost protection is enabled', () => {
		const warm = resolveWinter({ ...base, frostProtect: true, airTemp: 8 });
		expect(warm.active).to.equal(false);
		expect(warm.inWindow).to.equal(true);
		expect(warm.forcedOn).to.deep.equal([false, false, false]);

		const cold = resolveWinter({ ...base, frostProtect: true, airTemp: -1 });
		expect(cold.active).to.equal(true);
		expect(cold.forcedOn).to.deep.equal([true, true, true]);
	});

	it('keeps forcing when frost protection has no reading (fail-safe)', () => {
		const r = resolveWinter({ ...base, frostProtect: true, airTemp: null });
		expect(r.active).to.equal(true);
	});
});
