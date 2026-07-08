'use strict';

const { scheduleDesired, anyScheduleActive } = require('./schedule');
const { roundRobinDesired } = require('./round-robin');
const { sequenceDesired } = require('./sequence');

/*
 * Arbiter (pure) – computes the desired open state of every aeration point from the active
 * control sources, by priority:
 *   1. master disabled / mode "off" → all valves closed
 *   2. mode "manual"                → per-point manual commands, OR active groups
 *   3. mode "auto"                  → schedule; round-robin only while no schedule is active
 *                                     (schedule has priority); plus explicitly activated groups
 *                                     and the automatic "force on" programs (winter/ice-free
 *                                     mode and the oxygen closed loop, passed in as `forcedOn`)
 * The safety interlock (lib/safety.js) is applied on top of the result by the adapter, so the
 * arbiter never has to know about the pump or the emergency valve. The feeder pause
 * (`feederForcedOff`) is applied after the mode result. Finally the per-point manual override
 * buttons (`buttonOn`) are OR-ed in last: a pressed button forces its channel open with higher
 * priority than the automatic programs and even over a feeder pause — only the master switch
 * being off (all closed) or the safety interlock may override it.
 */

/**
 * OR-in the member points of every active group into the desired array (mutates it).
 *
 * @param {boolean[]} desired - the desired-open array (mutated)
 * @param {boolean[]} groupActive - active flag per group
 * @param {ioBroker.AerationGroupConfig[]} groups - configured groups
 * @returns {void}
 */
function applyGroups(desired, groupActive, groups) {
	const active = Array.isArray(groupActive) ? groupActive : [];
	(Array.isArray(groups) ? groups : []).forEach((g, gi) => {
		if (active[gi]) {
			for (const m of g.members) {
				if (m >= 0 && m < desired.length) {
					desired[m] = true;
				}
			}
		}
	});
}

/**
 * Compute the desired open state of every aeration point.
 *
 * @param {{ points: ioBroker.AerationPointConfig[], groups: ioBroker.AerationGroupConfig[], schedules: ioBroker.AerationScheduleConfig[], masterEnable: boolean, mode: string, manual: boolean[], groupActive: boolean[], roundRobinEnabled: boolean, roundRobinOrder: number[], roundRobinDwellSec: number, sequenceSteps?: Array<{ targetId: string, dwellSec?: number }>, nowDay: number, nowMinutes: number, elapsedMs: number, forcedOn?: boolean[], feederForcedOff?: boolean[], buttonOn?: boolean[] }} ctx - the control context
 * @returns {boolean[]} desired open state per point (length = points.length)
 */
function resolveDesiredValves(ctx) {
	const points = Array.isArray(ctx.points) ? ctx.points : [];
	const pointCount = points.length;
	const desired = new Array(pointCount).fill(false);

	// Feeder pause: force the affected points off, on top of the mode result (it applies in
	// both auto and manual, so aeration is always paused during feeding).
	const forcedOff = Array.isArray(ctx.feederForcedOff) ? ctx.feederForcedOff : [];
	const applyFeederPause = () => {
		for (let i = 0; i < pointCount; i++) {
			if (forcedOff[i]) {
				desired[i] = false;
			}
		}
		return desired;
	};

	// Manual override buttons: force the channel open with the highest control priority (wins over
	// the automatic programs and even over a feeder pause). Applied last; only the master switch
	// being off (handled above) or the safety interlock (applied by the adapter) may override it.
	const buttons = Array.isArray(ctx.buttonOn) ? ctx.buttonOn : [];
	const applyButtons = () => {
		for (let i = 0; i < pointCount; i++) {
			if (buttons[i]) {
				desired[i] = true;
			}
		}
		return desired;
	};

	// Master off = everything closed; buttons are ignored (deliberate master kill).
	if (!ctx.masterEnable) {
		return desired;
	}

	// mode "off": no automatic program runs, but a pressed override button still opens its channel.
	if (ctx.mode === 'off') {
		applyFeederPause();
		return applyButtons();
	}

	if (ctx.mode === 'manual') {
		const manual = Array.isArray(ctx.manual) ? ctx.manual : [];
		for (let i = 0; i < pointCount; i++) {
			desired[i] = Boolean(manual[i]);
		}
		applyGroups(desired, ctx.groupActive, ctx.groups);
		applyFeederPause();
		return applyButtons();
	}

	// mode 'auto': schedule first
	const sched = scheduleDesired(ctx.schedules, points, ctx.groups, ctx.nowDay, ctx.nowMinutes);
	for (let i = 0; i < pointCount; i++) {
		if (sched[i]) {
			desired[i] = true;
		}
	}

	// cyclic program only while no schedule is active (schedule has priority). When a sequence of
	// steps is configured it drives the cycle (points and/or groups, mixed); otherwise it falls
	// back to the plain round-robin over all points.
	if (ctx.roundRobinEnabled && !anyScheduleActive(ctx.schedules, ctx.nowDay, ctx.nowMinutes)) {
		const steps = Array.isArray(ctx.sequenceSteps) ? ctx.sequenceSteps : [];
		const rr = steps.length
			? sequenceDesired(steps, points, ctx.groups, ctx.roundRobinDwellSec, ctx.elapsedMs)
			: roundRobinDesired(ctx.roundRobinOrder, ctx.roundRobinDwellSec, ctx.elapsedMs, pointCount);
		for (let i = 0; i < pointCount; i++) {
			if (rr[i]) {
				desired[i] = true;
			}
		}
	}

	// explicitly activated groups always OR-in
	applyGroups(desired, ctx.groupActive, ctx.groups);

	// automatic force-on programs (winter/ice-free mode, oxygen closed loop) OR-in on top
	const forcedOn = Array.isArray(ctx.forcedOn) ? ctx.forcedOn : [];
	for (let i = 0; i < pointCount; i++) {
		if (forcedOn[i]) {
			desired[i] = true;
		}
	}
	applyFeederPause();
	return applyButtons();
}

module.exports = {
	resolveDesiredValves,
	applyGroups,
};
