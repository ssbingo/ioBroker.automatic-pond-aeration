'use strict';

const { expect } = require('chai');
const { buildObjectModel, computeObsolete, MANAGED_PREFIXES } = require('./objects');
const { validateConfig } = require('./config');

/** Build a model from a raw config (validated first, as main.js does). */
function modelFor(raw) {
	return buildObjectModel(validateConfig(raw).config);
}

describe('lib/objects – buildObjectModel', () => {
	it('creates the always-present base tree for an empty config', () => {
		const ids = new Set(modelFor({}).map(m => m.id));
		for (const id of ['info', 'info.connection', 'control', 'control.enabled', 'control.mode', 'control.allOff', 'safety', 'safety.interlockActive', 'astro', 'location', 'statistics']) {
			expect(ids.has(id), `missing ${id}`).to.equal(true);
		}
		// no dynamic subtrees without configuration
		expect(ids.has('aeration')).to.equal(false);
		expect(ids.has('groups')).to.equal(false);
		expect(ids.has('sensors')).to.equal(false);
		expect(ids.has('feeder')).to.equal(false);
	});

	it('creates per-point control and status objects', () => {
		const ids = new Set(modelFor({ points: [{ name: 'A' }, { name: 'B' }] }).map(m => m.id));
		for (const id of ['aeration', 'aeration.point', 'aeration.point.0', 'aeration.point.0.valveState', 'aeration.point.1.runtimeTotalH', 'control.point', 'control.point.0.open', 'control.point.1.open']) {
			expect(ids.has(id), `missing ${id}`).to.equal(true);
		}
	});

	it('creates group and group-command objects', () => {
		const ids = new Set(modelFor({ points: [{ name: 'A' }, { name: 'B' }], groups: [{ name: 'G', members: [0, 1] }] }).map(m => m.id));
		for (const id of ['groups', 'groups.0', 'groups.0.members', 'groups.0.active', 'control.group', 'control.group.0.active']) {
			expect(ids.has(id), `missing ${id}`).to.equal(true);
		}
	});

	it('creates sensor states only when enabled', () => {
		const off = new Set(modelFor({}).map(m => m.id));
		expect(off.has('sensors.oxygen')).to.equal(false);
		const on = new Set(modelFor({ o2Enabled: true, o2ObjectId: 'x', pressureEnabled: true, pressureObjectId: 'y' }).map(m => m.id));
		expect(on.has('sensors')).to.equal(true);
		expect(on.has('sensors.oxygen')).to.equal(true);
		expect(on.has('sensors.pressure')).to.equal(true);
		expect(on.has('sensors.airTemperature')).to.equal(false);
	});

	it('creates feeder states only when enabled', () => {
		expect(new Set(modelFor({}).map(m => m.id)).has('feeder')).to.equal(false);
		expect(new Set(modelFor({ feederEnabled: true }).map(m => m.id)).has('feeder.pauseActive')).to.equal(true);
	});

	it('produces valid state objects (read/write flags, role, type)', () => {
		const byId = new Map(modelFor({ points: [{ name: 'A' }] }).map(m => [m.id, m.obj]));
		const cmd = byId.get('control.point.0.open');
		expect(cmd.type).to.equal('state');
		expect(cmd.common.write).to.equal(true);
		expect(cmd.common.role).to.equal('switch');
		const status = byId.get('aeration.point.0.valveState');
		expect(status.common.write).to.equal(false);
		expect(status.common.read).to.equal(true);
	});
});

describe('lib/objects – computeObsolete', () => {
	it('returns managed ids that are no longer desired, deepest first', () => {
		const desired = new Set(modelFor({ points: [{ name: 'A' }] }).map(m => m.id));
		const existing = [
			'info.connection', // never managed -> keep
			'control.enabled', // never managed -> keep
			'aeration.point.0.valveState', // still desired -> keep
			'aeration.point.1', // obsolete (only 1 point now)
			'aeration.point.1.valveState', // obsolete
			'groups.0', // obsolete (no groups)
			'sensors.oxygen', // obsolete (sensor disabled)
		];
		const obsolete = computeObsolete(existing, desired);
		expect(obsolete).to.include('aeration.point.1');
		expect(obsolete).to.include('aeration.point.1.valveState');
		expect(obsolete).to.include('groups.0');
		expect(obsolete).to.include('sensors.oxygen');
		expect(obsolete).to.not.include('info.connection');
		expect(obsolete).to.not.include('control.enabled');
		expect(obsolete).to.not.include('aeration.point.0.valveState');
		// deepest first: the child comes before its parent
		expect(obsolete.indexOf('aeration.point.1.valveState')).to.be.lessThan(obsolete.indexOf('aeration.point.1'));
	});

	it('never treats control base states as managed', () => {
		expect(MANAGED_PREFIXES).to.not.include('control');
		const obsolete = computeObsolete(['control.mode', 'control.allOff'], new Set());
		expect(obsolete).to.be.empty;
	});
});
