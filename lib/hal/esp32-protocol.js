'use strict';

/*
 * ESP32 protocol helpers (pure) for the Esp32Backend.
 *
 * These build the request URLs/payloads and translate the firmware's relay-level status into the
 * adapter's point/pump/emergency model. No I/O here (the backend does the fetch), so the mapping
 * and the failsafe-config payload are unit-tested directly. Contract: PROTOCOL.md in the firmware
 * repo (pond-aeration-esp32-firmware), protocol version 1.
 */

/** The protocol major version this adapter speaks. */
const SUPPORTED_PROTOCOL = 1;

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
 * Build the `POST /api/config` payload that configures the firmware's on-device failsafe, heartbeat
 * and per-channel buttons from the adapter configuration. Valves use each point's espChannel; the
 * override button for point i is mapped to digital input i by default.
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
	return {
		valveRelays,
		emergencyRelay: Number(config.esp32EmergencyRelay),
		emergencyEnergizedOpen: !config.emergencyNormallyOpen,
		pumpRelay: Number(config.esp32PumpRelay),
		pumpControllable: Boolean(config.pumpControllable),
		minOpen: Number(config.minOpenValves) || 1,
		heartbeatTimeoutMs: Math.max(3000, (Number(config.pollIntervalSec) || 30) * 3 * 1000),
		buttons,
		authToken: config.esp32AuthToken || '',
	};
}

module.exports = {
	SUPPORTED_PROTOCOL,
	buildUrl,
	authHeaders,
	emergencyRelayState,
	emergencyOpenFromRelay,
	parseStatus,
	relaysToValves,
	buildConfigPayload,
};
