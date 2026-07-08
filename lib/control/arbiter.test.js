'use strict';

const { expect } = require('chai');
const { resolveDesiredValves } = require('./arbiter');

const points = [
	{ id: 'pt-0', name: 'A' },
	{ id: 'pt-1', name: 'B' },
	{ id: 'pt-2', name: 'C' },
];
const groups = [{ id: 'grp-0', name: 'G', members: [1, 2] }];

/** Build a full arbiter context with sensible defaults, overridable per test. */
function ctx(overrides) {
	return {
		points,
		groups,
		schedules: [],
		masterEnable: true,
		mode: 'auto',
		manual: [false, false, false],
		groupActive: [false],
		roundRobinEnabled: false,
		roundRobinOrder: [],
		roundRobinDwellSec: 60,
		nowDay: 1,
		nowMinutes: 600,
		elapsedMs: 0,
		...overrides,
	};
}

describe('lib/control/arbiter – resolveDesiredValves', () => {
	it('closes everything when the master is disabled', () => {
		expect(resolveDesiredValves(ctx({ masterEnable: false }))).to.deep.equal([false, false, false]);
	});

	it('closes everything in mode "off"', () => {
		expect(resolveDesiredValves(ctx({ mode: 'off', manual: [true, true, true] }))).to.deep.equal([false, false, false]);
	});

	it('follows the manual commands in mode "manual"', () => {
		expect(resolveDesiredValves(ctx({ mode: 'manual', manual: [true, false, true] }))).to.deep.equal([true, false, true]);
	});

	it('OR-s in active groups (in manual and auto)', () => {
		expect(resolveDesiredValves(ctx({ mode: 'manual', manual: [true, false, false], groupActive: [true] }))).to.deep.equal([true, true, true]);
		expect(resolveDesiredValves(ctx({ mode: 'auto', groupActive: [true] }))).to.deep.equal([false, true, true]);
	});

	it('opens the scheduled targets in mode "auto"', () => {
		const schedules = [{ enabled: true, days: [], from: '08:00', to: '18:00', targets: ['pt-0'] }];
		expect(resolveDesiredValves(ctx({ schedules }))).to.deep.equal([true, false, false]);
	});

	it('runs round-robin in auto when no schedule is active', () => {
		expect(resolveDesiredValves(ctx({ roundRobinEnabled: true, roundRobinOrder: [0, 1, 2], elapsedMs: 60_000 }))).to.deep.equal([false, true, false]);
	});

	it('runs a configured sequence over points and groups (mixed) instead of the plain round-robin', () => {
		const steps = [{ targetId: 'pt-0' }, { targetId: 'grp-0' }];
		// grp-0 = members [1, 2]; at 60 s the second step (the group) is active
		const d = resolveDesiredValves(ctx({ roundRobinEnabled: true, sequenceSteps: steps, roundRobinDwellSec: 60, elapsedMs: 60_000 }));
		expect(d).to.deep.equal([false, true, true]);
		// at 0 s the first step (single point 0) is active
		expect(resolveDesiredValves(ctx({ roundRobinEnabled: true, sequenceSteps: steps, roundRobinDwellSec: 60, elapsedMs: 0 }))).to.deep.equal([true, false, false]);
	});

	it('lets an active schedule suppress round-robin (schedule has priority)', () => {
		const schedules = [{ enabled: true, days: [], from: '08:00', to: '18:00', targets: ['pt-0'] }];
		const d = resolveDesiredValves(ctx({ schedules, roundRobinEnabled: true, roundRobinOrder: [0, 1, 2], elapsedMs: 60_000 }));
		expect(d).to.deep.equal([true, false, false]); // only the scheduled point, not the round-robin point
	});

	it('applies the feeder pause on top of auto and manual (forces affected points off)', () => {
		const schedules = [{ enabled: true, days: [], from: '08:00', to: '18:00', targets: ['pt-0'] }];
		// auto: point 0 is scheduled open, but the feeder pause forces it closed
		expect(resolveDesiredValves(ctx({ schedules, feederForcedOff: [true, false, false] }))).to.deep.equal([false, false, false]);
		// manual: point 0 is manually on, but the feeder pause forces it closed (other points unaffected)
		expect(resolveDesiredValves(ctx({ mode: 'manual', manual: [true, true, false], feederForcedOff: [true, false, false] }))).to.deep.equal([false, true, false]);
	});

	it('OR-s in the automatic force-on mask in auto mode (winter / oxygen boost)', () => {
		// nothing scheduled, but the force-on mask keeps point 2 open
		expect(resolveDesiredValves(ctx({ forcedOn: [false, false, true] }))).to.deep.equal([false, false, true]);
	});

	it('does not force points on in manual or off mode', () => {
		expect(resolveDesiredValves(ctx({ mode: 'manual', manual: [false, false, false], forcedOn: [true, true, true] }))).to.deep.equal([false, false, false]);
		expect(resolveDesiredValves(ctx({ mode: 'off', forcedOn: [true, true, true] }))).to.deep.equal([false, false, false]);
	});

	it('lets the feeder pause win over the force-on mask (feeding always pauses)', () => {
		// point 0 forced on by winter/oxygen, but the feeder pause still closes it
		expect(resolveDesiredValves(ctx({ forcedOn: [true, false, false], feederForcedOff: [true, false, false] }))).to.deep.equal([false, false, false]);
	});
});
