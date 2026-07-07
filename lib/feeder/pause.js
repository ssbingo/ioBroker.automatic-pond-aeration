'use strict';

/*
 * Feeder-coupling helpers (pure). While ioBroker.automatic-feeder is feeding, selected
 * aeration points are paused (forced off) for the feeding time plus a configurable offset,
 * so the food is not blown around and the fish can eat. The stateful timing (edges, offset
 * timer) lives in the adapter; these helpers stay pure and unit-testable.
 */

/**
 * Interpret a watched feeder state value as "feeding is active".
 *
 * @param {unknown} value - the feeder state value
 * @returns {boolean} true if feeding is currently active
 */
function isFeeding(value) {
	return Boolean(value);
}

/**
 * Whether any watched feeder switch is currently feeding.
 *
 * @param {Record<string, boolean>} activeById - feeding-active flag per watched state id
 * @returns {boolean} true if at least one is feeding
 */
function anyFeeding(activeById) {
	return Object.values(activeById || {}).some(Boolean);
}

/**
 * The per-point "force off" mask for the feeder pause: true where the point must be closed.
 *
 * @param {boolean} pauseActive - whether the feeder pause is currently active
 * @param {number[]} affectedPoints - indices of the points that pause during feeding
 * @param {number} pointCount - number of aeration points
 * @returns {boolean[]} mask of forced-off points (length = pointCount)
 */
function feederForcedOff(pauseActive, affectedPoints, pointCount) {
	const mask = new Array(pointCount).fill(false);
	if (!pauseActive) {
		return mask;
	}
	for (const i of Array.isArray(affectedPoints) ? affectedPoints : []) {
		if (Number.isInteger(i) && i >= 0 && i < pointCount) {
			mask[i] = true;
		}
	}
	return mask;
}

module.exports = {
	isFeeding,
	anyFeeding,
	feederForcedOff,
};
