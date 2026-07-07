'use strict';

/*
 * ioBroker.automatic-pond-aeration
 * Controls and monitors a pond aeration system. Aeration points (valves) are driven
 * by schedule, cyclic round-robin or groups. A safety interlock guarantees that at
 * least one valve stays open while the pump runs (otherwise the emergency valve is
 * opened and the pump is switched off). Optional oxygen/temperature/pressure
 * monitoring, astronomical times and geolocation, plus a coupling to
 * ioBroker.automatic-feeder that pauses selected points during feeding.
 *
 * This is the M0 scaffold: lifecycle, base objects and configuration guards are in
 * place; the control engine, HAL backends and monitoring follow in later milestones.
 *
 * Logging levels used (configurable per instance in the ioBroker admin):
 *   error  - failures that need attention (write failed, unexpected exception)
 *   warn   - misconfiguration / recoverable problems (more groups than points, ...)
 *   info   - operational milestones (startup, mode changes)
 *   debug  - detailed flow (config, commands, decisions)
 *   silly  - very verbose tracing
 */

const utils = require('@iobroker/adapter-core');

/** Hard upper limit on the number of aeration points (product requirement). */
const MAX_AERATION_POINTS = 8;

class AutomaticPondAeration extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	constructor(options) {
		super({
			...options,
			name: 'automatic-pond-aeration',
		});

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and the adapter received its configuration.
	 */
	async onReady() {
		await this.setConnected(false);

		if (!this.validateConfig()) {
			// Keep the instance alive but not "connected" so the misconfiguration is visible.
			this.log.warn('Configuration is incomplete or invalid – waiting for a valid configuration.');
			return;
		}

		await this.ensureBaseObjects();
		this.subscribeStates('control.*');

		await this.setConnected(true);
		this.log.info('Automatic Pond Aeration started (scaffold – control engine follows in later milestones).');
	}

	/**
	 * Validate the essential parts of the configuration. Full validation and object
	 * cleanup are added in milestone M1.
	 *
	 * @returns {boolean} true if the configuration is usable
	 */
	validateConfig() {
		const cfg = this.config;

		if (!cfg.masterEnable) {
			this.log.info('Adapter is disabled via configuration (masterEnable = false).');
		}

		const points = Array.isArray(cfg.points) ? cfg.points : [];
		const groups = Array.isArray(cfg.groups) ? cfg.groups : [];

		if (points.length > MAX_AERATION_POINTS) {
			this.log.warn(
				`Configured ${points.length} aeration points, but the maximum is ${MAX_AERATION_POINTS}. Extra points are ignored.`,
			);
		}

		// Hard product rule: there must never be more groups than aeration points.
		if (groups.length > points.length) {
			this.log.warn(
				`There are more groups (${groups.length}) than aeration points (${points.length}); groups must never exceed points.`,
			);
		}

		if (cfg.minOpenValves < 1) {
			this.log.warn(
				`minOpenValves is ${cfg.minOpenValves}; at least 1 valve must stay open while the pump runs. Using 1.`,
			);
		}

		return true;
	}

	/**
	 * Create the base objects that always exist (info is created via instanceObjects;
	 * control/safety are created here so they can grow with the configuration).
	 */
	async ensureBaseObjects() {
		await this.setObjectNotExistsAsync('control', {
			type: 'channel',
			common: { name: 'Control' },
			native: {},
		});
		await this.setObjectNotExistsAsync('control.enabled', {
			type: 'state',
			common: {
				name: 'Master enable',
				role: 'switch.enable',
				type: 'boolean',
				read: true,
				write: true,
				def: true,
			},
			native: {},
		});

		await this.setObjectNotExistsAsync('safety', {
			type: 'channel',
			common: { name: 'Safety' },
			native: {},
		});
		await this.setObjectNotExistsAsync('safety.interlockActive', {
			type: 'state',
			common: {
				name: 'Safety interlock active',
				role: 'indicator.alarm',
				type: 'boolean',
				read: true,
				write: false,
				def: false,
			},
			native: {},
		});
		await this.setStateAsync('safety.interlockActive', { val: false, ack: true });
	}

	/**
	 * Set the info.connection indicator.
	 *
	 * @param {boolean} connected - whether the adapter considers itself operational
	 */
	async setConnected(connected) {
		await this.setStateAsync('info.connection', { val: !!connected, ack: true });
	}

	/**
	 * Is called if a subscribed state changes.
	 *
	 * @param {string} id - full state id
	 * @param {ioBroker.State | null | undefined} state - the new state
	 */
	onStateChange(id, state) {
		// Only react to fresh commands (ack === false); acknowledged states are our own echoes.
		if (!state || state.ack) {
			return;
		}

		const local = id.startsWith(`${this.namespace}.`) ? id.substring(this.namespace.length + 1) : id;

		if (local === 'control.enabled') {
			this.log.debug(`control.enabled command received: ${state.val}`);
			// Acknowledge the command; the control engine (M4) will act on it.
			this.setState('control.enabled', { val: !!state.val, ack: true });
		}
	}

	/**
	 * Handle messages sent from the admin UI (sendTo). Placeholder for the discovery,
	 * geocoding and valve-test handlers added in later milestones.
	 *
	 * @param {ioBroker.Message} obj - the message
	 */
	onMessage(obj) {
		if (!obj || typeof obj !== 'object' || !obj.command) {
			return;
		}

		switch (obj.command) {
			case 'ping':
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, { pong: true }, obj.callback);
				}
				break;
			default:
				this.log.debug(`Unknown admin message command: ${obj.command}`);
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, { error: `unknown command ${obj.command}` }, obj.callback);
				}
				break;
		}
	}

	/**
	 * Is called when the adapter shuts down – clean up everything.
	 *
	 * @param {() => void} callback - must be called when cleanup is done
	 */
	onUnload(callback) {
		try {
			// Timers/intervals started by later milestones are cleared here.
			this.setState('info.connection', { val: false, ack: true });
			callback();
		} catch {
			callback();
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	module.exports = options => new AutomaticPondAeration(options);
} else {
	// otherwise start the instance directly
	new AutomaticPondAeration();
}
