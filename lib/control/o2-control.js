'use strict';

/*
 * Dissolved-oxygen closed-loop control (pure).
 *
 * The monitoring layer (lib/monitoring/alarms.js) only raises an alarm when the oxygen
 * drops too low. This module turns that reading into an actuator decision: while the
 * oxygen is below the low threshold the selected aeration points are forced on ("oxygen
 * boost"), and the boost is only released again once the oxygen has recovered to the
 * target (or, when no separate target is set, to `low + hysteresis`). Target-based
 * hysteresis avoids rapid on/off cycling around a single threshold.
 *
 * Pure helpers only; main.js feeds the resulting mask into the arbiter as a `forcedOn`
 * input, exactly like winter mode.
 */

/**
 * Decide whether the oxygen boost should be active.
 *
 * Starts boosting when the reading is below `low`; keeps boosting until it recovers to the
 * release level, which is `target` when a valid target is configured, otherwise
 * `low + hysteresis`. Returns the previous state unchanged only through the caller — with no
 * usable reading or threshold the boost is off.
 *
 * @param {number | null | undefined} value - current dissolved-oxygen reading (mg/L)
 * @param {number | null | undefined} low - low threshold (null/undefined = control disabled)
 * @param {number | null | undefined} target - recovery target (null = use low + hysteresis)
 * @param {number} hysteresis - recovery margin used when no target is set
 * @param {boolean} wasBoosting - previous boost state
 * @returns {boolean} the new boost state
 */
function oxygenBoostActive(value, low, target, hysteresis, wasBoosting) {
	if (low === null || low === undefined || value === null || value === undefined) {
		return false;
	}
	const v = Number(value);
	const lo = Number(low);
	if (!Number.isFinite(v) || !Number.isFinite(lo)) {
		return false;
	}
	const hasTarget = target !== null && target !== undefined && Number.isFinite(Number(target));
	const release = hasTarget ? Number(target) : lo + (Number(hysteresis) || 0);
	if (wasBoosting) {
		return v < release; // keep boosting until it recovers to the release level
	}
	return v < lo; // start boosting once it drops below the low threshold
}

/**
 * Resolve the oxygen closed loop for the current reading and produce the per-point
 * "force on" mask for the arbiter.
 *
 * @param {{ enabled: boolean, value?: number|null, low?: number|null, target?: number|null, hysteresis: number, wasBoosting: boolean, pointCount: number, affectedPoints: number[] }} ctx - the oxygen-control context
 * @returns {{ boosting: boolean, forcedOn: boolean[] }} the resolved state and force-on mask
 */
function resolveOxygenControl(ctx) {
	const pointCount = Math.max(0, Number(ctx.pointCount) || 0);
	const empty = new Array(pointCount).fill(false);
	if (!ctx.enabled) {
		return { boosting: false, forcedOn: empty };
	}
	const boosting = oxygenBoostActive(ctx.value, ctx.low, ctx.target, ctx.hysteresis, ctx.wasBoosting);
	if (!boosting) {
		return { boosting: false, forcedOn: empty };
	}
	// Empty selection means "all points".
	const affected = Array.isArray(ctx.affectedPoints) ? ctx.affectedPoints : [];
	const forcedOn = new Array(pointCount).fill(affected.length === 0);
	for (const idx of affected) {
		if (Number.isInteger(idx) && idx >= 0 && idx < pointCount) {
			forcedOn[idx] = true;
		}
	}
	return { boosting: true, forcedOn };
}

module.exports = {
	oxygenBoostActive,
	resolveOxygenControl,
};
