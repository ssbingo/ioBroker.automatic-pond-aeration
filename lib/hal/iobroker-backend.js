'use strict';

const { HardwareBackend } = require('./backend');
const { valveCommandValue, interpretValveValue } = require('./mapping');

/*
 * IoBrokerBackend – drives valves, the pump and the emergency valve through EXISTING
 * ioBroker states (rule 1: only control foreign states, never invent them). Commands are
 * written with ack=false; the real status is read back by subscribing to the same foreign
 * states and mirrored into the adapter's own status data points.
 */

/**
 * Hardware backend that drives valves/pump/emergency valve through existing ioBroker
 * foreign states and mirrors their status back into the adapter's data points.
 */
class IoBrokerBackend extends HardwareBackend {
	/**
	 * @param {ioBroker.Adapter} adapter - the adapter instance
	 * @param {ioBroker.AdapterConfig} config - the normalized configuration
	 */
	constructor(adapter, config) {
		super(adapter, config);
		// foreign state id -> { kind: 'valve' | 'pump' | 'emergency', index?: number }
		this.foreignMap = new Map();
		// Current mirrored hardware state (used by the safety watchdog).
		this.valveOpen = [];
		this.pumpRunning = false;
		this.emergencyOpen = false;
	}

	/**
	 * Snapshot of the current mirrored hardware state for the safety layer.
	 *
	 * @returns {{ valves: boolean[], pumpRunning: boolean, emergencyOpen: boolean }}
	 */
	getCurrentState() {
		const valves = this.config.points.map((_p, i) => Boolean(this.valveOpen[i]));
		return { valves, pumpRunning: this.pumpRunning, emergencyOpen: this.emergencyOpen };
	}

	/** Build the foreign-state-id -> descriptor map from the configuration. */
	buildForeignMap() {
		this.foreignMap.clear();
		this.config.points.forEach((p, i) => {
			if (p.backendType === 'iobroker' && p.objectId) {
				this.foreignMap.set(p.objectId, { kind: 'valve', index: i });
			}
		});
		if (this.config.pumpObjectId) {
			this.foreignMap.set(this.config.pumpObjectId, { kind: 'pump' });
		}
		if (this.config.emergencyObjectId) {
			this.foreignMap.set(this.config.emergencyObjectId, { kind: 'emergency' });
		}
	}

	/** @returns {Promise<void>} */
	async init() {
		this.buildForeignMap();
		for (const [id, desc] of this.foreignMap) {
			this.adapter.log.debug(
				`Backend mapping: ${id} -> ${desc.kind}${desc.index !== undefined ? ` #${desc.index}` : ''}`,
			);
			await this.adapter.subscribeForeignStatesAsync(id);
		}
		// Read the current values once and reflect them into the status data points.
		for (const id of this.foreignMap.keys()) {
			try {
				const st = await this.adapter.getForeignStateAsync(id);
				await this.handleForeignChange(id, st);
			} catch (e) {
				this.adapter.log.debug(`Could not read foreign state ${id}: ${e.message}`);
			}
		}
		this.adapter.log.debug(`ioBroker backend watching ${this.foreignMap.size} foreign state(s).`);
	}

	/**
	 * @param {string} id - a foreign state id
	 * @returns {boolean} whether this backend manages that id
	 */
	ownsForeignState(id) {
		return this.foreignMap.has(id);
	}

	/**
	 * @param {number} index - aeration point index
	 * @param {boolean} open - target valve state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setValve(index, open) {
		const p = this.config.points[index];
		if (!p || p.backendType !== 'iobroker' || !p.objectId) {
			this.adapter.log.debug(`setValve(${index}, ${open}) skipped: no ioBroker state mapped for this point.`);
			return false;
		}
		const value = valveCommandValue(open, p.onValue, p.offValue);
		this.adapter.log.debug(
			`Valve ${index} "${p.name}" -> ${open ? 'OPEN' : 'CLOSE'} (write ${p.objectId} = ${value}).`,
		);
		await this.adapter.setForeignStateAsync(p.objectId, value, false);
		return true;
	}

	/**
	 * @param {boolean} open - target emergency valve state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setEmergency(open) {
		if (!this.config.emergencyObjectId) {
			return false;
		}
		this.adapter.log.debug(
			`Emergency valve -> ${open ? 'OPEN' : 'CLOSE'} (write ${this.config.emergencyObjectId} = ${open}).`,
		);
		await this.adapter.setForeignStateAsync(this.config.emergencyObjectId, open, false);
		return true;
	}

	/**
	 * @param {boolean} on - target pump state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setPump(on) {
		if (!this.config.pumpControllable || !this.config.pumpObjectId) {
			return false;
		}
		this.adapter.log.debug(`Pump -> ${on ? 'ON' : 'OFF'} (write ${this.config.pumpObjectId} = ${on}).`);
		await this.adapter.setForeignStateAsync(this.config.pumpObjectId, on, false);
		return true;
	}

	/**
	 * Reflect an incoming foreign state change into the matching status data point.
	 *
	 * @param {string} id - the foreign state id
	 * @param {ioBroker.State | null | undefined} state - the new state
	 * @returns {Promise<void>}
	 */
	async handleForeignChange(id, state) {
		const desc = this.foreignMap.get(id);
		if (!desc || !state) {
			return;
		}
		this.adapter.log.silly(`Foreign change ${id} (${desc.kind}) = ${state.val} (ack=${state.ack}).`);
		if (desc.kind === 'valve' && typeof desc.index === 'number') {
			const p = this.config.points[desc.index];
			const open = interpretValveValue(state.val, p.onValue, p.offValue);
			this.valveOpen[desc.index] = open;
			await this.adapter.setStateAsync(`aeration.point.${desc.index}.valveState`, { val: open, ack: true });
		} else if (desc.kind === 'pump') {
			this.pumpRunning = Boolean(state.val);
			await this.adapter.setStateAsync('safety.pumpRunning', { val: this.pumpRunning, ack: true });
		} else if (desc.kind === 'emergency') {
			this.emergencyOpen = Boolean(state.val);
			await this.adapter.setStateAsync('safety.emergencyValve', { val: this.emergencyOpen, ack: true });
		}
	}

	/** @returns {Promise<void>} */
	async destroy() {
		for (const id of this.foreignMap.keys()) {
			try {
				await this.adapter.unsubscribeForeignStatesAsync(id);
			} catch {
				/* ignore unsubscribe errors during shutdown */
			}
		}
		this.foreignMap.clear();
	}
}

module.exports = { IoBrokerBackend };
