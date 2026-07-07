'use strict';

const { expect } = require('chai');
const { evaluateOxygenAlarm, evaluatePressureAlarm, oxygenSaturationPct } = require('./alarms');

describe('lib/monitoring/alarms – evaluateOxygenAlarm', () => {
	it('raises below the threshold', () => {
		expect(evaluateOxygenAlarm(4, 5, 0.5, false)).to.equal(true);
		expect(evaluateOxygenAlarm(6, 5, 0.5, false)).to.equal(false);
	});
	it('holds with hysteresis until it clearly recovers', () => {
		expect(evaluateOxygenAlarm(5.2, 5, 0.5, true)).to.equal(true); // still within hysteresis band
		expect(evaluateOxygenAlarm(5.6, 5, 0.5, true)).to.equal(false); // recovered above 5.5
	});
	it('is disabled when the threshold or value is missing', () => {
		expect(evaluateOxygenAlarm(1, null, 0.5, false)).to.equal(false);
		expect(evaluateOxygenAlarm(null, 5, 0.5, true)).to.equal(false);
	});
});

describe('lib/monitoring/alarms – evaluatePressureAlarm', () => {
	it('raises below min and above max', () => {
		expect(evaluatePressureAlarm(0.5, 1, 3, 0, false)).to.equal(true);
		expect(evaluatePressureAlarm(3.5, 1, 3, 0, false)).to.equal(true);
		expect(evaluatePressureAlarm(2, 1, 3, 0, false)).to.equal(false);
	});
	it('applies hysteresis on clearing', () => {
		expect(evaluatePressureAlarm(1.05, 1, 3, 0.2, true)).to.equal(true); // within clear margin
		expect(evaluatePressureAlarm(1.3, 1, 3, 0.2, true)).to.equal(false); // clearly back inside
	});
	it('is disabled when both bounds are null', () => {
		expect(evaluatePressureAlarm(999, null, null, 0, false)).to.equal(false);
	});
});

describe('lib/monitoring/alarms – oxygenSaturationPct', () => {
	it('is ~100% at the saturation value for a given temperature', () => {
		// Cs(20 °C) ≈ 9.02 mg/L
		expect(oxygenSaturationPct(9.02, 20)).to.be.closeTo(100, 1);
	});
	it('scales with the measured value', () => {
		expect(oxygenSaturationPct(4.51, 20)).to.be.closeTo(50, 1);
	});
	it('returns null when a value is missing', () => {
		expect(oxygenSaturationPct(null, 20)).to.equal(null);
		expect(oxygenSaturationPct(8, null)).to.equal(null);
	});
});
