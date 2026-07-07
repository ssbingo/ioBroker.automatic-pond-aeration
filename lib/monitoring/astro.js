'use strict';

const SunCalc = require('suncalc');

/*
 * Astronomical times from the pond's coordinates (via suncalc). Given a moment and a
 * location it returns sunrise, sunset, solar noon and whether it is currently night. The
 * moment is passed in, so callers control the clock; suncalc itself is deterministic.
 */

/**
 * Whether the given coordinates are valid numbers within range.
 *
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {boolean} true if usable
 */
function hasValidCoords(lat, lon) {
	return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/**
 * Compute the sun times and the night flag for a location and moment.
 *
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @param {Date} date - the moment to evaluate
 * @returns {{ valid: boolean, sunrise: Date | null, sunset: Date | null, solarNoon: Date | null, isNight: boolean }}
 */
function computeAstro(lat, lon, date) {
	if (!hasValidCoords(lat, lon)) {
		return { valid: false, sunrise: null, sunset: null, solarNoon: null, isNight: false };
	}
	const times = SunCalc.getTimes(date, lat, lon);
	const sunrise = times.sunrise instanceof Date && !isNaN(times.sunrise.getTime()) ? times.sunrise : null;
	const sunset = times.sunset instanceof Date && !isNaN(times.sunset.getTime()) ? times.sunset : null;
	const solarNoon = times.solarNoon instanceof Date && !isNaN(times.solarNoon.getTime()) ? times.solarNoon : null;
	// Night = before sunrise or after sunset (when both are known).
	let isNight = false;
	if (sunrise && sunset) {
		const t = date.getTime();
		isNight = t < sunrise.getTime() || t > sunset.getTime();
	}
	return { valid: true, sunrise, sunset, solarNoon, isNight };
}

module.exports = {
	hasValidCoords,
	computeAstro,
};
