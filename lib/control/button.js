'use strict';

/*
 * Per-point manual override button (pure).
 *
 * Each aeration point may have a physical push-button (wired to a digital input — on the ESP32
 * one of the 8 DIs, or any ioBroker boolean state). The button state machine turns raw
 * button presses into a per-point "override on" flag that the arbiter treats with *higher
 * priority than the automatic programs* — only safety-relevant logic (the dead-head interlock,
 * or the master switch being off) may override it; a feeder pause does not.
 *
 * v1 supports the "toggle" mode: each press (rising edge) flips the override on/off. The mode
 * is an enum so more behaviours (momentary, off-priority, timed, …) can be added later without
 * touching the call sites. These are pure helpers (no adapter / no I/O) so every case is tested.
 */

/** Supported button behaviours. Extend this list when adding new modes. */
const BUTTON_MODES = ['toggle'];

/**
 * Compute the next override state for one button from its previous state and the new raw input.
 * Detects the rising edge internally from `prevRaw` → `rawPressed`.
 *
 * @param {{ on: boolean, raw: boolean }} state - previous state ({ on = override active, raw = last raw input })
 * @param {boolean} rawPressed - current raw button input (true = pressed/closed)
 * @param {string} [mode] - button behaviour (default "toggle")
 * @returns {{ on: boolean, raw: boolean, changed: boolean }} the new state and whether `on` changed
 */
function nextButtonState(state, rawPressed, mode) {
	const prev = state && typeof state === 'object' ? state : { on: false, raw: false };
	const raw = Boolean(rawPressed);
	const risingEdge = raw && !prev.raw;
	let on = Boolean(prev.on);

	switch (mode || 'toggle') {
		case 'toggle':
		default:
			if (risingEdge) {
				on = !on;
			}
			break;
	}

	return { on, raw, changed: on !== Boolean(prev.on) };
}

/**
 * Build the per-point "override on" mask for the arbiter from the button runtime states. A point
 * only contributes when its button is enabled and currently toggled on.
 *
 * @param {Array<{ enabled: boolean }>} points - configured points (need `.button?.enabled` flag)
 * @param {Array<{ on: boolean }>} buttonStates - per-point button runtime state
 * @param {boolean[]} [enabledMask] - optional per-point "button present" mask (overrides points)
 * @returns {boolean[]} force-open mask (length = points.length)
 */
function buttonForcedOn(points, buttonStates, enabledMask) {
	const pts = Array.isArray(points) ? points : [];
	const states = Array.isArray(buttonStates) ? buttonStates : [];
	const mask = Array.isArray(enabledMask) ? enabledMask : null;
	return pts.map((_p, i) => {
		const present = mask ? Boolean(mask[i]) : true;
		return present && Boolean(states[i] && states[i].on);
	});
}

module.exports = {
	BUTTON_MODES,
	nextButtonState,
	buttonForcedOn,
};
