'use strict';

const { expect } = require('chai');
const { validateConfig, normalizePoint, clampNumber, MAX_AERATION_POINTS } = require('./config');

describe('lib/config – clampNumber', () => {
	it('clamps into range', () => {
		expect(clampNumber(5, 0, 10, 1)).to.equal(5);
		expect(clampNumber(-3, 0, 10, 1)).to.equal(0);
		expect(clampNumber(99, 0, 10, 1)).to.equal(10);
	});
	it('uses the fallback for non-numbers', () => {
		expect(clampNumber('x', 0, 10, 7)).to.equal(7);
		expect(clampNumber(undefined, 0, 10, 7)).to.equal(7);
		expect(clampNumber(NaN, 0, 10, 7)).to.equal(7);
	});
	it('accepts numeric strings', () => {
		expect(clampNumber('4', 0, 10, 1)).to.equal(4);
	});
});

describe('lib/config – normalizePoint', () => {
	it('fills defaults for an empty point', () => {
		const p = normalizePoint({}, 2, 'iobroker');
		expect(p.id).to.equal('pt-2');
		expect(p.name).to.equal('Point 3');
		expect(p.enabled).to.equal(true);
		expect(p.backendType).to.equal('iobroker');
		expect(p.onValue).to.equal(true);
		expect(p.offValue).to.equal(false);
	});
	it('keeps a provided id/name and honours esp32 backend', () => {
		const p = normalizePoint({ id: 'x', name: ' Pier ', backendType: 'esp32', enabled: false }, 0, 'iobroker');
		expect(p.id).to.equal('x');
		expect(p.name).to.equal('Pier');
		expect(p.backendType).to.equal('esp32');
		expect(p.enabled).to.equal(false);
	});
});

describe('lib/config – validateConfig', () => {
	it('handles an empty configuration without throwing', () => {
		const { config, errors, warnings } = validateConfig({});
		expect(errors).to.be.an('array').that.is.empty;
		expect(warnings).to.be.an('array');
		expect(config.points).to.be.an('array').that.is.empty;
		expect(config.groups).to.be.an('array').that.is.empty;
		expect(config.minOpenValves).to.equal(1);
		expect(config.controlBackend).to.equal('iobroker');
	});

	it('truncates more than 8 points and warns', () => {
		const points = Array.from({ length: 10 }, (_, i) => ({ name: `P${i}` }));
		const { config, warnings } = validateConfig({ points });
		expect(config.points).to.have.lengthOf(MAX_AERATION_POINTS);
		expect(warnings.join(' ')).to.match(/maximum is 8/);
	});

	it('rejects more groups than points (hard rule) and drops the extras', () => {
		const { config, errors } = validateConfig({
			points: [{ name: 'A' }],
			groups: [{ name: 'G1' }, { name: 'G2' }],
		});
		expect(config.groups).to.have.lengthOf(1);
		expect(errors.join(' ')).to.match(/more groups .* than aeration points/i);
	});

	it('drops invalid group members and warns', () => {
		const { config, warnings } = validateConfig({
			points: [{ name: 'A' }, { name: 'B' }],
			groups: [{ name: 'G', members: [0, 5, 1, 1] }],
		});
		expect(config.groups[0].members).to.deep.equal([0, 1]);
		expect(warnings.join(' ')).to.match(/non-existent aeration point/);
	});

	it('clamps minOpenValves to at least 1 and warns', () => {
		const { config, warnings } = validateConfig({ minOpenValves: 0 });
		expect(config.minOpenValves).to.equal(1);
		expect(warnings.join(' ')).to.match(/at least 1 valve/);
	});

	it('warns when a shared location has no coordinates', () => {
		const { warnings } = validateConfig({ locationMode: 'shared', latitude: '', longitude: '' });
		expect(warnings.join(' ')).to.match(/latitude\/longitude are empty/);
	});

	it('warns when an enabled sensor has no source', () => {
		const { warnings } = validateConfig({ o2Enabled: true, o2ObjectId: '' });
		expect(warnings.join(' ')).to.match(/oxygen monitoring is enabled/i);
	});

	it('normalizes the emergency valve type', () => {
		expect(validateConfig({ emergencyValveType: 'motorBallValve' }).config.emergencyValveType).to.equal('motorBallValve');
		expect(validateConfig({ emergencyValveType: 'nonsense' }).config.emergencyValveType).to.equal('solenoid');
	});

	it('defaults and validates the winter window dates', () => {
		const ok = validateConfig({ winterEnabled: true, winterStart: '10-15', winterEnd: '04-01' }).config;
		expect(ok.winterStart).to.equal('10-15');
		expect(ok.winterEnd).to.equal('04-01');
		const bad = validateConfig({ winterEnabled: true, winterStart: '99-99', winterEnd: 'x' });
		expect(bad.config.winterStart).to.equal('11-01');
		expect(bad.config.winterEnd).to.equal('03-15');
		expect(bad.warnings.some(w => /Winter start/.test(w))).to.equal(true);
	});

	it('clamps the winter air-temperature threshold and warns without air-temp monitoring', () => {
		const c = validateConfig({ winterEnabled: true, winterFrostProtect: true, winterAirTempThreshold: 99 });
		expect(c.config.winterAirTempThreshold).to.equal(40);
		expect(c.warnings.some(w => /frost protection needs air-temperature/.test(w))).to.equal(true);
	});

	it('sanitizes the winter/oxygen/feeder affected-point indices to valid, unique in-range ints', () => {
		const points = [{ id: 'pt-0' }, { id: 'pt-1' }];
		const c = validateConfig({ points, winterAffectedPoints: [0, 5, 1, 1, -1], o2AffectedPoints: [1, 9], feederAffectedPoints: [0] }).config;
		expect(c.winterAffectedPoints).to.deep.equal([0, 1]);
		expect(c.o2AffectedPoints).to.deep.equal([1]);
		expect(c.feederAffectedPoints).to.deep.equal([0]);
	});

	it('warns when the oxygen closed loop is enabled without monitoring or a threshold', () => {
		const c = validateConfig({ o2ControlEnabled: true, o2Enabled: false, o2LowThreshold: null });
		expect(c.warnings.some(w => /oxygen closed loop/.test(w))).to.equal(true);
	});

	it('exposes the dry-run flag as a boolean', () => {
		expect(validateConfig({ dryRun: true }).config.dryRun).to.equal(true);
		expect(validateConfig({}).config.dryRun).to.equal(false);
	});
});
