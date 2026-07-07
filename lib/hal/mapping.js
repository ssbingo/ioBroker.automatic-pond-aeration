'use strict';

/*
 * Pure value-mapping helpers for the hardware abstraction layer.
 *
 * A valve/pump is driven through a foreign state whose "on"/"off" representation is
 * configurable (a boolean true/false, a number 1/0, a string "ON"/"OFF", ...). These
 * helpers translate between the adapter's logical boolean ("open"/"running") and the
 * configured foreign representation. They are pure so they can be unit-tested.
 */

/**
 * The foreign value to write to open/close a valve (or start/stop the pump).
 *
 * @param {boolean} open - logical target (true = open / running)
 * @param {boolean | number | string} onValue - value that represents "on"
 * @param {boolean | number | string} offValue - value that represents "off"
 * @returns {boolean | number | string} the value to write to the foreign state
 */
function valveCommandValue(open, onValue, offValue) {
	return open ? onValue : offValue;
}

/**
 * Interpret a foreign state value as a logical open/on boolean. Matches the configured
 * onValue first (loose, so 1 == true works), then offValue; otherwise falls back to the
 * JavaScript truthiness of the value.
 *
 * @param {unknown} value - the foreign state value
 * @param {boolean | number | string} onValue - value that represents "on"
 * @param {boolean | number | string} offValue - value that represents "off"
 * @returns {boolean} true if the value represents "open"/"on"
 */
function interpretValveValue(value, onValue, offValue) {
	if (looseEquals(value, onValue)) {
		return true;
	}
	if (looseEquals(value, offValue)) {
		return false;
	}
	return Boolean(value);
}

/**
 * Loose equality that also treats booleans and their 1/0 or "true"/"false" encodings as
 * equal, so a relay reporting 1 matches an onValue of true.
 *
 * @param {unknown} a - first value
 * @param {unknown} b - second value
 * @returns {boolean} whether the two values represent the same on/off state
 */
function looseEquals(a, b) {
	if (a === b) {
		return true;
	}
	return normalizeBoolish(a) === normalizeBoolish(b);
}

/**
 * Reduce a value to a canonical boolean-ish token when it clearly encodes on/off,
 * otherwise return the value unchanged (so unrelated values are not accidentally equal).
 *
 * @param {unknown} v - the value
 * @returns {unknown} true/false when the value clearly encodes on/off, else v
 */
function normalizeBoolish(v) {
	if (typeof v === 'boolean') {
		return v;
	}
	if (v === 1 || v === '1' || v === 'true' || v === 'on' || v === 'ON') {
		return true;
	}
	if (v === 0 || v === '0' || v === 'false' || v === 'off' || v === 'OFF') {
		return false;
	}
	return v;
}

module.exports = {
	valveCommandValue,
	interpretValveValue,
	looseEquals,
	normalizeBoolish,
};
