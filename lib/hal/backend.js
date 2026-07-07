'use strict';

/*
 * HardwareBackend – the contract every hardware backend implements.
 *
 * The control engine and the safety layer talk to a backend ONLY through this interface,
 * so the concrete transport (existing ioBroker foreign states, a direct ESP32, ...) stays
 * hidden. Concrete backends override the methods below.
 */

/**
 * Abstract hardware backend. Concrete subclasses (IoBrokerBackend, later Esp32Backend)
 * override every method except the constructor.
 */
class HardwareBackend {
	/**
	 * @param {ioBroker.Adapter} adapter - the adapter instance
	 * @param {ioBroker.AdapterConfig} config - the normalized configuration
	 */
	constructor(adapter, config) {
		this.adapter = adapter;
		this.config = config;
	}

	/**
	 * Set up the backend (subscriptions/connections, read initial values).
	 *
	 * @returns {Promise<void>}
	 */
	async init() {}

	/**
	 * Open or close the valve of an aeration point.
	 *
	 * @param {number} _index - aeration point index
	 * @param {boolean} _open - target valve state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setValve(_index, _open) {
		throw new Error('setValve() not implemented');
	}

	/**
	 * Open or close the emergency valve.
	 *
	 * @param {boolean} _open - target emergency valve state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setEmergency(_open) {
		throw new Error('setEmergency() not implemented');
	}

	/**
	 * Switch the pump (only if it is controllable).
	 *
	 * @param {boolean} _on - target pump state
	 * @returns {Promise<boolean>} whether the command was issued
	 */
	async setPump(_on) {
		throw new Error('setPump() not implemented');
	}

	/**
	 * Whether a foreign state id belongs to this backend.
	 *
	 * @param {string} _id - a foreign state id
	 * @returns {boolean} true if managed by this backend
	 */
	ownsForeignState(_id) {
		return false;
	}

	/**
	 * Reflect an incoming foreign state change into the status data points.
	 *
	 * @param {string} _id - the foreign state id
	 * @param {ioBroker.State | null | undefined} _state - the new state
	 * @returns {Promise<void>}
	 */
	async handleForeignChange(_id, _state) {}

	/**
	 * Tear down the backend (subscriptions/connections).
	 *
	 * @returns {Promise<void>}
	 */
	async destroy() {}
}

module.exports = { HardwareBackend };
