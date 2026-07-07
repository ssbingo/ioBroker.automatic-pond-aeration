'use strict';

/*
 * Declarative object/state model for ioBroker.automatic-pond-aeration.
 *
 * `buildObjectModel(config)` is pure: given the normalized configuration it returns
 * an ordered list of `{ id, obj }` entries describing every object the adapter should
 * own. main.js creates the missing ones (setObjectNotExists) and deletes the obsolete
 * ones. Only objects under MANAGED_PREFIXES are removed automatically, so renaming or
 * removing points/groups/sensors cleans up the corresponding tree (rule 8).
 */

/**
 * Prefixes whose objects are managed dynamically (created/removed based on config).
 * Everything under these is subject to automatic cleanup; other objects (info,
 * control base states, safety, astro, location, statistics) are never auto-deleted.
 */
const MANAGED_PREFIXES = ['aeration', 'groups', 'sensors', 'feeder', 'control.point', 'control.group'];

/**
 * @param {string} id - object id
 * @param {string} name - channel name
 * @param {'channel' | 'folder'} [type] - object type (default channel)
 * @returns {{ id: string, obj: any }} entry (obj is a settable channel/folder object)
 */
function container(id, name, type = 'channel') {
	return { id, obj: { type, common: { name }, native: {} } };
}

/**
 * @param {string} id - object id
 * @param {Partial<ioBroker.StateCommon>} common - common part (read defaults to true, write to false)
 * @returns {{ id: string, obj: any }} entry (obj is a settable state object)
 */
function state(id, common) {
	return { id, obj: { type: 'state', common: { read: true, write: false, ...common }, native: {} } };
}

/**
 * Build the full desired object model for a normalized configuration.
 *
 * @param {ioBroker.AdapterConfig} config - the normalized adapter configuration
 * @returns {Array<{ id: string, obj: ioBroker.SettableObject }>} ordered object model
 */
function buildObjectModel(config) {
	const points = Array.isArray(config.points) ? config.points : [];
	const groups = Array.isArray(config.groups) ? config.groups : [];
	const model = [];

	// --- info ---
	model.push(container('info', 'Information'));
	model.push(
		state('info.connection', {
			name: 'Adapter running / configuration valid',
			role: 'indicator.connected',
			type: 'boolean',
			def: false,
		}),
	);
	model.push(state('info.backend', { name: 'Active hardware backend', role: 'text', type: 'string', def: '' }));
	model.push(state('info.activeMode', { name: 'Active control mode', role: 'text', type: 'string', def: '' }));

	// --- control (base) ---
	model.push(container('control', 'Control'));
	model.push(
		state('control.enabled', {
			name: 'Master enable',
			role: 'switch.enable',
			type: 'boolean',
			write: true,
			def: true,
		}),
	);
	model.push(
		state('control.mode', {
			name: 'Control mode',
			role: 'text',
			type: 'string',
			write: true,
			def: 'auto',
			states: { auto: 'auto', manual: 'manual', off: 'off' },
		}),
	);
	model.push(
		state('control.allOff', {
			name: 'Close all valves',
			role: 'button',
			type: 'boolean',
			read: false,
			write: true,
			def: false,
		}),
	);

	// --- aeration points + their command states ---
	if (points.length) {
		model.push(container('aeration', 'Aeration points'));
		model.push(container('aeration.point', 'Aeration points', 'folder'));
		model.push(container('control.point', 'Point commands', 'folder'));
	}
	points.forEach((p, i) => {
		model.push(container(`control.point.${i}`, p.name));
		model.push(
			state(`control.point.${i}.open`, {
				name: 'Open valve',
				role: 'switch',
				type: 'boolean',
				write: true,
				def: false,
			}),
		);

		const base = `aeration.point.${i}`;
		model.push(container(base, p.name));
		model.push(state(`${base}.valveState`, { name: 'Valve open', role: 'indicator', type: 'boolean', def: false }));
		model.push(state(`${base}.active`, { name: 'Point active', role: 'indicator', type: 'boolean', def: false }));
		model.push(
			state(`${base}.runtimeTodaySec`, {
				name: 'Runtime today',
				role: 'value',
				type: 'number',
				unit: 's',
				def: 0,
			}),
		);
		model.push(
			state(`${base}.runtimeTotalH`, { name: 'Runtime total', role: 'value', type: 'number', unit: 'h', def: 0 }),
		);
		model.push(
			state(`${base}.lastChange`, { name: 'Last valve change', role: 'value.time', type: 'number', def: 0 }),
		);
		model.push(state(`${base}.error`, { name: 'Last error', role: 'text', type: 'string', def: '' }));
	});

	// --- groups + their command states ---
	if (groups.length) {
		model.push(container('groups', 'Groups'));
		model.push(container('control.group', 'Group commands', 'folder'));
	}
	groups.forEach((g, i) => {
		const base = `groups.${i}`;
		model.push(container(base, g.name));
		model.push(
			state(`${base}.members`, {
				name: 'Member point indices',
				role: 'json',
				type: 'string',
				def: JSON.stringify(g.members),
			}),
		);
		model.push(state(`${base}.active`, { name: 'Group active', role: 'indicator', type: 'boolean', def: false }));

		model.push(container(`control.group.${i}`, g.name));
		model.push(
			state(`control.group.${i}.active`, {
				name: 'Activate group',
				role: 'switch',
				type: 'boolean',
				write: true,
				def: false,
			}),
		);
	});

	// --- safety ---
	model.push(container('safety', 'Safety'));
	model.push(
		state('safety.interlockActive', {
			name: 'Safety interlock active',
			role: 'indicator.alarm',
			type: 'boolean',
			def: false,
		}),
	);
	model.push(
		state('safety.emergencyValve', {
			name: 'Emergency valve open',
			role: 'indicator',
			type: 'boolean',
			def: false,
		}),
	);
	model.push(state('safety.pumpRunning', { name: 'Pump running', role: 'indicator', type: 'boolean', def: false }));
	model.push(
		state('safety.openValveCount', { name: 'Number of open valves', role: 'value', type: 'number', def: 0 }),
	);
	model.push(
		state('safety.lastTripReason', { name: 'Last interlock trip reason', role: 'text', type: 'string', def: '' }),
	);

	// --- sensors (only the enabled ones) ---
	const sensorStates = [];
	if (config.o2Enabled) {
		sensorStates.push(
			state('sensors.oxygen', { name: 'Dissolved oxygen', role: 'value', type: 'number', unit: 'mg/l', def: 0 }),
		);
		sensorStates.push(
			state('sensors.oxygenSaturation', {
				name: 'Oxygen saturation',
				role: 'value',
				type: 'number',
				unit: '%',
				def: 0,
			}),
		);
		sensorStates.push(
			state('sensors.oxygenAlarm', {
				name: 'Oxygen low alarm',
				role: 'indicator.alarm',
				type: 'boolean',
				def: false,
			}),
		);
	}
	if (config.airTempEnabled) {
		sensorStates.push(
			state('sensors.airTemperature', {
				name: 'Air temperature',
				role: 'value.temperature',
				type: 'number',
				unit: '°C',
				def: 0,
			}),
		);
	}
	if (config.waterTempEnabled) {
		sensorStates.push(
			state('sensors.waterTemperature', {
				name: 'Water temperature',
				role: 'value.temperature',
				type: 'number',
				unit: '°C',
				def: 0,
			}),
		);
	}
	if (config.pressureEnabled) {
		sensorStates.push(
			state('sensors.pressure', {
				name: 'System pressure',
				role: 'value.pressure',
				type: 'number',
				unit: 'bar',
				def: 0,
			}),
		);
		sensorStates.push(
			state('sensors.pressureAlarm', {
				name: 'Pressure alarm',
				role: 'indicator.alarm',
				type: 'boolean',
				def: false,
			}),
		);
	}
	if (sensorStates.length) {
		model.push(container('sensors', 'Sensors'));
		model.push(...sensorStates);
	}

	// --- astro + location ---
	model.push(container('astro', 'Astronomical times'));
	model.push(state('astro.sunrise', { name: 'Sunrise', role: 'text', type: 'string', def: '' }));
	model.push(state('astro.sunset', { name: 'Sunset', role: 'text', type: 'string', def: '' }));
	model.push(state('astro.solarNoon', { name: 'Solar noon', role: 'text', type: 'string', def: '' }));
	model.push(state('astro.isNight', { name: 'It is night', role: 'indicator', type: 'boolean', def: false }));

	model.push(container('location', 'Location'));
	model.push(state('location.latitude', { name: 'Latitude', role: 'value.gps.latitude', type: 'number', def: 0 }));
	model.push(state('location.longitude', { name: 'Longitude', role: 'value.gps.longitude', type: 'number', def: 0 }));
	model.push(state('location.resolvedAddress', { name: 'Resolved address', role: 'text', type: 'string', def: '' }));

	// --- feeder coupling (only when enabled) ---
	if (config.feederEnabled) {
		model.push(container('feeder', 'Feeder coupling'));
		model.push(
			state('feeder.pauseActive', {
				name: 'Aeration paused for feeding',
				role: 'indicator',
				type: 'boolean',
				def: false,
			}),
		);
		model.push(
			state('feeder.pauseUntil', { name: 'Pause active until', role: 'value.time', type: 'number', def: 0 }),
		);
		model.push(
			state('feeder.lastFeedStart', { name: 'Last feeding start', role: 'value.time', type: 'number', def: 0 }),
		);
	}

	// --- statistics ---
	model.push(container('statistics', 'Statistics'));
	model.push(
		state('statistics.compressorRuntimeTodayH', {
			name: 'Compressor runtime today',
			role: 'value',
			type: 'number',
			unit: 'h',
			def: 0,
		}),
	);
	model.push(
		state('statistics.switchCyclesToday', {
			name: 'Valve switch cycles today',
			role: 'value',
			type: 'number',
			def: 0,
		}),
	);

	return model;
}

/**
 * Given the set of desired ids and the existing adapter object ids (relative to the
 * instance namespace), return the ids that are obsolete and should be deleted. Only
 * ids under MANAGED_PREFIXES are ever considered obsolete.
 *
 * @param {Iterable<string>} existingRelIds - existing object ids (namespace-relative)
 * @param {Set<string>} desiredIds - ids in the current object model
 * @returns {string[]} obsolete ids to delete (deepest first)
 */
function computeObsolete(existingRelIds, desiredIds) {
	const obsolete = [];
	for (const id of existingRelIds) {
		const managed = MANAGED_PREFIXES.some(pre => id === pre || id.startsWith(`${pre}.`));
		if (managed && !desiredIds.has(id)) {
			obsolete.push(id);
		}
	}
	// deepest first so recursive deletes never target an already-removed parent's child
	obsolete.sort((a, b) => b.split('.').length - a.split('.').length);
	return obsolete;
}

module.exports = {
	MANAGED_PREFIXES,
	buildObjectModel,
	computeObsolete,
};
