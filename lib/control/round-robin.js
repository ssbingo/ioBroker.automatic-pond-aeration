'use strict';

/*
 * Cyclic round-robin controller (pure). Rotates through an ordered list of aeration points,
 * keeping exactly one point open for `dwellSec` seconds before advancing to the next. The
 * elapsed time since the rotation started is passed in, so the function stays pure.
 */

/**
 * The position within the rotation order that is active for the given elapsed time.
 *
 * @param {number[]} order - point indices in rotation order
 * @param {number} dwellSec - seconds each point stays open
 * @param {number} elapsedMs - milliseconds since the rotation started
 * @returns {number} index into `order` (0-based), or -1 when the rotation is empty/disabled
 */
function roundRobinSlot(order, dwellSec, elapsedMs) {
	const len = Array.isArray(order) ? order.length : 0;
	const dwell = Number(dwellSec);
	if (len === 0 || !(dwell >= 1)) {
		return -1;
	}
	const elapsed = Math.max(0, Number(elapsedMs) || 0);
	const slots = Math.floor(elapsed / 1000 / dwell);
	return ((slots % len) + len) % len;
}

/**
 * Per-point desired open state for the round-robin at the given elapsed time.
 *
 * @param {number[]} order - point indices in rotation order (empty = all points in order)
 * @param {number} dwellSec - seconds each point stays open
 * @param {number} elapsedMs - milliseconds since the rotation started
 * @param {number} pointCount - number of aeration points
 * @returns {boolean[]} desired open state per point (length = pointCount)
 */
function roundRobinDesired(order, dwellSec, elapsedMs, pointCount) {
	const desired = new Array(pointCount).fill(false);
	// Default order = all points 0..pointCount-1 when none configured.
	const ord = Array.isArray(order) && order.length ? order : Array.from({ length: pointCount }, (_v, i) => i);
	const slot = roundRobinSlot(ord, dwellSec, elapsedMs);
	if (slot >= 0) {
		const pointIndex = ord[slot];
		if (pointIndex >= 0 && pointIndex < pointCount) {
			desired[pointIndex] = true;
		}
	}
	return desired;
}

module.exports = {
	roundRobinSlot,
	roundRobinDesired,
};
