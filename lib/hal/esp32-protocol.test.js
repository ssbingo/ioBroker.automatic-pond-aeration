'use strict';

const { expect } = require('chai');
const {
	buildUrl,
	authHeaders,
	emergencyRelayState,
	emergencyOpenFromRelay,
	parseStatus,
	relaysToValves,
	buildConfigPayload,
} = require('./esp32-protocol');

describe('lib/hal/esp32-protocol', () => {
	it('builds URLs and auth headers', () => {
		expect(buildUrl('1.2.3.4', 80, '/api/status')).to.equal('http://1.2.3.4:80/api/status');
		expect(buildUrl('esp', undefined, '/x')).to.equal('http://esp:80/x');
		expect(authHeaders('tok')).to.deep.equal({ Authorization: 'Bearer tok' });
		expect(authHeaders('')).to.deep.equal({});
	});

	it('maps the emergency valve state to the relay by wiring (NO = de-energized open)', () => {
		// normally-open: energizing closes it → open means relay OFF
		expect(emergencyRelayState(true, true)).to.equal(false);
		expect(emergencyRelayState(false, true)).to.equal(true);
		// normally-closed: energizing opens it
		expect(emergencyRelayState(true, false)).to.equal(true);
		expect(emergencyOpenFromRelay(false, true)).to.equal(true); // NO + relay off = open
		expect(emergencyOpenFromRelay(true, false)).to.equal(true); // NC + relay on = open
	});

	it('normalizes a status response (arrays, sensors, flags)', () => {
		const s = parseStatus({
			relays: [true, false, 1, 0],
			di: [false, true],
			buttons: [true],
			sensors: { oxygen: 8.1, waterTemp: null, airTemp: 'x', pressure: 12 },
			failsafe: 1,
			linkUp: true,
			uptime: 42,
		});
		expect(s.relays).to.deep.equal([true, false, true, false]);
		expect(s.buttons).to.deep.equal([true]);
		expect(s.sensors).to.deep.equal({ oxygen: 8.1, waterTemp: null, airTemp: null, pressure: 12 });
		expect(s.failsafe).to.equal(true);
		expect(s.uptime).to.equal(42);
	});

	it('maps relays to per-point valves via espChannel', () => {
		const points = [{ espChannel: 2 }, { espChannel: 0 }];
		expect(relaysToValves([true, false, true], points)).to.deep.equal([true, true]);
	});

	it('builds the failsafe config payload from the adapter config', () => {
		const config = {
			points: [
				{ espChannel: 0, buttonEnabled: true },
				{ espChannel: 1, buttonEnabled: false },
			],
			esp32EmergencyRelay: 6,
			esp32PumpRelay: 7,
			emergencyNormallyOpen: true,
			pumpControllable: true,
			minOpenValves: 1,
			pollIntervalSec: 30,
			esp32AuthToken: 'secret',
		};
		const p = buildConfigPayload(config);
		expect(p.valveRelays).to.deep.equal([0, 1]);
		expect(p.emergencyRelay).to.equal(6);
		expect(p.emergencyEnergizedOpen).to.equal(false); // NO wiring
		expect(p.pumpRelay).to.equal(7);
		expect(p.buttons).to.deep.equal([{ di: 0, relay: 0, enabled: true }]);
		expect(p.heartbeatTimeoutMs).to.equal(90000);
		expect(p.authToken).to.equal('secret');
	});
});
