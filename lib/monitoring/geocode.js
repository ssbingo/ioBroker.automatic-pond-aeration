'use strict';

/*
 * Nominatim (OpenStreetMap) geocoding helpers (pure). The actual HTTP request is performed
 * by the adapter (main.js) so this module stays testable. Policy (rule 12): geocoding is
 * only triggered on explicit user action, uses an identifying User-Agent and is debounced.
 */

/** Nominatim requires an identifying User-Agent per its usage policy. */
const USER_AGENT = 'ioBroker.automatic-pond-aeration';

/**
 * Build the Nominatim search URL for a free-text address.
 *
 * @param {string} address - the address / place to look up
 * @returns {string} the request URL
 */
function buildNominatimUrl(address) {
	const q = encodeURIComponent(String(address || '').trim());
	return `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`;
}

/**
 * Parse a Nominatim JSON response (array of results) into coordinates.
 *
 * @param {any} json - the parsed JSON response
 * @returns {{ latitude: number, longitude: number, displayName: string } | null} first hit or null
 */
function parseNominatimResponse(json) {
	if (!Array.isArray(json) || json.length === 0) {
		return null;
	}
	const first = json[0];
	const latitude = Number(first.lat);
	const longitude = Number(first.lon);
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return null;
	}
	return {
		latitude,
		longitude,
		displayName: typeof first.display_name === 'string' ? first.display_name : '',
	};
}

/**
 * Whether a new geocoding request is allowed now (debounce / rate limit).
 *
 * @param {number} lastCallMs - timestamp (ms) of the previous request (0 = never)
 * @param {number} nowMs - current timestamp (ms)
 * @param {number} minIntervalMs - minimum spacing between requests
 * @returns {boolean} true if a request may be issued
 */
function mayGeocode(lastCallMs, nowMs, minIntervalMs) {
	return nowMs - (Number(lastCallMs) || 0) >= (Number(minIntervalMs) || 0);
}

module.exports = {
	USER_AGENT,
	buildNominatimUrl,
	parseNominatimResponse,
	mayGeocode,
};
