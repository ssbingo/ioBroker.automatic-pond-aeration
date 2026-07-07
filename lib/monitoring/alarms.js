'use strict';

/*
 * Monitoring helpers (pure): sensor alarm evaluation with hysteresis and a temperature-
 * compensated dissolved-oxygen saturation calculation. No I/O, so every case is unit-tested.
 */

/**
 * Low-oxygen alarm with hysteresis: raises when the value drops below `low`, and only clears
 * again once it rises back above `low + hysteresis` (avoids flapping around the threshold).
 *
 * @param {number | null | undefined} value - current oxygen reading
 * @param {number | null | undefined} low - low threshold (null/undefined = alarm disabled)
 * @param {number} hysteresis - clear margin above the threshold
 * @param {boolean} wasAlarm - previous alarm state
 * @returns {boolean} the new alarm state
 */
function evaluateOxygenAlarm(value, low, hysteresis, wasAlarm) {
	if (low === null || low === undefined || value === null || value === undefined || !Number.isFinite(Number(value))) {
		return false;
	}
	const v = Number(value);
	const h = Number(hysteresis) || 0;
	if (wasAlarm) {
		return v < low + h; // stays in alarm until it clearly recovers
	}
	return v < low;
}

/**
 * Pressure alarm with hysteresis: raises when the value leaves the [min, max] range and clears
 * once it is back inside by the hysteresis margin. Either bound may be null (that side is off).
 *
 * @param {number | null | undefined} value - current pressure reading
 * @param {number | null | undefined} min - minimum allowed (null = no lower bound)
 * @param {number | null | undefined} max - maximum allowed (null = no upper bound)
 * @param {number} hysteresis - clear margin inside the range
 * @param {boolean} wasAlarm - previous alarm state
 * @returns {boolean} the new alarm state
 */
function evaluatePressureAlarm(value, min, max, hysteresis, wasAlarm) {
	if (value === null || value === undefined || !Number.isFinite(Number(value))) {
		return false;
	}
	const v = Number(value);
	const h = Number(hysteresis) || 0;
	const hasMin = min !== null && min !== undefined;
	const hasMax = max !== null && max !== undefined;
	if (!hasMin && !hasMax) {
		return false;
	}
	if (wasAlarm) {
		const belowClear = hasMin && v < min + h;
		const aboveClear = hasMax && v > max - h;
		return belowClear || aboveClear;
	}
	const below = hasMin && v < min;
	const above = hasMax && v > max;
	return below || above;
}

/**
 * Dissolved-oxygen saturation at 1 atm for freshwater, using the standard temperature
 * formula Cs(T) = 14.652 − 0.41022·T + 0.0079910·T² − 0.000077774·T³ (mg/L, 0–40 °C).
 *
 * @param {number | null | undefined} mgPerL - measured dissolved oxygen (mg/L)
 * @param {number | null | undefined} tempC - water temperature (°C)
 * @returns {number | null} saturation in percent (rounded to 0.1), or null if not computable
 */
function oxygenSaturationPct(mgPerL, tempC) {
	if (mgPerL === null || mgPerL === undefined || tempC === null || tempC === undefined) {
		return null;
	}
	const v = Number(mgPerL);
	const t = Number(tempC);
	if (!Number.isFinite(v) || !Number.isFinite(t)) {
		return null;
	}
	const cs = 14.652 - 0.41022 * t + 0.007991 * t * t - 0.000077774 * t * t * t;
	if (cs <= 0) {
		return null;
	}
	return Math.round((v / cs) * 1000) / 10;
}

module.exports = {
	evaluateOxygenAlarm,
	evaluatePressureAlarm,
	oxygenSaturationPct,
};
