'use strict';

/*
 * Schedule controller (pure). Decides which aeration points a set of time schedules wants
 * open at a given weekday/time. Targets may be point ids or group ids; group targets are
 * resolved to their member point indices. All time reasoning is passed in (weekday +
 * minutes-since-midnight) so the functions stay pure and unit-testable.
 */

/**
 * Convert a "HH:mm" clock string to minutes since midnight.
 *
 * @param {string} hhmm - a "HH:mm" time
 * @returns {number} minutes since midnight (0..1439), or 0 on a malformed input
 */
function toMinutes(hhmm) {
	const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
	if (!m) {
		return 0;
	}
	return (Number(m[1]) % 24) * 60 + (Number(m[2]) % 60);
}

/**
 * Whether a schedule is active at the given weekday and time. An empty day list means
 * "every day". A window with from > to wraps around midnight (e.g. 22:00–06:00).
 *
 * @param {ioBroker.AerationScheduleConfig} schedule - the schedule
 * @param {number} nowDay - weekday (0 = Sunday .. 6 = Saturday)
 * @param {number} nowMinutes - minutes since midnight
 * @returns {boolean} true if active
 */
function isScheduleActiveAt(schedule, nowDay, nowMinutes) {
	if (!schedule || schedule.enabled === false) {
		return false;
	}
	const days = Array.isArray(schedule.days) ? schedule.days : [];
	if (days.length && !days.includes(nowDay)) {
		return false;
	}
	const from = toMinutes(schedule.from);
	const to = toMinutes(schedule.to);
	if (from === to) {
		return false; // zero-length window
	}
	return from < to ? nowMinutes >= from && nowMinutes < to : nowMinutes >= from || nowMinutes < to;
}

/**
 * Resolve a list of target ids (point ids and/or group ids) to point indices.
 *
 * @param {string[]} targetIds - target ids from a schedule
 * @param {ioBroker.AerationPointConfig[]} points - configured points
 * @param {ioBroker.AerationGroupConfig[]} groups - configured groups
 * @returns {number[]} the resolved point indices
 */
function resolveTargetsToPoints(targetIds, points, groups) {
	const ids = Array.isArray(targetIds) ? targetIds : [];
	const out = new Set();
	for (const tid of ids) {
		const pIdx = points.findIndex(p => p.id === tid);
		if (pIdx >= 0) {
			out.add(pIdx);
			continue;
		}
		const g = groups.find(gr => gr.id === tid);
		if (g) {
			for (const m of g.members) {
				if (m >= 0 && m < points.length) {
					out.add(m);
				}
			}
		}
	}
	return [...out];
}

/**
 * Compute the per-point desired open state from all active schedules.
 *
 * @param {ioBroker.AerationScheduleConfig[]} schedules - schedules
 * @param {ioBroker.AerationPointConfig[]} points - configured points
 * @param {ioBroker.AerationGroupConfig[]} groups - configured groups
 * @param {number} nowDay - weekday (0..6)
 * @param {number} nowMinutes - minutes since midnight
 * @returns {boolean[]} desired open state per point (length = points.length)
 */
function scheduleDesired(schedules, points, groups, nowDay, nowMinutes) {
	const desired = new Array(points.length).fill(false);
	for (const sch of Array.isArray(schedules) ? schedules : []) {
		if (isScheduleActiveAt(sch, nowDay, nowMinutes)) {
			for (const idx of resolveTargetsToPoints(sch.targets, points, groups)) {
				desired[idx] = true;
			}
		}
	}
	return desired;
}

/**
 * Whether any schedule is active at the given time.
 *
 * @param {ioBroker.AerationScheduleConfig[]} schedules - schedules
 * @param {number} nowDay - weekday (0..6)
 * @param {number} nowMinutes - minutes since midnight
 * @returns {boolean} true if at least one schedule is active
 */
function anyScheduleActive(schedules, nowDay, nowMinutes) {
	return (Array.isArray(schedules) ? schedules : []).some(s => isScheduleActiveAt(s, nowDay, nowMinutes));
}

module.exports = {
	toMinutes,
	isScheduleActiveAt,
	resolveTargetsToPoints,
	scheduleDesired,
	anyScheduleActive,
};
