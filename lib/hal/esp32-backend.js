'use strict';

const { HardwareBackend } = require('./backend');
const {
	buildUrl,
	authHeaders,
	emergencyRelayState,
	emergencyOpenFromRelay,
	parseStatus,
	relaysToValves,
	buildConfigPayload,
	parseLicense,
} = require('./esp32-protocol');
const { evaluateFirmware } = require('../firmware-compat');

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
		// Set once GET /api/info has been read for this connection; reset on a connection loss so the
		// firmware version/compatibility is re-checked after a reconnect or an OTA update.
		this.deviceInfoKnown = false;
		// Licence status parsed from GET /api/info. Only present when the firmware ships the private
		// licensing overlay; `present:false` (public/ungated firmware) means control is always allowed.
		this.license = parseLicense(null);
		this._lastBlockWarn = 0;
	}

	/**
	 * Evaluate the device's GET /api/info against this adapter's firmware expectations, log it at the
	 * right level and publish `info.deviceFirmware` + `info.firmwareCompatible`. The protocol version
	 * is the hard compatibility gate; the firmware version drives an advisory recommendation.
	 *
	 * @param {any} info - the parsed GET /api/info response
	 * @returns {Promise<void>}
	 */
	async applyDeviceInfo(info) {
		const fw = info && typeof info.fw === 'string' ? info.fw : '';
		const verdict = evaluateFirmware(fw, info ? info.protocol : null);
		this.adapter.log.info(
			`ESP32 firmware "${info?.device}" v${fw || '?'} (protocol ${info?.protocol}) at ${this.config.esp32Host} — this adapter recommends firmware ${verdict.recommended} (protocol ${verdict.protocol}).`,
		);
		if (verdict.level === 'incompatible') {
			this.adapter.log.error(`ESP32 ${verdict.message}`);
		} else if (verdict.level === 'outdated') {
			this.adapter.log.warn(`ESP32 ${verdict.message}`);
		} else if (verdict.level !== 'ok') {
			this.adapter.log.info(`ESP32 ${verdict.message}`);
		}
		await this.adapter.setStateChangedAsync('info.deviceFirmware', { val: fw, ack: true });
		await this.adapter.setStateChangedAsync('info.firmwareCompatible', { val: verdict.compatible, ack: true });
		await this.applyLicenseInfo(info);
		this.deviceInfoKnown = true;
	}

	/**
	 * Parse the optional licence fields from GET /api/info, mirror them into the info.* states and log a
	 * concise status. Absent fields mean the firmware has no licensing overlay → control stays open.
	 * Feature tiers: free = monitoring only, community = relay control, pro = + standalone schedule.
	 *
	 * @param {any} info - the parsed GET /api/info response
	 * @returns {Promise<void>}
	 */
	async applyLicenseInfo(info) {
		const lic = parseLicense(info);
		this.license = lic;
		if (lic.present) {
			const trialNote = lic.trial ? ` (trial: ${lic.trialDaysLeft} day(s) left)` : '';
			if (lic.controlAllowed) {
				this.adapter.log.info(`ESP32 licence tier "${lic.tier}"${trialNote} — device code ${lic.deviceCode}.`);
			} else {
				this.adapter.log.warn(
					`ESP32 monitoring only (tier "${lic.tier}") — relay control is locked. Device code ${lic.deviceCode}: enter an activation key on the device page /license.`,
				);
			}
		}
		await this.adapter.setStateChangedAsync('info.licenseTier', { val: lic.tier, ack: true });
		await this.adapter.setStateChangedAsync('info.licenseTrialDaysLeft', { val: lic.trialDaysLeft, ack: true });
		await this.adapter.setStateChangedAsync('info.deviceCode', { val: lic.deviceCode, ack: true });
		await this.adapter.setStateChangedAsync('info.licenseControlBlocked', {
			val: lic.present && !lic.controlAllowed,
			ack: true,
		});
	}

	/** @returns {boolean} whether the device currently accepts relay-control commands. */
	controlAllowed() {
		return this.license.controlAllowed;
	}

	/**
	 * Record + (throttled) log that the device refused a control command because it is not licensed for
	 * control. The device's own on-device failsafe keeps handling safety regardless.
	 *
	 * @param {string} what - short description of the rejected command
	 * @returns {Promise<void>}
	 */
	async onControlBlocked(what) {
		await this.adapter.setStateChangedAsync('info.licenseControlBlocked', { val: true, ack: true });
		const now = Date.now();
		if (now - this._lastBlockWarn > 60000) {
			this._lastBlockWarn = now;
			const tier = this.license.tier || 'free';
			this.adapter.log.warn(
				`ESP32 refused a control command (${what}): device not licensed for control (tier "${tier}"). Monitoring only — enter an activation key on the device page /license.`,
			);
		}
	}

	/**
	 * Issue a relay command, handling a licence rejection (HTTP 403, or a known-free tier) gracefully
	 * instead of throwing: the command is dropped, a throttled warning is logged and
	 * info.licenseControlBlocked is set. Other errors propagate as before.
	 *
	 * @param {number} index - ESP32 relay index
	 * @param {boolean} on - target state
	 * @param {string} what - short description for logging
	 * @returns {Promise<boolean>} whether the command was actually issued
	 */
	async sendRelay(index, on, what) {
		if (!this.controlAllowed()) {
			await this.onControlBlocked(what);
			return false;
		}
		try {
			await this.request('POST', '/api/relay', { index, on });
			if (this.license.present) {
				await this.adapter.setStateChangedAsync('info.licenseControlBlocked', { val: false, ack: true });
			}
			return true;
		} catch (e) {
			/** @type {any} */
			const err = e;
			if (err.status === 403) {
				await this.onControlBlocked(what);
				return false;
			}
			throw e;
		}
	}

	/** @returns {{ oxygen: number|null, airTemp: number|null, waterTemp: number|null, pressure: number|null }} */
	getSensorValues() {
		return { ...this.sensorValues };
	}

	/**
	 * Push the configured ioBroker sensor data points to the ESP so its own web UI can show them
	 * (values that are not wired to the ESP itself). Sent every poll; enabled-but-absent or disabled
	 * sensors are sent as null. Does nothing if no sensor source is configured.
	 *
	 * @returns {Promise<void>}
	 */
	async pushSensors() {
		const map = [
			{ en: this.config.o2Enabled, id: this.config.o2ObjectId, key: 'oxygen' },
			{ en: this.config.waterTempEnabled, id: this.config.waterTempObjectId, key: 'waterTemp' },
			{ en: this.config.airTempEnabled, id: this.config.airTempObjectId, key: 'airTemp' },
			{ en: this.config.pressureEnabled, id: this.config.pressureObjectId, key: 'pressure' },
		];
		if (!map.some(m => m.en && m.id)) {
			return; // no ioBroker sensor configured → nothing to show on the device
		}
		/** @type {Record<string, number|null>} */
		const body = { oxygen: null, waterTemp: null, airTemp: null, pressure: null };
		for (const m of map) {
			if (!m.en || !m.id) {
				continue;
			}
			try {
				const st = await this.adapter.getForeignStateAsync(m.id);
				const v = st ? st.val : null;
				body[m.key] = v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : null;
			} catch {
				/* leave null */
			}
		}
		await this.request('POST', '/api/sensors', body).catch(e =>
			this.adapter.log.debug(`ESP32 sensor push failed: ${e.message}`),
		);
	}

	/** @returns {{ valves: boolean[], pumpRunning: boolean, pumpMonitored: boolean, emergencyOpen: boolean }} */
	getCurrentState() {
		return {
			valves: this.config.points.map((_p, i) => Boolean(this.valveOpen[i])),
			pumpRunning: this.pumpRunning,
			// The pump relay is polled every cycle, so its state is always known on this backend.
			pumpMonitored: Number(this.config.esp32PumpRelay) >= 0,
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
				// Standalone @type cast (survives eslint --fix) so callers can read `.status` (e.g. 403).
				/** @type {any} */
				const err = new Error(`HTTP ${res.status}`);
				err.status = res.status;
				throw err;
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
			await this.applyDeviceInfo(info);
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
			// (Re)read the firmware version + compatibility once per connection (also after a reboot/OTA).
			if (!this.deviceInfoKnown) {
				const info = await this.request('GET', '/api/info').catch(() => null);
				if (info) {
					await this.applyDeviceInfo(info);
				}
			}
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

			// Mirror the configured ioBroker sensor data points to the device web UI.
			await this.pushSensors();

			// Let the adapter apply its own safety interlock + monitoring on the fresh state.
			// (Cast to any: applySafety/updateMonitoring/reflectEsp32Buttons live on the concrete
			// adapter, not on the ioBroker.Adapter base type. Standalone comment form so eslint --fix
			// does not strip it.)
			/** @type {any} */
			const app = this.adapter;
			// Reflect the firmware's physical override buttons (DI i ↔ point i) back into the
			// adapter arbiter so a button pressed at the device shows up in ioBroker and gets the
			// same "force on" priority the adapter would give a boolean-state button.
			if (typeof app.reflectEsp32Buttons === 'function') {
				await app.reflectEsp32Buttons(status.buttons);
			}
			if (typeof app.applySafety === 'function') {
				await app.applySafety('esp32-poll');
			}
			if (typeof app.updateMonitoring === 'function') {
				await app.updateMonitoring();
			}
		} catch (e) {
			await this.adapter.setStateChangedAsync('info.connection', { val: false, ack: true });
			this.deviceInfoKnown = false; // re-read /api/info (fw/compat) after the connection recovers
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
		const issued = await this.sendRelay(Number(p.espChannel), Boolean(open), `valve ${index}`);
		if (issued) {
			this.valveOpen[index] = open;
		}
		return issued;
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
		const issued = await this.sendRelay(relay, on, 'emergency valve');
		if (issued) {
			this.emergencyOpen = open;
		}
		return issued;
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
		const issued = await this.sendRelay(relay, Boolean(on), 'pump');
		if (issued) {
			this.pumpRunning = on;
		}
		return issued;
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
