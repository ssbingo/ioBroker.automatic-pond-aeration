'use strict';

const { expect } = require('chai');
const { hasValidCoords, computeAstro } = require('./astro');

const BERLIN_LAT = 52.52;
const BERLIN_LON = 13.405;

describe('lib/monitoring/astro – hasValidCoords', () => {
	it('accepts in-range numbers and rejects the rest', () => {
		expect(hasValidCoords(52.5, 13.4)).to.equal(true);
		expect(hasValidCoords(0, 0)).to.equal(true);
		expect(hasValidCoords(NaN, 13)).to.equal(false);
		expect(hasValidCoords(91, 0)).to.equal(false);
		expect(hasValidCoords(0, 181)).to.equal(false);
	});
});

describe('lib/monitoring/astro – computeAstro', () => {
	it('returns ordered sun times for valid coordinates', () => {
		const a = computeAstro(BERLIN_LAT, BERLIN_LON, new Date('2026-07-07T12:00:00Z'));
		expect(a.valid).to.equal(true);
		expect(a.sunrise.getTime()).to.be.lessThan(a.solarNoon.getTime());
		expect(a.solarNoon.getTime()).to.be.lessThan(a.sunset.getTime());
	});
	it('reports day at local noon and night at midnight (summer, Berlin)', () => {
		expect(computeAstro(BERLIN_LAT, BERLIN_LON, new Date('2026-07-07T12:00:00Z')).isNight).to.equal(false);
		expect(computeAstro(BERLIN_LAT, BERLIN_LON, new Date('2026-07-07T00:30:00Z')).isNight).to.equal(true);
	});
	it('is invalid for out-of-range coordinates', () => {
		const a = computeAstro(999, 999, new Date('2026-07-07T12:00:00Z'));
		expect(a.valid).to.equal(false);
		expect(a.isNight).to.equal(false);
	});
});
