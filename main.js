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
 * Milestone M4: the control engine is in place. An arbiter computes the desired valve
 * states from the mode (auto/manual/off), the schedule, the cyclic round-robin and the
 * groups; valves are switched make-before-break and the M3 dead-head safety interlock runs
 * on top of every result. Monitoring (M5), the feeder coupling (M6) and the ESP32 backend
 * (M7) follow in later milestones.
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
const { evaluateSafety, planValveTransition } = require('./lib/safety');
const { resolveDesiredValves } = require('./lib/control/arbiter');
const { translate, SUPPORTED_LANGUAGES } = require('./lib/messages');

/** Matches a per-point manual command id like "control.point.3.open". */
const POINT_OPEN_RE = /^control\.point\.(\d+)\.open$/;
/** Matches a group activation command id like "control.group.1.active". */
const GROUP_ACTIVE_RE = /^control\.group\.(\d+)\.active$/;

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
		// Safety watchdog timer and last interlock state (for edge-triggered logging).
		this.watchdog = null;
		this.interlockWasActive = false;
		// Control engine runtime state.
		this.controlTimer = null;
		this.runtimeEnabled = true;
		this.mode = 'auto';
		this.manualValves = [];
		this.groupActive = [];
		this.roundRobinStartMs = 0;
		// Last written values (to avoid rewriting unchanged states every tick).
		this.lastActive = [];
		this.lastActiveMode = '';
		this.lastOpenCount = -1;
		// System language for localized INFO messages (detected in onReady).
		this.sysLang = 'en';
		// A valid (empty) normalized config until onReady loads the real one.
		this.cfg = validateConfig({}).config;
	}

	/**
	 * Is called when databases are connected and the adapter received its configuration.
	 */
	async onReady() {
		await this.setConnected(false);
		this.sysLang = await this.detectLanguage();
		this.log.debug(`System language for INFO messages: "${this.sysLang}".`);

		// Validate & normalize the configuration (pure, see lib/config.js).
		const { config, errors, warnings } = validateConfig(this.config);
		this.cfg = config;

		this.log.debug(
			`Configuration: backend=${config.controlBackend}, points=${config.points.length}, groups=${config.groups.length}, ` +
				`schedules=${config.schedules.length}, roundRobin=${config.roundRobinEnabled} (dwell ${config.roundRobinDwellSec}s), ` +
				`pump=${config.pumpObjectId || 'none'} (${config.pumpControllable ? 'controllable' : 'observed'}), ` +
				`emergency=${config.emergencyObjectId || 'none'} (${config.emergencyValveType}, ${config.emergencyNormallyOpen ? 'NO' : 'NC'}), ` +
				`minOpenValves=${config.minOpenValves}, watchdog=${config.watchdogIntervalSec}s.`,
		);
		config.points.forEach((p, i) =>
			this.log.debug(
				`  point[${i}] "${p.name}" id=${p.id} ${p.enabled ? 'enabled' : 'disabled'} backend=${p.backendType} state=${p.objectId || '(none)'}`,
			),
		);

		warnings.forEach(w => this.log.warn(w));
		errors.forEach(e => this.log.error(e));

		if (!config.masterEnable) {
			this.logInfo('adapterDisabled');
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

		// Control engine runtime state (mirrors the persisted command states).
		this.runtimeEnabled = config.masterEnable;
		this.mode = config.masterEnable ? 'auto' : 'off';
		this.manualValves = new Array(config.points.length).fill(false);
		this.groupActive = new Array(config.groups.length).fill(false);
		this.roundRobinStartMs = Date.now();
		await this.setStateAsync('control.enabled', { val: this.runtimeEnabled, ack: true });
		await this.setStateAsync('control.mode', { val: this.mode, ack: true });

		// Safety watchdog: re-evaluate the dead-head interlock periodically (rule 3: cleared in onUnload).
		this.watchdog = this.setInterval(() => {
			this.applySafety('watchdog').catch(e => this.log.warn(`Safety watchdog failed: ${e.message}`));
		}, config.watchdogIntervalSec * 1000);

		// Control tick: recompute and apply the desired valve states periodically.
		this.controlTimer = this.setInterval(() => {
			this.controlTick('tick').catch(e => this.log.warn(`Control tick failed: ${e.message}`));
		}, 1000);
		await this.controlTick('startup');

		await this.setConnected(true);
		this.logInfo('adapterStarted', { points: config.points.length, groups: config.groups.length, mode: this.mode });
	}

	/**
	 * Detect the ioBroker system language (system.config.common.language) for localized INFO
	 * messages. Falls back to English when unset or unsupported.
	 *
	 * @returns {Promise<string>} a supported language code
	 */
	async detectLanguage() {
		try {
			const sys = await this.getForeignObjectAsync('system.config');
			const lang = sys && sys.common && sys.common.language;
			if (lang && SUPPORTED_LANGUAGES.includes(lang)) {
				return lang;
			}
		} catch (e) {
			this.log.debug(`Could not read the system language, using English: ${e.message}`);
		}
		return 'en';
	}

	/**
	 * Log an INFO message localized to the system language (see lib/messages.js).
	 *
	 * @param {string} key - message key
	 * @param {Record<string, string | number>} [params] - placeholder values
	 * @returns {void}
	 */
	logInfo(key, params) {
		this.log.info(translate(key, this.sysLang, params));
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
				.then(() => this.applySafety('hardware-change'))
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
	 * Execute a control.* command by updating the runtime state and re-running the control
	 * tick (the arbiter then drives the valves). INFO milestones are localized; the detailed
	 * per-command trace is on debug.
	 *
	 * @param {string} local - namespace-relative state id
	 * @param {ioBroker.State} state - the command state (ack === false)
	 * @returns {Promise<void>}
	 */
	async handleCommand(local, state) {
		this.log.debug(`Command received: ${local} = ${state.val}.`);

		if (local === 'control.enabled') {
			this.runtimeEnabled = Boolean(state.val);
			await this.setStateAsync(local, { val: this.runtimeEnabled, ack: true });
			this.logInfo(this.runtimeEnabled ? 'masterSwitchOn' : 'masterSwitchOff');
			await this.controlTick('enable');
			return;
		}

		if (local === 'control.mode') {
			this.mode = ['auto', 'manual', 'off'].includes(String(state.val)) ? String(state.val) : 'auto';
			await this.setStateAsync(local, { val: this.mode, ack: true });
			this.logInfo('modeChanged', { mode: this.mode });
			await this.controlTick('mode');
			return;
		}

		if (local === 'control.allOff') {
			this.mode = 'off';
			await this.setStateAsync('control.mode', { val: 'off', ack: true });
			await this.setStateAsync(local, { val: false, ack: true });
			this.logInfo('allValvesClosed');
			await this.controlTick('allOff');
			return;
		}

		const pointMatch = POINT_OPEN_RE.exec(local);
		if (pointMatch) {
			const index = Number(pointMatch[1]);
			this.manualValves[index] = Boolean(state.val);
			await this.setStateAsync(local, { val: Boolean(state.val), ack: true });
			this.log.debug(`Manual valve ${index} set to ${Boolean(state.val)} (current mode "${this.mode}").`);
			if (this.mode !== 'manual') {
				this.logInfo('manualStored', { mode: this.mode });
			}
			await this.controlTick('manual');
			return;
		}

		const groupMatch = GROUP_ACTIVE_RE.exec(local);
		if (groupMatch) {
			const index = Number(groupMatch[1]);
			this.groupActive[index] = Boolean(state.val);
			await this.setStateAsync(local, { val: Boolean(state.val), ack: true });
			this.log.debug(`Group ${index} activation set to ${Boolean(state.val)}.`);
			await this.controlTick('group');
			return;
		}

		await this.setStateAsync(local, { val: state.val, ack: true });
		this.log.debug(`Command ${local} = ${state.val} acknowledged (no specific handler).`);
	}

	/**
	 * Control tick: compute the desired valve states from the arbiter and apply them using
	 * make-before-break (open new valves before closing the ones no longer needed), then run
	 * the safety backstop. Called on startup, periodically and after every command.
	 *
	 * @param {string} source - what triggered the tick (for logging)
	 * @returns {Promise<void>}
	 */
	async controlTick(source) {
		if (!this.backend) {
			return;
		}
		const now = new Date();
		const desired = resolveDesiredValves({
			points: this.cfg.points,
			groups: this.cfg.groups,
			schedules: this.cfg.schedules,
			masterEnable: this.runtimeEnabled,
			mode: this.mode,
			manual: this.manualValves,
			groupActive: this.groupActive,
			roundRobinEnabled: this.cfg.roundRobinEnabled,
			roundRobinOrder: [],
			roundRobinDwellSec: this.cfg.roundRobinDwellSec,
			nowDay: now.getDay(),
			nowMinutes: now.getHours() * 60 + now.getMinutes(),
			elapsedMs: Date.now() - this.roundRobinStartMs,
		});

		const cur = this.backend.getCurrentState();
		this.log.silly(
			`Control tick (${source}): mode=${this.mode}, enabled=${this.runtimeEnabled}, desired=[${desired.map(Number)}], current=[${cur.valves.map(Number)}].`,
		);
		const { open, close } = planValveTransition(cur.valves, desired);
		// make-before-break: open the new valves before closing the ones no longer needed.
		for (const i of open) {
			await this.backend.setValve(i, true);
		}
		for (const i of close) {
			await this.backend.setValve(i, false);
		}
		if (open.length || close.length) {
			this.log.debug(`Control tick (${source}): opened [${open}], closed [${close}] (mode "${this.mode}").`);
		}

		// Reflect the program's intent into aeration.point.<n>.active (only on change).
		for (let i = 0; i < desired.length; i++) {
			if (this.lastActive[i] !== Boolean(desired[i])) {
				this.lastActive[i] = Boolean(desired[i]);
				await this.setStateAsync(`aeration.point.${i}.active`, { val: Boolean(desired[i]), ack: true });
			}
		}
		const activeMode = this.runtimeEnabled ? this.mode : 'disabled';
		if (this.lastActiveMode !== activeMode) {
			this.lastActiveMode = activeMode;
			await this.setStateAsync('info.activeMode', { val: activeMode, ack: true });
		}

		// The safety interlock always runs after control.
		await this.applySafety(source);
	}

	/**
	 * Evaluate and apply the dead-head safety interlock: while the pump runs, at least
	 * `minOpenValves` valves must stay open; otherwise the emergency valve is opened and,
	 * if the pump is controllable, it is stopped. Called on startup, by the watchdog and
	 * whenever a mirrored hardware state changes.
	 *
	 * @param {string} source - what triggered the evaluation (for logging)
	 * @returns {Promise<void>}
	 */
	async applySafety(source) {
		if (!this.backend) {
			return;
		}
		// Nothing to protect when no aeration point, pump or emergency valve is configured.
		const hasSystem =
			this.cfg.points.length > 0 || Boolean(this.cfg.pumpObjectId) || Boolean(this.cfg.emergencyObjectId);
		if (!hasSystem) {
			return;
		}
		const cur = this.backend.getCurrentState();
		const decision = evaluateSafety({
			valveOpen: cur.valves,
			pumpRunning: cur.pumpRunning,
			pumpMonitored: Boolean(this.cfg.pumpObjectId),
			pumpControllable: Boolean(this.cfg.pumpControllable),
			minOpenValves: this.cfg.minOpenValves,
		});

		// Edge-triggered logging so a persistent trip is not logged on every tick.
		const interlockChanged = decision.interlockActive !== this.interlockWasActive;
		if (interlockChanged && decision.interlockActive) {
			this.log.error(`Safety interlock TRIPPED (${source}): ${decision.tripReason}`);
		} else if (interlockChanged && !decision.interlockActive) {
			this.logInfo('interlockCleared');
		} else if (decision.interlockActive) {
			this.log.silly(`Safety interlock still active (${source}); ${decision.openValveCount} valve(s) open.`);
		}
		this.interlockWasActive = decision.interlockActive;

		// Open/close the emergency valve only when the target differs from the current state.
		if (decision.emergencyValve !== cur.emergencyOpen) {
			await this.backend.setEmergency(decision.emergencyValve);
		}
		// Emergency pump stop (bypasses the anti short-cycle guard).
		if (decision.stopPump && cur.pumpRunning) {
			await this.backend.setPump(false);
		}

		// Update the status states only on change (avoid rewriting every tick).
		if (interlockChanged) {
			await this.setStateAsync('safety.interlockActive', { val: decision.interlockActive, ack: true });
		}
		if (decision.openValveCount !== this.lastOpenCount) {
			this.lastOpenCount = decision.openValveCount;
			await this.setStateAsync('safety.openValveCount', { val: decision.openValveCount, ack: true });
		}
		if (decision.tripReason) {
			await this.setStateAsync('safety.lastTripReason', { val: decision.tripReason, ack: true });
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
	async onUnload(callback) {
		try {
			if (this.controlTimer) {
				this.clearInterval(this.controlTimer);
				this.controlTimer = null;
			}
			if (this.watchdog) {
				this.clearInterval(this.watchdog);
				this.watchdog = null;
			}
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
