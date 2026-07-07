'use strict';

/*
 * Winter / ice-free mode (pure).
 *
 * During a configured season (a recurring "MM-DD" date window that may wrap around the
 * turn of the year, e.g. 11-01 .. 03-15) the adapter keeps the selected aeration points
 * running so an ice-free hole stays open — this lets swamp gas escape and prevents fish
 * kills under a closed ice sheet. Optionally the forcing is gated on air temperature
 * (frost protection): the points are only forced on while it is actually cold enough.
 *
 * These are pure helpers (no adapter / no I/O). main.js turns the resulting mask into a
 * `forcedOn` input for the arbiter, so winter mode composes with the normal control
 * sources instead of fighting them; the dead-head safety interlock still runs on top.
 */

/**
 * Convert a recurring "MM-DD" date to a comparable ordinal (month * 100 + day). This keeps
 * calendar ordering intact (e.g. 03-15 -> 315, 11-01 -> 1101) so windows can be compared
 * with plain `<=`.
 *
 * @param {string} mmdd - a recurring date as "MM-DD"
 * @returns {number} the ordinal, or NaN when the input is not a valid "MM-DD"
 */
function mmddToOrdinal(mmdd) {
	if (typeof mmdd !== 'string') {
		return NaN;
	}
	const m = /^(\d{1,2})-(\d{1,2})$/.exec(mmdd.trim());
	if (!m) {
		return NaN;
	}
	const month = Number(m[1]);
	const day = Number(m[2]);
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return NaN;
	}
	return month * 100 + day;
}

/**
 * Whether a given month/day falls within the recurring winter window. The window is
 * inclusive on both ends and wraps around the end of the year when `start` is after
 * `end` (the normal case for a Northern-hemisphere winter, e.g. 11-01 .. 03-15).
 *
 * @param {string} start - window start as "MM-DD"
 * @param {string} end - window end as "MM-DD"
 * @param {string} monthDay - the date to test as "MM-DD"
 * @returns {boolean} true when monthDay is inside the (possibly wrapping) window
 */
function inWinterWindow(start, end, monthDay) {
	const s = mmddToOrdinal(start);
	const e = mmddToOrdinal(end);
	const d = mmddToOrdinal(monthDay);
	if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(d)) {
		return false;
	}
	if (s <= e) {
		return d >= s && d <= e; // same-year window
	}
	return d >= s || d <= e; // window wraps over the turn of the year
}

/**
 * Frost gating with hysteresis: the aeration is forced on while the air temperature is at or
 * below `threshold`, and only released again once it has risen clearly above it
 * (`threshold + hysteresis`). When no reading is available the result is `true` — a
 * fail-safe that keeps the ice-free hole open rather than risking a frozen-over pond.
 *
 * @param {number | null | undefined} airTemp - current air temperature (°C)
 * @param {number} threshold - temperature at/below which forcing is active (°C)
 * @param {number} hysteresis - release margin above the threshold (°C)
 * @param {boolean} wasActive - previous frost-active state
 * @returns {boolean} the new frost-active state
 */
function frostActive(airTemp, threshold, hysteresis, wasActive) {
	if (airTemp === null || airTemp === undefined || !Number.isFinite(Number(airTemp))) {
		return true; // no reading → keep the hole open (fail-safe)
	}
	const t = Number(airTemp);
	const th = Number(threshold);
	const h = Number(hysteresis) || 0;
	if (!Number.isFinite(th)) {
		return true;
	}
	if (wasActive) {
		return t <= th + h; // stays active until it clearly warms up
	}
	return t <= th;
}

/**
 * Resolve the winter/ice-free mode for the current moment and produce the per-point
 * "force on" mask that main.js feeds into the arbiter.
 *
 * @param {{ enabled: boolean, start: string, end: string, monthDay: string, frostProtect: boolean, airTemp?: number|null, threshold: number, hysteresis: number, wasFrostActive: boolean, pointCount: number, affectedPoints: number[] }} ctx - the winter context
 * @returns {{ active: boolean, inWindow: boolean, frostActive: boolean, forcedOn: boolean[] }} the resolved state and force-on mask
 */
function resolveWinter(ctx) {
	const pointCount = Math.max(0, Number(ctx.pointCount) || 0);
	const empty = new Array(pointCount).fill(false);
	if (!ctx.enabled) {
		return { active: false, inWindow: false, frostActive: false, forcedOn: empty };
	}
	const inWindow = inWinterWindow(ctx.start, ctx.end, ctx.monthDay);
	const fActive = ctx.frostProtect
		? frostActive(ctx.airTemp, ctx.threshold, ctx.hysteresis, ctx.wasFrostActive)
		: true;
	const active = inWindow && fActive;
	if (!active) {
		return { active: false, inWindow, frostActive: fActive, forcedOn: empty };
	}
	// Empty selection means "all points" — keep the whole pond aerated in winter.
	const affected = Array.isArray(ctx.affectedPoints) ? ctx.affectedPoints : [];
	const forcedOn = new Array(pointCount).fill(affected.length === 0);
	for (const idx of affected) {
		if (Number.isInteger(idx) && idx >= 0 && idx < pointCount) {
			forcedOn[idx] = true;
		}
	}
	return { active: true, inWindow, frostActive: fActive, forcedOn };
}

module.exports = {
	mmddToOrdinal,
	inWinterWindow,
	frostActive,
	resolveWinter,
};
