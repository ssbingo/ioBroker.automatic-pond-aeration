'use strict';

const { expect } = require('chai');
const {
	SUPPORTED_PROTOCOL,
	FIRMWARE_RECOMMENDED,
	FIRMWARE_MINIMUM,
	compareSemver,
	evaluateFirmware,
} = require('./firmware-compat');

describe('lib/firmware-compat – compareSemver', () => {
	it('orders versions numerically and ignores a leading v', () => {
		expect(compareSemver('1.0.0', '1.0.1')).to.equal(-1);
		expect(compareSemver('v1.2.0', '1.1.9')).to.equal(1);
		expect(compareSemver('1.1.0', 'v1.1.0')).to.equal(0);
		expect(compareSemver('1.10.0', '1.9.0')).to.equal(1); // not lexicographic
	});
	it('returns null for unparseable input', () => {
		expect(compareSemver('', '1.0.0')).to.equal(null);
		expect(compareSemver('abc', '1.0.0')).to.equal(null);
	});
});

describe('lib/firmware-compat – evaluateFirmware', () => {
	it('flags a protocol mismatch as incompatible', () => {
		const r = evaluateFirmware(FIRMWARE_RECOMMENDED, SUPPORTED_PROTOCOL + 1);
		expect(r.compatible).to.equal(false);
		expect(r.level).to.equal('incompatible');
	});
	it('reports unknown when no protocol is given', () => {
		expect(evaluateFirmware('', null).level).to.equal('unknown');
		expect(evaluateFirmware('', null).compatible).to.equal(false);
	});
	it('marks firmware below the minimum as outdated (but protocol-compatible)', () => {
		const r = evaluateFirmware('0.9.0', SUPPORTED_PROTOCOL);
		expect(r.compatible).to.equal(true);
		expect(r.level).to.equal('outdated');
	});
	it('marks firmware between minimum and recommended as behind', () => {
		// only meaningful when minimum < recommended
		if (compareSemver(FIRMWARE_MINIMUM, FIRMWARE_RECOMMENDED) < 0) {
			const r = evaluateFirmware(FIRMWARE_MINIMUM, SUPPORTED_PROTOCOL);
			expect(r.compatible).to.equal(true);
			expect(r.level).to.equal('behind');
		}
	});
	it('accepts the recommended version as ok and a newer one as newer', () => {
		expect(evaluateFirmware(FIRMWARE_RECOMMENDED, SUPPORTED_PROTOCOL).level).to.equal('ok');
		expect(evaluateFirmware('99.0.0', SUPPORTED_PROTOCOL).level).to.equal('newer');
	});
	it('always exposes the recommended/minimum/protocol for display', () => {
		const r = evaluateFirmware(FIRMWARE_RECOMMENDED, SUPPORTED_PROTOCOL);
		expect(r.recommended).to.equal(FIRMWARE_RECOMMENDED);
		expect(r.minimum).to.equal(FIRMWARE_MINIMUM);
		expect(r.protocol).to.equal(SUPPORTED_PROTOCOL);
	});
});
