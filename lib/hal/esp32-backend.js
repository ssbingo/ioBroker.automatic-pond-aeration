'use strict';

const { HardwareBackend } = require('./backend');
const {
	SUPPORTED_PROTOCOL,
	buildUrl,
	authHeaders,
	emergencyRelayState,
	emergencyOpenFromRelay,
	parseStatus,
	relaysToValves,
	buildConfigPayload,
} = require('./esp32-protocol');

/*
 * Esp32Backend — drives the pond aeration through the reference firmware on a
 * Waveshare ESP32-S3-POE-ETH-8DI-8RO over HTTP (JSON, port 80; see the firmware repo's
 * PROTOCOL.md). It pushes the safety config once, then polls GET /api/status and keeps the
 * heartbeat alive so the firmware's on-device failsafe stays disarmed while the adapter is healthy.
 * Relay level: energizing a valve relay opens the valve (NC wiring); the emergency-valve polarity
 * follows `emergencyNormallyOpen`.
 */

/** Hardware backend that talks to the ESP32 reference firmware over HTTP. */
class Esp32Backend extends HardwareBackend {
	/**
	 * @param {ioBroker.Adapter} adapter - the adapter instance
	 * @param {ioBroker.AdapterConfig} config - the normalized configuration
	 */
	constructor(adapter, config) {
		super(adapter, config);
		this.pollTimer = null;
		this.valveOpen = this.config.points.map(() => false);
		this.pumpRunning = false;
		this.emergencyOpen = false;
		this.failsafe = false;
		this.sensorValues = { oxygen: null, airTemp: null, waterTemp: null, pressure: null };
	}

	/** @returns {{ oxygen: number|null, airTemp: number|null, waterTemp: number|null, pressure: number|null }} */
	getSensorValues() {
		return { ...this.sensorValues };
	}

	/** @returns {{ valves: boolean[], pumpRunning: boolean, emergencyOpen: boolean }} */
	getCurrentState() {
		return {
			valves: this.config.points.map((_p, i) => Boolean(this.valveOpen[i])),
			pumpRunning: this.pumpRunning,
			emergencyOpen: this.emergencyOpen,
		};
	}

	/**
	 * Perform an ESP32 API request with a bounded timeout and optional bearer auth.
	 *
	 * @param {string} method - HTTP method
	 * @param {string} path - API path
	 * @param {object} [body] - JSON body for POST
	 * @returns {Promise<any>} parsed JSON response (or null for empty)
	 */
	async request(method, path, body) {
		const url = buildUrl(this.config.esp32Host, this.config.esp32Port, path);
		const controller = new AbortController();
		const timer = this.adapter.setTimeout(() => controller.abort(), 5000);
		try {
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json', ...authHeaders(this.config.esp32AuthToken) },
				body: body ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			const text = await res.text();
			return text ? JSON.parse(text) : null;
		} finally {
			this.adapter.clearTimeout(timer);
		}
	}

	/** @returns {Promise<void>} */
	async init() {
		if (!this.config.esp32Host) {
			this.adapter.log.warn('ESP32 backend selected but no host/IP configured — cannot connect.');
			return;
		}
		try {
			const info = await this.request('GET', '/api/info');
			this.adapter.log.info(
				`ESP32 firmware "${info?.device}" v${info?.fw} (protocol ${info?.protocol}) at ${this.config.esp32Host}.`,
			);
			if (Number(info?.protocol) !== SUPPORTED_PROTOCOL) {
				this.adapter.log.warn(
					`ESP32 protocol ${info?.protocol} differs from the supported ${SUPPORTED_PROTOCOL}; behaviour may be wrong.`,
				);
			}
			await this.request('POST', '/api/config', buildConfigPayload(this.config));
			this.adapter.log.debug('ESP32 failsafe/button config pushed.');
		} catch (e) {
			this.adapter.log.warn(`ESP32 init failed (will keep retrying via polling): ${e.message}`);
		}
		await this.pollOnce();
		const intervalMs = Math.max(2000, (Number(this.config.pollIntervalSec) || 30) * 1000);
		this.pollTimer = this.adapter.setInterval(() => {
			this.pollOnce().catch(e => this.adapter.log.debug(`ESP32 poll failed: ${e.message}`));
		}, intervalMs);
	}

	/**
	 * Send a heartbeat, read the status, mirror it into the adapter's data points and let the
	 * adapter re-run its safety/monitoring on the fresh state.
	 *
	 * @returns {Promise<void>}
	 */
	async pollOnce() {
		try {
			await this.request('POST', '/api/heartbeat').catch(() => {});
			const status = parseStatus(await this.request('GET', '/api/status'));
			this.failsafe = status.failsafe;
			this.valveOpen = relaysToValves(status.relays, this.config.points);
			const pumpRelay = Number(this.config.esp32PumpRelay);
			this.pumpRunning = Boolean(status.relays[pumpRelay]);
			const emRelay = Number(this.config.esp32EmergencyRelay);
			this.emergencyOpen = emergencyOpenFromRelay(
				Boolean(status.relays[emRelay]),
				Boolean(this.config.emergencyNormallyOpen),
			);
			this.sensorValues = {
				oxygen: status.sensors.oxygen,
				airTemp: status.sensors.airTemp,
				waterTemp: status.sensors.waterTemp,
				pressure: status.sensors.pressure,
			};

			for (let i = 0; i < this.config.points.length; i++) {
				await this.adapter.setStateChangedAsync(`aeration.point.${i}.valveState`, {
					val: Boolean(this.valveOpen[i]),
					ack: true,
				});
			}
			await this.adapter.setStateChangedAsync('safety.pumpRunning', { val: this.pumpRunning, ack: true });
			await this.adapter.setStateChangedAsync('safety.emergencyValve', { val: this.emergencyOpen, ack: true });
			for (const [kind, id] of [
				['oxygen', 'sensors.oxygen'],
				['airTemp', 'sensors.airTemperature'],
				['waterTemp', 'sensors.waterTemperature'],
				['pressure', 'sensors.pressure'],
			]) {
				if (this.sensorValues[kind] !== null) {
					await this.adapter.setStateChangedAsync(id, { val: this.sensorValues[kind], ack: true });
				}
			}
			await this.adapter.setStateChangedAsync('info.connection', { val: true, ack: true });

			// Let the adapter apply its own safety interlock + monitoring on the fresh state.
			/** @type {any} */
			const app = this.adapter;
			if (typeof app.applySafety === 'function') {
				await app.applySafety('esp32-poll');
			}
			if (typeof app.updateMonitoring === 'function') {
				await app.updateMonitoring();
			}
		} catch (e) {
			await this.adapter.setStateChangedAsync('info.connection', { val: false, ack: true });
			throw e;
		}
	}

	/**
	 * @param {number} index - aeration point index
	 * @param {boolean} open - target valve state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setValve(index, open) {
		const p = this.config.points[index];
		if (!p) {
			return false;
		}
		if (this.config.dryRun) {
			this.adapter.log.info(
				`[DRY-RUN] would ${open ? 'OPEN' : 'CLOSE'} valve ${index} "${p.name}" (ESP32 relay ${p.espChannel}).`,
			);
			this.valveOpen[index] = open;
			await this.adapter.setStateAsync(`aeration.point.${index}.valveState`, { val: open, ack: true });
			return true;
		}
		await this.request('POST', '/api/relay', { index: Number(p.espChannel), on: Boolean(open) });
		this.valveOpen[index] = open;
		return true;
	}

	/**
	 * @param {boolean} open - target emergency valve state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setEmergency(open) {
		const relay = Number(this.config.esp32EmergencyRelay);
		const on = emergencyRelayState(open, Boolean(this.config.emergencyNormallyOpen));
		if (this.config.dryRun) {
			this.adapter.log.info(
				`[DRY-RUN] would ${open ? 'OPEN' : 'CLOSE'} the emergency valve (ESP32 relay ${relay}).`,
			);
			this.emergencyOpen = open;
			await this.adapter.setStateAsync('safety.emergencyValve', { val: open, ack: true });
			return true;
		}
		await this.request('POST', '/api/relay', { index: relay, on });
		this.emergencyOpen = open;
		return true;
	}

	/**
	 * @param {boolean} on - target pump state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setPump(on) {
		if (!this.config.pumpControllable) {
			return false;
		}
		const relay = Number(this.config.esp32PumpRelay);
		if (this.config.dryRun) {
			this.adapter.log.info(`[DRY-RUN] would switch the pump ${on ? 'ON' : 'OFF'} (ESP32 relay ${relay}).`);
			this.pumpRunning = on;
			await this.adapter.setStateAsync('safety.pumpRunning', { val: on, ack: true });
			return true;
		}
		await this.request('POST', '/api/relay', { index: relay, on: Boolean(on) });
		this.pumpRunning = on;
		return true;
	}

	/**
	 * The ESP32 backend does not watch foreign ioBroker states (it polls the device).
	 *
	 * @param {string} _id - a foreign state id
	 * @returns {boolean} always false
	 */
	ownsForeignState(_id) {
		return false;
	}

	/**
	 * @returns {Promise<void>}
	 */
	async handleForeignChange() {
		/* not used by the ESP32 backend */
	}

	/** @returns {Promise<void>} */
	async destroy() {
		if (this.pollTimer) {
			this.adapter.clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
	}
}

module.exports = { Esp32Backend };
