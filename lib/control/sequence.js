'use strict';

/*
 * Cyclic sequence controller (pure).
 *
 * Generalizes the round-robin: instead of rotating only through single aeration points, it steps
 * through an ordered list of steps where each step targets a **point OR a whole group**, each for
 * its own dwell time (falling back to a default). This lets a user run "group 1, then group 3,
 * then point 0, …" and freely mix single points and groups in one cyclic program.
 *
 * The elapsed time since the cycle started is passed in, so the function stays pure. A group step
 * opens all member points of that group for the step's dwell. The arbiter OR-s the result into the
 * desired mask exactly like the old round-robin, and the safety interlock still runs on top.
 */

/**
 * Effective dwell (seconds, >= 1) of one step: its own `dwellSec` when valid, otherwise the
 * default.
 *
 * @param {{ dwellSec?: number }} step - the sequence step
 * @param {number} defaultDwellSec - fallback dwell
 * @returns {number} the dwell in seconds (>= 1)
 */
function stepDwell(step, defaultDwellSec) {
	const own = step ? Number(step.dwellSec) : NaN;
	if (Number.isFinite(own) && own >= 1) {
		return own;
	}
	const def = Number(defaultDwellSec);
	return Number.isFinite(def) && def >= 1 ? def : 1;
}

/**
 * Index of the step that is active for the given elapsed time, honouring each step's own dwell.
 *
 * @param {Array<{ targetId: string, dwellSec?: number }>} steps - the sequence
 * @param {number} defaultDwellSec - default dwell for steps without their own
 * @param {number} elapsedMs - milliseconds since the cycle started
 * @returns {number} step index (0-based), or -1 when the sequence is empty
 */
function sequenceSlot(steps, defaultDwellSec, elapsedMs) {
	const list = Array.isArray(steps) ? steps : [];
	if (list.length === 0) {
		return -1;
	}
	const dwells = list.map(s => stepDwell(s, defaultDwellSec));
	const total = dwells.reduce((a, b) => a + b, 0);
	if (total <= 0) {
		return -1;
	}
	let t = (Math.max(0, Number(elapsedMs) || 0) / 1000) % total; // position within the cycle
	for (let i = 0; i < dwells.length; i++) {
		if (t < dwells[i]) {
			return i;
		}
		t -= dwells[i];
	}
	return dwells.length - 1; // floating-point guard
}

/**
 * Per-point desired open state for the sequence at the given elapsed time. Each step targets a
 * point id or a group id; a group step opens all its member points.
 *
 * @param {Array<{ targetId: string, dwellSec?: number }>} steps - the sequence
 * @param {ioBroker.AerationPointConfig[]} points - configured points
 * @param {ioBroker.AerationGroupConfig[]} groups - configured groups
 * @param {number} defaultDwellSec - default dwell for steps without their own
 * @param {number} elapsedMs - milliseconds since the cycle started
 * @returns {boolean[]} desired open state per point (length = points.length)
 */
function sequenceDesired(steps, points, groups, defaultDwellSec, elapsedMs) {
	const pts = Array.isArray(points) ? points : [];
	const desired = new Array(pts.length).fill(false);
	const slot = sequenceSlot(steps, defaultDwellSec, elapsedMs);
	if (slot < 0) {
		return desired;
	}
	const targetId = steps[slot] ? steps[slot].targetId : '';
	// A point step opens exactly that point.
	const pointIndex = pts.findIndex(p => p.id === targetId);
	if (pointIndex >= 0) {
		desired[pointIndex] = true;
		return desired;
	}
	// A group step opens every member of the group.
	const group = (Array.isArray(groups) ? groups : []).find(g => g.id === targetId);
	if (group && Array.isArray(group.members)) {
		for (const m of group.members) {
			if (m >= 0 && m < pts.length) {
				desired[m] = true;
			}
		}
	}
	return desired;
}

module.exports = {
	stepDwell,
	sequenceSlot,
	sequenceDesired,
};
