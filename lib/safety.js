'use strict';

/*
 * Safety layer for ioBroker.automatic-pond-aeration.
 *
 * The core rule: an air compressor must NEVER run against fully closed valves
 * (dead-heading) – that causes overpressure and can destroy the pump. While the pump
 * runs, at least `minOpenValves` aeration valves must be open; otherwise the emergency
 * valve is opened and, if the pump is controllable, the pump is switched off.
 *
 * Everything here is a PURE function (no adapter / no I/O), so every edge case can be
 * unit-tested directly. main.js applies the decision to the hardware via the HAL.
 */

/**
 * Evaluate the dead-head safety interlock for the current situation.
 *
 * `input`: `valveOpen` (open state per aeration point), `pumpRunning` (best-known pump
 * state), `pumpMonitored` (whether the pump state is known), `pumpControllable` (whether
 * the pump can be switched off) and `minOpenValves`.
 *
 * The returned decision holds `emergencyValve` (target state), `stopPump`, `interlockActive`,
 * `openValveCount` and `tripReason` (null when safe).
 *
 * @param {{ valveOpen: boolean[], pumpRunning: boolean, pumpMonitored: boolean, pumpControllable: boolean, minOpenValves: number }} input - the current hardware situation
 * @returns {{ emergencyValve: boolean, stopPump: boolean, interlockActive: boolean, openValveCount: number, tripReason: string | null }} the safety decision to apply
 */
function evaluateSafety(input) {
	const valveOpen = Array.isArray(input.valveOpen) ? input.valveOpen : [];
	const openValveCount = valveOpen.filter(Boolean).length;
	const minOpen = Math.max(1, Number(input.minOpenValves) || 1);
	// If the pump state is unknown, assume it might be running (conservative fail-safe).
	const pumpMaybeRunning = input.pumpMonitored ? Boolean(input.pumpRunning) : true;

	if (pumpMaybeRunning && openValveCount < minOpen) {
		const how = input.pumpMonitored ? 'running' : 'possibly running (not monitored)';
		const stopPump = Boolean(input.pumpControllable);
		return {
			emergencyValve: true,
			stopPump,
			interlockActive: true,
			openValveCount,
			tripReason: `Pump ${how} with ${openValveCount} open valve(s) (< ${minOpen} required) – emergency valve opened${stopPump ? ' and pump stopped' : ''}.`,
		};
	}

	return {
		emergencyValve: false,
		stopPump: false,
		interlockActive: false,
		openValveCount,
		tripReason: null,
	};
}

/**
 * Plan a make-before-break valve transition: the newly-required valves are opened first,
 * and only after the overlap are the ones no longer needed closed – so there is never a
 * moment with all valves closed (no water hammer, no dead-head while switching).
 *
 * @param {boolean[]} current - current open state per point
 * @param {boolean[]} target - desired open state per point
 * @returns {{ open: number[], close: number[] }} indices to open first, then to close
 */
function planValveTransition(current, target) {
	const cur = Array.isArray(current) ? current : [];
	const tgt = Array.isArray(target) ? target : [];
	const open = [];
	const close = [];
	const n = Math.max(cur.length, tgt.length);
	for (let i = 0; i < n; i++) {
		if (tgt[i] && !cur[i]) {
			open.push(i);
		}
		if (!tgt[i] && cur[i]) {
			close.push(i);
		}
	}
	return { open, close };
}

/**
 * Whether the pump may change state now, honouring minimum on/off times (anti short-cycle).
 * NOTE: a safety stop bypasses this – the anti-cycle guard only applies to normal control.
 *
 * @param {boolean} desiredOn - the target pump state
 * @param {boolean} currentlyOn - the current pump state
 * @param {number} lastChangeMs - timestamp (ms) of the last pump change
 * @param {number} nowMs - current timestamp (ms)
 * @param {number} minOnSec - minimum time the pump must stay on
 * @param {number} minOffSec - minimum time the pump must stay off
 * @returns {boolean} true if the pump may switch now
 */
function canSwitchPump(desiredOn, currentlyOn, lastChangeMs, nowMs, minOnSec, minOffSec) {
	if (Boolean(desiredOn) === Boolean(currentlyOn)) {
		return true; // no change requested
	}
	const elapsedSec = (nowMs - lastChangeMs) / 1000;
	const minHold = currentlyOn ? Number(minOnSec) || 0 : Number(minOffSec) || 0;
	return elapsedSec >= minHold;
}

module.exports = {
	evaluateSafety,
	planValveTransition,
	canSwitchPump,
};
