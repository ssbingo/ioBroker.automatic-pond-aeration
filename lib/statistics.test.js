'use strict';

const { expect } = require('chai');
const { elapsedSec, localDayKey, sameLocalDay, secToHours } = require('./statistics');

describe('lib/statistics – elapsedSec', () => {
	it('returns the positive delta in seconds', () => {
		expect(elapsedSec(1000, 4000)).to.equal(3);
	});

	it('clamps a backwards clock jump to 0', () => {
		expect(elapsedSec(4000, 1000)).to.equal(0);
	});

	it('returns 0 for non-finite input', () => {
		expect(elapsedSec(NaN, 1000)).to.equal(0);
	});
});

describe('lib/statistics – localDayKey / sameLocalDay', () => {
	it('formats the local day as YYYY-MM-DD', () => {
		const key = localDayKey(new Date(2026, 0, 5, 12, 0, 0).getTime());
		expect(key).to.equal('2026-01-05');
	});

	it('treats timestamps on the same local day as equal', () => {
		const morning = new Date(2026, 6, 7, 6, 0, 0).getTime();
		const evening = new Date(2026, 6, 7, 23, 0, 0).getTime();
		const nextDay = new Date(2026, 6, 8, 0, 30, 0).getTime();
		expect(sameLocalDay(morning, evening)).to.equal(true);
		expect(sameLocalDay(evening, nextDay)).to.equal(false);
	});
});

describe('lib/statistics – secToHours', () => {
	it('converts seconds to hours rounded to 0.01', () => {
		expect(secToHours(3600)).to.equal(1);
		expect(secToHours(1800)).to.equal(0.5);
		expect(secToHours(90)).to.equal(0.03);
	});
});
