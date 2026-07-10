'use strict';

const { expect } = require('chai');
const { evaluateSafety, planValveTransition, pumpShouldRun, canSwitchPump } = require('./safety');

const base = {
	valveOpen: [],
	pumpRunning: false,
	pumpMonitored: true,
	pumpControllable: true,
	minOpenValves: 1,
};

describe('lib/safety – evaluateSafety (dead-head interlock)', () => {
	it('is safe when the pump is off, even with all valves closed', () => {
		const d = evaluateSafety({ ...base, valveOpen: [false, false], pumpRunning: false });
		expect(d.interlockActive).to.equal(false);
		expect(d.emergencyValve).to.equal(false);
		expect(d.stopPump).to.equal(false);
		expect(d.tripReason).to.equal(null);
	});

	it('TRIPS when the pump runs and all valves are closed', () => {
		const d = evaluateSafety({ ...base, valveOpen: [false, false], pumpRunning: true });
		expect(d.interlockActive).to.equal(true);
		expect(d.emergencyValve).to.equal(true);
		expect(d.stopPump).to.equal(true);
		expect(d.openValveCount).to.equal(0);
		expect(d.tripReason).to.match(/emergency valve opened and pump stopped/);
	});

	it('is safe when the pump runs and at least one valve is open', () => {
		const d = evaluateSafety({ ...base, valveOpen: [true, false], pumpRunning: true });
		expect(d.interlockActive).to.equal(false);
		expect(d.emergencyValve).to.equal(false);
	});

	it('does not stop the pump when it is not controllable, but still opens the emergency valve', () => {
		const d = evaluateSafety({ ...base, valveOpen: [false], pumpRunning: true, pumpControllable: false });
		expect(d.emergencyValve).to.equal(true);
		expect(d.stopPump).to.equal(false);
		expect(d.tripReason).to.match(/emergency valve opened\./);
		expect(d.tripReason).to.not.match(/pump stopped/);
	});

	it('honours minOpenValves > 1', () => {
		expect(evaluateSafety({ ...base, valveOpen: [true, false], pumpRunning: true, minOpenValves: 2 }).interlockActive).to.equal(true);
		expect(evaluateSafety({ ...base, valveOpen: [true, true], pumpRunning: true, minOpenValves: 2 }).interlockActive).to.equal(false);
	});

	it('assumes the pump could run when it is not monitored (conservative)', () => {
		const d = evaluateSafety({ ...base, valveOpen: [false], pumpRunning: false, pumpMonitored: false });
		expect(d.interlockActive).to.equal(true);
		expect(d.emergencyValve).to.equal(true);
		expect(d.tripReason).to.match(/not monitored/);
	});

	it('treats minOpenValves < 1 as 1', () => {
		const d = evaluateSafety({ ...base, valveOpen: [false], pumpRunning: true, minOpenValves: 0 });
		expect(d.interlockActive).to.equal(true);
	});
});

describe('lib/safety – planValveTransition (make-before-break)', () => {
	it('opens the new valve before closing the old one', () => {
		const { open, close } = planValveTransition([true, false], [false, true]);
		expect(open).to.deep.equal([1]);
		expect(close).to.deep.equal([0]);
	});

	it('returns no changes when current equals target', () => {
		const { open, close } = planValveTransition([true, false], [true, false]);
		expect(open).to.be.empty;
		expect(close).to.be.empty;
	});

	it('never produces an all-closed intermediate step for a rotation', () => {
		// simulate applying "open first": union of current and newly opened must stay > 0
		const current = [true, false, false];
		const target = [false, true, false];
		const { open, close } = planValveTransition(current, target);
		const afterOpen = current.map((v, i) => v || open.includes(i));
		expect(afterOpen.filter(Boolean).length).to.be.greaterThan(0);
		const afterClose = afterOpen.map((v, i) => v && !close.includes(i));
		expect(afterClose).to.deep.equal(target);
	});
});

describe('lib/safety – canSwitchPump (anti short-cycle)', () => {
	const t0 = 1_000_000;
	it('allows a change when the minimum hold time has passed', () => {
		expect(canSwitchPump(true, false, t0, t0 + 60_000, 30, 30)).to.equal(true);
	});
	it('blocks turning off before the minimum on-time', () => {
		expect(canSwitchPump(false, true, t0, t0 + 10_000, 30, 30)).to.equal(false);
	});
	it('blocks turning on before the minimum off-time', () => {
		expect(canSwitchPump(true, false, t0, t0 + 5_000, 30, 30)).to.equal(false);
	});
	it('always allows a no-op (no state change)', () => {
		expect(canSwitchPump(true, true, t0, t0, 999, 999)).to.equal(true);
	});
});

describe('lib/safety – pumpShouldRun (pump follows aeration)', () => {
	it('runs the pump while enough valves are open', () => {
		expect(pumpShouldRun(false, 1, 1)).to.equal(true);
		expect(pumpShouldRun(false, 3, 2)).to.equal(true);
	});
	it('keeps the pump off when the pond is idle (no valves open)', () => {
		expect(pumpShouldRun(false, 0, 1)).to.equal(false);
	});
	it('keeps the pump off when fewer than the minimum valves are open', () => {
		expect(pumpShouldRun(false, 1, 2)).to.equal(false);
	});
	it('keeps the pump off while the dead-head interlock is tripped', () => {
		expect(pumpShouldRun(true, 5, 1)).to.equal(false);
	});
	it('treats a missing/invalid minimum as 1', () => {
		expect(pumpShouldRun(false, 1, 0)).to.equal(true);
		expect(pumpShouldRun(false, 0, undefined)).to.equal(false);
	});
});
