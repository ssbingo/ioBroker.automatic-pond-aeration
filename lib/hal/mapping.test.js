'use strict';

const { expect } = require('chai');
const { valveCommandValue, interpretValveValue, looseEquals } = require('./mapping');

describe('lib/hal/mapping – valveCommandValue', () => {
	it('returns the configured on/off representation', () => {
		expect(valveCommandValue(true, true, false)).to.equal(true);
		expect(valveCommandValue(false, true, false)).to.equal(false);
		expect(valveCommandValue(true, 1, 0)).to.equal(1);
		expect(valveCommandValue(false, 'ON', 'OFF')).to.equal('OFF');
	});
});

describe('lib/hal/mapping – interpretValveValue', () => {
	it('matches the exact configured values', () => {
		expect(interpretValveValue(true, true, false)).to.equal(true);
		expect(interpretValveValue(false, true, false)).to.equal(false);
		expect(interpretValveValue('ON', 'ON', 'OFF')).to.equal(true);
		expect(interpretValveValue('OFF', 'ON', 'OFF')).to.equal(false);
	});
	it('treats 1/0 and booleans loosely (relay reports 1 for onValue true)', () => {
		expect(interpretValveValue(1, true, false)).to.equal(true);
		expect(interpretValveValue(0, true, false)).to.equal(false);
		expect(interpretValveValue(true, 1, 0)).to.equal(true);
	});
	it('falls back to truthiness for unrelated values', () => {
		expect(interpretValveValue(42, true, false)).to.equal(true);
		expect(interpretValveValue('', true, false)).to.equal(false);
		expect(interpretValveValue(null, true, false)).to.equal(false);
	});
});

describe('lib/hal/mapping – looseEquals', () => {
	it('equates on/off encodings', () => {
		expect(looseEquals(1, true)).to.equal(true);
		expect(looseEquals('OFF', false)).to.equal(true);
		expect(looseEquals('on', true)).to.equal(true);
		expect(looseEquals(2, true)).to.equal(false);
		expect(looseEquals('foo', 'bar')).to.equal(false);
	});
});
