'use strict';

/*
 * Runtime statistics helpers (pure).
 *
 * The adapter samples the current valve/pump states periodically and accumulates how long
 * each aeration point (and the compressor) has been running. These helpers do the arithmetic
 * and the local-day rollover detection so main.js only has to hold the running totals and
 * write the states. Timestamps are passed in as epoch milliseconds, which keeps the functions
 * pure and unit-testable.
 */

/**
 * Seconds elapsed between two epoch-ms timestamps, clamped to >= 0 (never negative when the
 * clock jumps backwards).
 *
 * @param {number} fromMs - earlier timestamp (epoch ms)
 * @param {number} toMs - later timestamp (epoch ms)
 * @returns {number} elapsed seconds (>= 0)
 */
function elapsedSec(fromMs, toMs) {
	const d = (Number(toMs) - Number(fromMs)) / 1000;
	return Number.isFinite(d) && d > 0 ? d : 0;
}

/**
 * The local calendar-day key ("YYYY-MM-DD") of an epoch-ms timestamp. Used to detect when the
 * "today" counters must be reset. Uses local time so the day rolls over at the operator's
 * midnight, not UTC's.
 *
 * @param {number} ms - the timestamp (epoch ms)
 * @returns {string} the local day key
 */
function localDayKey(ms) {
	const d = new Date(Number(ms));
	if (Number.isNaN(d.getTime())) {
		return '';
	}
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

/**
 * Whether two epoch-ms timestamps fall on the same local calendar day.
 *
 * @param {number} aMs - first timestamp (epoch ms)
 * @param {number} bMs - second timestamp (epoch ms)
 * @returns {boolean} true when both are on the same local day
 */
function sameLocalDay(aMs, bMs) {
	const ka = localDayKey(aMs);
	return ka !== '' && ka === localDayKey(bMs);
}

/**
 * Round a number of seconds to hours with two decimals (for the runtime-in-hours states).
 *
 * @param {number} sec - a duration in seconds
 * @returns {number} the duration in hours, rounded to 0.01 h
 */
function secToHours(sec) {
	return Math.round((Number(sec) / 3600) * 100) / 100;
}

module.exports = {
	elapsedSec,
	localDayKey,
	sameLocalDay,
	secToHours,
};
