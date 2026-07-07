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
 * Milestone M2: the hardware abstraction layer (HAL) is in place. The ioBroker backend
 * drives valves/pump/emergency valve through existing foreign states (rule 1) and mirrors
 * their status into the adapter's data points. The control engine (arbiter, schedule,
 * round-robin, groups) and the safety interlock follow in later milestones.
 *
 * Logging levels used (configurable per instance in the ioBroker admin):
 *   error  - failures that need attention (write failed, unexpected exception)
 *   warn   - misconfiguration / recoverable problems (more groups than points, ...)
 *   info   - operational milestones (startup, mode changes)
 *   debug  - detailed flow (config, commands, decisions)
 *   silly  - very verbose tracing
 */

const utils = require('@iobroker/adapter-core');
const { validateConfig } = require('./lib/config');
const { buildObjectModel, computeObsolete } = require('./lib/objects');
const { IoBrokerBackend } = require('./lib/hal/iobroker-backend');

/** Matches a per-point manual command id like "control.point.3.open". */
const POINT_OPEN_RE = /^control\.point\.(\d+)\.open$/;

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

		this.objectModel = [];
		// Set in onReady once the configuration is validated.
		this.backend = null;
		// A valid (empty) normalized config until onReady loads the real one.
		this.cfg = validateConfig({}).config;
	}

	/**
	 * Is called when databases are connected and the adapter received its configuration.
	 */
	async onReady() {
		await this.setConnected(false);

		// Validate & normalize the configuration (pure, see lib/config.js).
		const { config, errors, warnings } = validateConfig(this.config);
		this.cfg = config;

		warnings.forEach(w => this.log.warn(w));
		errors.forEach(e => this.log.error(e));

		if (!config.masterEnable) {
			this.log.info(
				'Adapter is disabled via configuration (masterEnable = false). Objects are kept in sync, no control is performed.',
			);
		}

		// Create the desired objects and remove obsolete ones (rule 8).
		const removed = await this.syncObjects(config);
		this.log.debug(`Object model synced: ${this.objectModel.length} objects, ${removed} obsolete removed.`);

		await this.setStateAsync('info.backend', { val: config.controlBackend, ack: true });
		await this.setStateAsync('info.activeMode', { val: config.masterEnable ? 'idle' : 'disabled', ack: true });

		// Hardware abstraction layer. Only the ioBroker backend exists so far; the ESP32
		// backend follows in M7.
		this.backend = new IoBrokerBackend(this, config);
		await this.backend.init();

		// Our own command states (foreign hardware states are subscribed by the backend).
		this.subscribeStates('control.*');

		await this.setConnected(true);
		this.log.info(
			`Automatic Pond Aeration started: ${config.points.length} aeration point(s), ${config.groups.length} group(s). Control engine follows in later milestones.`,
		);
	}

	/**
	 * Create/update every object of the current model and delete obsolete managed objects.
	 *
	 * @param {ioBroker.AdapterConfig} config - the normalized configuration
	 * @returns {Promise<number>} number of obsolete objects removed
	 */
	async syncObjects(config) {
		this.objectModel = buildObjectModel(config);
		const desiredIds = new Set(this.objectModel.map(m => m.id));

		for (const { id, obj } of this.objectModel) {
			await this.setObjectNotExistsAsync(id, obj);
			// Keep container names in sync when a point/group was renamed (extend = merge, keeps custom settings).
			if (obj.type === 'channel' || obj.type === 'folder') {
				await this.extendObjectAsync(id, { common: { name: obj.common.name } });
			}
		}

		const existing = await this.getAdapterObjectsAsync();
		const existingRel = Object.keys(existing).map(full => full.substring(this.namespace.length + 1));
		const obsolete = computeObsolete(existingRel, desiredIds);
		for (const id of obsolete) {
			try {
				await this.delObjectAsync(id, { recursive: true });
				this.log.debug(`Removed obsolete object ${id}`);
			} catch (e) {
				this.log.debug(`Could not remove obsolete object ${id}: ${e.message}`);
			}
		}
		return obsolete.length;
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
	 * Is called if a subscribed state changes (our own control.* states as well as the
	 * subscribed foreign hardware states).
	 *
	 * @param {string} id - full state id
	 * @param {ioBroker.State | null | undefined} state - the new state
	 */
	onStateChange(id, state) {
		if (!state) {
			return;
		}

		// Foreign hardware states → mirror into status data points (any ack).
		if (this.backend && this.backend.ownsForeignState(id)) {
			this.backend
				.handleForeignChange(id, state)
				.catch(e => this.log.warn(`Reflecting ${id} failed: ${e.message}`));
			return;
		}

		// Own command states: only react to fresh commands (ack === false).
		if (state.ack) {
			return;
		}
		const local = id.startsWith(`${this.namespace}.`) ? id.substring(this.namespace.length + 1) : id;
		if (!local.startsWith('control.')) {
			return;
		}
		this.handleCommand(local, state).catch(e => this.log.warn(`Command ${local} failed: ${e.message}`));
	}

	/**
	 * Execute a control.* command. The full arbiter (priorities, schedule, round-robin,
	 * groups) follows in M4; for now this routes the manual valve commands to the backend.
	 *
	 * @param {string} local - namespace-relative state id
	 * @param {ioBroker.State} state - the command state (ack === false)
	 * @returns {Promise<void>}
	 */
	async handleCommand(local, state) {
		if (local === 'control.allOff') {
			this.log.info('Command: close all valves.');
			for (let i = 0; i < this.cfg.points.length; i++) {
				await this.backend?.setValve(i, false);
			}
			await this.setStateAsync(local, { val: false, ack: true });
			return;
		}

		const pointMatch = POINT_OPEN_RE.exec(local);
		if (pointMatch) {
			const index = Number(pointMatch[1]);
			const open = Boolean(state.val);
			const issued = await this.backend?.setValve(index, open);
			if (!issued) {
				this.log.warn(`Aeration point ${index} cannot be switched: no valve state mapped.`);
			}
			await this.setStateAsync(local, { val: open, ack: true });
			return;
		}

		// Other commands (enabled, mode, group activation) are acknowledged; the control
		// engine will act on them in M4.
		await this.setStateAsync(local, { val: state.val, ack: true });
		this.log.debug(`Command ${local} = ${state.val} acknowledged (control engine follows in M4).`);
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
	async onUnload(callback) {
		try {
			if (this.backend) {
				await this.backend.destroy();
			}
			await this.setStateAsync('info.connection', { val: false, ack: true });
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
