'use strict';

/*
 * Configuration validation and normalization for ioBroker.automatic-pond-aeration.
 *
 * These are pure functions (no adapter / no I/O) so they can be unit-tested directly
 * and reused by the control engine later. `validateConfig` returns a normalized copy
 * of the configuration plus human-readable `errors` and `warnings` arrays; the adapter
 * decides how to log/act on them.
 */

const { BUTTON_MODES } = require('./control/button');

/** Hard upper limit on the number of aeration points (product requirement). */
const MAX_AERATION_POINTS = 8;

/** Notification event categories the user can enable (see main.notify / NotifyTab). */
const NOTIFY_EVENTS = ['interlock', 'oxygen', 'pressure'];

/** Matches a "HH:mm" 24h clock time. */
const TIME_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** Matches a recurring "MM-DD" date (used for the winter window). */
const MMDD_RE = /^(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])$/;

/**
 * Normalize an array of 0-based aeration-point indices: keep only valid, in-range, unique
 * integers. Used for the winter/oxygen "affected points" and the feeder-affected points.
 *
 * @param {unknown} raw - the raw array from the config
 * @param {number} pointCount - number of configured points
 * @returns {number[]} the sanitized, unique, in-range indices
 */
function normalizePointIndices(raw, pointCount) {
	const out = [];
	for (const v of Array.isArray(raw) ? raw : []) {
		const n = typeof v === 'number' ? v : Number(v);
		if (Number.isInteger(n) && n >= 0 && n < pointCount && !out.includes(n)) {
			out.push(n);
		}
	}
	return out;
}

/**
 * Clamp a value to [min, max]. Non-finite input falls back to `fallback`.
 *
 * @param {unknown} value - the raw value
 * @param {number} min - lower bound
 * @param {number} max - upper bound
 * @param {number} fallback - used when value is not a finite number
 * @returns {number} the clamped number
 */
function clampNumber(value, min, max, fallback) {
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, n));
}

/**
 * Normalize one aeration point.
 *
 * @param {any} raw - raw point config (may be partial)
 * @param {number} index - position in the points array
 * @param {'iobroker' | 'esp32'} defaultBackend - fallback backend type
 * @returns {ioBroker.AerationPointConfig} normalized point
 */
function normalizePoint(raw, index, defaultBackend) {
	const p = raw && typeof raw === 'object' ? raw : {};
	const backendType = p.backendType === 'esp32' || p.backendType === 'iobroker' ? p.backendType : defaultBackend;
	return {
		id: typeof p.id === 'string' && p.id ? p.id : `pt-${index}`,
		name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : `Point ${index + 1}`,
		enabled: p.enabled !== false,
		backendType,
		objectId: typeof p.objectId === 'string' ? p.objectId : '',
		espChannel: clampNumber(p.espChannel, 0, 255, index),
		onValue: p.onValue === undefined ? true : p.onValue,
		offValue: p.offValue === undefined ? false : p.offValue,
		// Per-point manual override push-button (physical, wired to a DI / boolean state).
		// Only "toggle" exists in v1; the field is kept as an enum for future modes.
		buttonEnabled: Boolean(p.buttonEnabled),
		buttonMode: BUTTON_MODES.includes(p.buttonMode) ? p.buttonMode : 'toggle',
		buttonObjectId: typeof p.buttonObjectId === 'string' ? p.buttonObjectId : '',
	};
}

/**
 * Normalize one group; invalid member indices are dropped.
 *
 * @param {any} raw - raw group config
 * @param {number} index - position in the groups array
 * @param {number} pointCount - number of (normalized) points
 * @param {string[]} warnings - collector for warnings
 * @returns {ioBroker.AerationGroupConfig} normalized group
 */
function normalizeGroup(raw, index, pointCount, warnings) {
	const g = raw && typeof raw === 'object' ? raw : {};
	const name = typeof g.name === 'string' && g.name.trim() ? g.name.trim() : `Group ${index + 1}`;
	const rawMembers = Array.isArray(g.members) ? g.members : [];
	const members = [];
	for (const m of rawMembers) {
		const idx = clampNumber(m, 0, MAX_AERATION_POINTS - 1, -1);
		if (Number.isInteger(idx) && idx >= 0 && idx < pointCount) {
			if (!members.includes(idx)) {
				members.push(idx);
			}
		} else {
			warnings.push(
				`Group "${name}" references a non-existent aeration point (${m}); the reference was removed.`,
			);
		}
	}
	if (!members.length) {
		warnings.push(`Group "${name}" has no valid members.`);
	}
	return {
		id: typeof g.id === 'string' && g.id ? g.id : `grp-${index}`,
		name,
		members,
	};
}

/**
 * Normalize one schedule.
 *
 * @param {any} raw - raw schedule config
 * @param {number} index - position in the schedules array
 * @param {Set<string>} validTargetIds - ids of existing points and groups
 * @param {string[]} warnings - collector for warnings
 * @returns {ioBroker.AerationScheduleConfig} normalized schedule
 */
function normalizeSchedule(raw, index, validTargetIds, warnings) {
	const s = raw && typeof raw === 'object' ? raw : {};
	const targets = (Array.isArray(s.targets) ? s.targets : []).filter(t => {
		const ok = typeof t === 'string' && validTargetIds.has(t);
		if (!ok) {
			warnings.push(`Schedule #${index + 1} targets an unknown point/group id "${t}"; it was removed.`);
		}
		return ok;
	});
	const days = (Array.isArray(s.days) ? s.days : [])
		.map(d => clampNumber(d, 0, 6, 0))
		.filter((d, i, a) => a.indexOf(d) === i);
	const from = typeof s.from === 'string' && TIME_RE.test(s.from) ? s.from : '00:00';
	const to = typeof s.to === 'string' && TIME_RE.test(s.to) ? s.to : '23:59';
	if (s.from && !TIME_RE.test(s.from)) {
		warnings.push(`Schedule #${index + 1} has an invalid start time "${s.from}"; using ${from}.`);
	}
	if (s.to && !TIME_RE.test(s.to)) {
		warnings.push(`Schedule #${index + 1} has an invalid end time "${s.to}"; using ${to}.`);
	}
	return {
		id: typeof s.id === 'string' && s.id ? s.id : `sch-${index}`,
		enabled: s.enabled !== false,
		targets,
		days,
		from,
		to,
	};
}

/**
 * Normalize the cyclic sequence steps. Each step targets an existing point or group id and may
 * carry an optional per-step dwell time; unknown targets are dropped with a warning.
 *
 * @param {any} raw - raw sequence steps from the config
 * @param {Set<string>} validTargetIds - ids of existing points and groups
 * @param {string[]} warnings - collector for warnings
 * @returns {Array<{ targetId: string, dwellSec?: number }>} normalized steps
 */
function normalizeSequenceSteps(raw, validTargetIds, warnings) {
	const out = [];
	(Array.isArray(raw) ? raw : []).forEach((s, i) => {
		const targetId = s && typeof s.targetId === 'string' ? s.targetId : '';
		if (!validTargetIds.has(targetId)) {
			warnings.push(`Sequence step #${i + 1} targets an unknown point/group id "${targetId}"; it was removed.`);
			return;
		}
		const step = { targetId };
		const dwell = Number(s.dwellSec);
		if (Number.isFinite(dwell) && dwell >= 1) {
			step.dwellSec = Math.min(86400, Math.round(dwell));
		}
		out.push(step);
	});
	return out;
}

/**
 * Validate and normalize the adapter configuration.
 *
 * @param {any} rawConfig - the adapter's `native` configuration (adapter.config)
 * @returns {{ config: ioBroker.AdapterConfig, errors: string[], warnings: string[] }}
 *   the normalized config plus collected errors and warnings
 */
function validateConfig(rawConfig) {
	const errors = [];
	const warnings = [];
	const src = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};

	const defaultBackend = src.controlBackend === 'esp32' ? 'esp32' : 'iobroker';

	// --- points (max 8) ---
	let rawPoints = Array.isArray(src.points) ? src.points : [];
	if (rawPoints.length > MAX_AERATION_POINTS) {
		warnings.push(
			`Configured ${rawPoints.length} aeration points, but the maximum is ${MAX_AERATION_POINTS}. Extra points are ignored.`,
		);
		rawPoints = rawPoints.slice(0, MAX_AERATION_POINTS);
	}
	const points = rawPoints.map((p, i) => normalizePoint(p, i, defaultBackend));

	// enabled iobroker points need a state mapping
	points.forEach(p => {
		if (p.enabled && p.backendType === 'iobroker' && !p.objectId) {
			warnings.push(`Aeration point "${p.name}" is enabled but has no ioBroker state mapped.`);
		}
	});

	// --- groups (hard rule: never more groups than points) ---
	let rawGroups = Array.isArray(src.groups) ? src.groups : [];
	if (rawGroups.length > points.length) {
		errors.push(
			`There are more groups (${rawGroups.length}) than aeration points (${points.length}); groups must never exceed points. Extra groups are ignored.`,
		);
		rawGroups = rawGroups.slice(0, points.length);
	}
	const groups = rawGroups.map((g, i) => normalizeGroup(g, i, points.length, warnings));

	// --- schedules ---
	const validTargetIds = new Set([...points.map(p => p.id), ...groups.map(g => g.id)]);
	const rawSchedules = Array.isArray(src.schedules) ? src.schedules : [];
	const schedules = rawSchedules.map((s, i) => normalizeSchedule(s, i, validTargetIds, warnings));

	// --- cyclic sequence (points and/or groups, mixed) ---
	const sequenceSteps = normalizeSequenceSteps(src.sequenceSteps, validTargetIds, warnings);

	// --- numeric guards ---
	const minOpenValves = clampNumber(src.minOpenValves, 1, MAX_AERATION_POINTS, 1);
	if (src.minOpenValves !== undefined && src.minOpenValves < 1) {
		warnings.push(
			`minOpenValves was ${src.minOpenValves}; at least 1 valve must stay open while the pump runs. Using 1.`,
		);
	}

	// --- geolocation ---
	if (src.locationMode === 'shared' && (!src.latitude || !src.longitude)) {
		warnings.push(
			'Location mode is "shared" but latitude/longitude are empty; astronomical times and the night lock will not work until coordinates are set.',
		);
	}

	// --- sensors (enabled but unmapped) ---
	const sensorChecks = [
		['o2Enabled', 'o2ObjectId', 'oxygen'],
		['airTempEnabled', 'airTempObjectId', 'air temperature'],
		['waterTempEnabled', 'waterTempObjectId', 'water temperature'],
		['pressureEnabled', 'pressureObjectId', 'pressure'],
	];
	for (const [enabledKey, idKey, label] of sensorChecks) {
		if (src[enabledKey] && !src[idKey]) {
			warnings.push(`${label} monitoring is enabled but no source state is mapped.`);
		}
	}

	// --- emergency valve ---
	const emergencyValveType = src.emergencyValveType === 'motorBallValve' ? 'motorBallValve' : 'solenoid';

	// --- winter / ice-free mode ---
	const winterStart =
		typeof src.winterStart === 'string' && MMDD_RE.test(src.winterStart) ? src.winterStart : '11-01';
	const winterEnd = typeof src.winterEnd === 'string' && MMDD_RE.test(src.winterEnd) ? src.winterEnd : '03-15';
	if (src.winterEnabled && src.winterStart && !MMDD_RE.test(src.winterStart)) {
		warnings.push(`Winter start "${src.winterStart}" is not a valid MM-DD date; using ${winterStart}.`);
	}
	if (src.winterEnabled && src.winterEnd && !MMDD_RE.test(src.winterEnd)) {
		warnings.push(`Winter end "${src.winterEnd}" is not a valid MM-DD date; using ${winterEnd}.`);
	}
	if (src.winterEnabled && src.winterFrostProtect && !src.airTempEnabled) {
		warnings.push(
			'Winter frost protection needs air-temperature monitoring, but it is disabled — the pond will be aerated for the whole winter window instead of only while it is cold.',
		);
	}

	// --- oxygen closed loop ---
	if (src.o2ControlEnabled && !src.o2Enabled) {
		warnings.push('The oxygen closed loop is enabled but oxygen monitoring is off; the loop will never trigger.');
	}
	if (src.o2ControlEnabled && (src.o2LowThreshold === null || src.o2LowThreshold === undefined)) {
		warnings.push('The oxygen closed loop is enabled but no low threshold is set; the loop will never trigger.');
	}

	const config = {
		...src,
		controlBackend: defaultBackend,
		masterEnable: src.masterEnable !== false,
		dryRun: Boolean(src.dryRun),
		pollIntervalSec: clampNumber(src.pollIntervalSec, 1, 3600, 30),
		watchdogIntervalSec: clampNumber(src.watchdogIntervalSec, 1, 3600, 5),
		overlapSec: clampNumber(src.overlapSec, 0, 60, 2),
		roundRobinDwellSec: clampNumber(src.roundRobinDwellSec, 1, 86400, 60),
		pumpMinOnSec: clampNumber(src.pumpMinOnSec, 0, 86400, 0),
		pumpMinOffSec: clampNumber(src.pumpMinOffSec, 0, 86400, 0),
		emergencyValveType,
		emergencyMotorTravelSec: clampNumber(src.emergencyMotorTravelSec, 0, 600, 5),
		esp32EmergencyRelay: clampNumber(src.esp32EmergencyRelay, 0, MAX_AERATION_POINTS - 1, 6),
		esp32PumpRelay: clampNumber(src.esp32PumpRelay, 0, MAX_AERATION_POINTS - 1, 7),
		minOpenValves,
		winterEnabled: Boolean(src.winterEnabled),
		winterStart,
		winterEnd,
		winterFrostProtect: Boolean(src.winterFrostProtect),
		winterAirTempThreshold: clampNumber(src.winterAirTempThreshold, -20, 40, 2),
		winterAffectedPoints: normalizePointIndices(src.winterAffectedPoints, points.length),
		o2ControlEnabled: Boolean(src.o2ControlEnabled),
		o2AffectedPoints: normalizePointIndices(src.o2AffectedPoints, points.length),
		// undefined = not configured yet → default to all events (backward compatible); an
		// explicit array (even empty) is honoured as the user's selection.
		notifyEvents: Array.isArray(src.notifyEvents)
			? src.notifyEvents.filter(e => NOTIFY_EVENTS.includes(e))
			: [...NOTIFY_EVENTS],
		feederAffectedPoints: normalizePointIndices(src.feederAffectedPoints, points.length),
		points,
		groups,
		schedules,
		sequenceSteps,
	};

	return { config, errors, warnings };
}

module.exports = {
	MAX_AERATION_POINTS,
	NOTIFY_EVENTS,
	TIME_RE,
	MMDD_RE,
	clampNumber,
	normalizePointIndices,
	normalizePoint,
	normalizeGroup,
	normalizeSchedule,
	normalizeSequenceSteps,
	validateConfig,
};
