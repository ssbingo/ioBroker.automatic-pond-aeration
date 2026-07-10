'use strict';

/*
 * ESP32 protocol helpers (pure) for the Esp32Backend.
 *
 * These build the request URLs/payloads and translate the firmware's relay-level status into the
 * adapter's point/pump/emergency model. No I/O here (the backend does the fetch), so the mapping
 * and the failsafe-config payload are unit-tested directly. Contract: PROTOCOL.md in the firmware
 * repo (pond-aeration-esp32-firmware), protocol version 1.
 */

const { resolveTargetsToPoints } = require('../control/schedule');

/** The protocol major version this adapter speaks. */
const SUPPORTED_PROTOCOL = 1;

/**
 * The adapter sends a lightweight heartbeat on this fixed, SHORT interval — deliberately independent
 * of the (possibly long) status poll interval. The firmware's on-device failsafe stays disarmed as
 * long as heartbeats keep arriving; coupling the heartbeat to a 30 s status poll made the device
 * fall into failsafe every ~15 s. The failsafe timeout below is a multiple of this interval.
 */
const HEARTBEAT_INTERVAL_MS = 5000;
/** Firmware failsafe timeout: three missed heartbeats (15 s) → the on-device safe state engages. */
const HEARTBEAT_TIMEOUT_MS = HEARTBEAT_INTERVAL_MS * 3;

/**
 * Build an ESP32 API URL.
 *
 * @param {string} host - host/IP of the ESP32
 * @param {number} port - HTTP port (usually 80)
 * @param {string} path - path starting with "/"
 * @returns {string} the full URL
 */
function buildUrl(host, port, path) {
	const p = Number(port) || 80;
	return `http://${host}:${p}${path}`;
}

/**
 * Bearer-token auth headers (empty object when no token configured).
 *
 * @param {string} [token] - optional auth token
 * @returns {Record<string, string>} headers
 */
function authHeaders(token) {
	return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * The relay state that represents the emergency valve being open, given the wiring. With a
 * normally-open (NO) emergency valve, energizing the relay *closes* it, so "open" = de-energized.
 *
 * @param {boolean} open - desired emergency-valve open state
 * @param {boolean} normallyOpen - true when the valve is wired normally-open (failsafe)
 * @returns {boolean} the relay energize state to command
 */
function emergencyRelayState(open, normallyOpen) {
	// energizedOpen = !normallyOpen (energizing opens only on a normally-closed valve)
	return normallyOpen ? !open : open;
}

/**
 * Interpret an emergency relay state back into "is the valve open".
 *
 * @param {boolean} relayOn - relay energize state
 * @param {boolean} normallyOpen - wiring
 * @returns {boolean} whether the emergency valve is open
 */
function emergencyOpenFromRelay(relayOn, normallyOpen) {
	return normallyOpen ? !relayOn : relayOn;
}

/**
 * Normalize a `GET /api/status` response into predictable arrays/values.
 *
 * @param {any} json - the parsed status JSON
 * @returns {{ relays: boolean[], di: boolean[], buttons: boolean[], sensors: object, failsafe: boolean, linkUp: boolean, uptime: number }}
 */
function parseStatus(json) {
	const j = json && typeof json === 'object' ? json : {};
	const arr = v => (Array.isArray(v) ? v.map(Boolean) : []);
	const s = j.sensors && typeof j.sensors === 'object' ? j.sensors : {};
	const num = v => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));
	return {
		relays: arr(j.relays),
		di: arr(j.di),
		buttons: arr(j.buttons),
		sensors: {
			oxygen: num(s.oxygen),
			waterTemp: num(s.waterTemp),
			airTemp: num(s.airTemp),
			pressure: num(s.pressure),
		},
		failsafe: Boolean(j.failsafe),
		linkUp: Boolean(j.linkUp),
		uptime: Number(j.uptime) || 0,
	};
}

/**
 * Map the firmware's relay states to per-point valve-open states (relays[point.espChannel]).
 *
 * @param {boolean[]} relays - relay states from the status
 * @param {ioBroker.AerationPointConfig[]} points - configured points
 * @returns {boolean[]} valve-open per point
 */
function relaysToValves(relays, points) {
	const r = Array.isArray(relays) ? relays : [];
	return (Array.isArray(points) ? points : []).map(p => Boolean(r[p.espChannel]));
}

/**
 * Flatten the adapter's time schedules into per-relay-channel windows the firmware can evaluate on
 * its own (against NTP time) when it runs autonomously. Group/point targets are resolved to point
 * indices and then to their `espChannel`; each enabled schedule contributes one window per distinct
 * channel it opens. Day/time semantics match the adapter (`days` = weekdays 0=Sun..6=Sat, empty =
 * every day; `from`/`to` are "HH:mm", a from > to window wraps midnight). The cyclic round-robin
 * sequence is intentionally not flattened — it stays with the adapter.
 *
 * @param {ioBroker.AdapterConfig} config - the normalized configuration
 * @returns {Array<{ ch: number, days: number[], from: string, to: string }>} the per-channel windows
 */
function buildSchedulePayload(config) {
	const points = Array.isArray(config.points) ? config.points : [];
	const groups = Array.isArray(config.groups) ? config.groups : [];
	const windows = [];
	for (const sch of Array.isArray(config.schedules) ? config.schedules : []) {
		if (sch.enabled === false) {
			continue;
		}
		const channels = new Set();
		for (const idx of resolveTargetsToPoints(sch.targets, points, groups)) {
			const ch = points[idx] && points[idx].espChannel;
			if (Number.isInteger(ch)) {
				channels.add(ch);
			}
		}
		for (const ch of channels) {
			windows.push({
				ch,
				days: Array.isArray(sch.days) ? sch.days.slice() : [],
				from: sch.from,
				to: sch.to,
			});
		}
	}
	return windows;
}

/**
 * Build the `POST /api/config` payload that configures the firmware's on-device failsafe, heartbeat,
 * per-channel buttons and — if enabled — the autonomous schedule from the adapter configuration.
 * Valves use each point's espChannel; the override button for point i is mapped to digital input i.
 *
 * @param {ioBroker.AdapterConfig} config - the normalized configuration
 * @returns {object} the /api/config body
 */
function buildConfigPayload(config) {
	const points = Array.isArray(config.points) ? config.points : [];
	const valveRelays = points.map(p => p.espChannel);
	const buttons = [];
	points.forEach((p, i) => {
		if (p.buttonEnabled) {
			buttons.push({ di: i, relay: p.espChannel, enabled: true });
		}
	});
	const schedule = buildSchedulePayload(config);
	// Friendly names shown on the device web UI (licensed feature; the firmware only adopts them when
	// it is licensed for control). Channel names index the aeration relay channels 0..5 (Ch 1..6) —
	// Ch 7/Ch 8 are the fixed emergency valve / pump. Button names index DI 0..7 (the override button
	// of point i maps to DI i); a per-point button name falls back to the point name.
	const chNames = new Array(6).fill('');
	const btnNames = new Array(8).fill('');
	points.forEach((p, i) => {
		const c = Number(p.espChannel);
		if (p.backendType === 'esp32' && Number.isInteger(c) && c >= 0 && c < 6) {
			chNames[c] = String(p.name || '')
				.trim()
				.slice(0, 24);
		}
		if (i < 8) {
			btnNames[i] = String(p.buttonName || p.name || '')
				.trim()
				.slice(0, 24);
		}
	});
	return {
		valveRelays,
		emergencyRelay: Number(config.esp32EmergencyRelay),
		emergencyEnergizedOpen: !config.emergencyNormallyOpen,
		pumpRelay: Number(config.esp32PumpRelay),
		pumpControllable: Boolean(config.pumpControllable),
		minOpen: Number(config.minOpenValves) || 1,
		// Independent of pollIntervalSec — the adapter sends a dedicated heartbeat every
		// HEARTBEAT_INTERVAL_MS, so the failsafe timeout tracks THAT, not the status poll cadence.
		heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS,
		buttons,
		names: { ch: chNames, btn: btnNames },
		// Autonomous fallback: the firmware runs `schedule` on its own only while the adapter
		// heartbeat is lost. Only advertised when the user enabled it and there is a schedule.
		autonomous: Boolean(config.esp32AutonomousEnabled) && schedule.length > 0,
		schedule,
		authToken: config.esp32AuthToken || '',
	};
}

/**
 * Normalise the optional licence fields from GET /api/info into a stable shape.
 * Absent fields (public/ungated firmware) yield `present:false`, which callers treat as
 * "control allowed" (no gating). Feature tiers: free = monitoring only, community = relay
 * control, pro = + standalone schedule.
 *
 * @param {any} info - the parsed GET /api/info response
 * @returns {{ present: boolean, tier: string, licensedTier: string, trial: boolean, trialDaysLeft: number, deviceCode: string, controlAllowed: boolean }}
 */
function parseLicense(info) {
	const j = info && typeof info === 'object' ? info : {};
	const present = typeof j.tier === 'string';
	const tier = present ? j.tier : '';
	const trial = Boolean(present && j.trial);
	const trialDaysLeft =
		trial && Number.isFinite(Number(j.trialDaysLeft)) ? Math.max(0, Math.round(Number(j.trialDaysLeft))) : 0;
	const deviceCode = present && typeof j.deviceCode === 'string' ? j.deviceCode : '';
	const licensedTier = present && typeof j.licensedTier === 'string' ? j.licensedTier : '';
	// Ungated firmware (present:false) is always allowed; otherwise any non-free tier may control
	// (community and up — checked tier-agnostically so higher tiers are covered automatically).
	const controlAllowed = !present || (tier !== '' && tier !== 'free');
	return { present, tier, licensedTier, trial, trialDaysLeft, deviceCode, controlAllowed };
}

module.exports = {
	SUPPORTED_PROTOCOL,
	HEARTBEAT_INTERVAL_MS,
	HEARTBEAT_TIMEOUT_MS,
	buildUrl,
	authHeaders,
	emergencyRelayState,
	emergencyOpenFromRelay,
	parseStatus,
	relaysToValves,
	buildSchedulePayload,
	buildConfigPayload,
	parseLicense,
};
