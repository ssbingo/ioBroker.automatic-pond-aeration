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
	buildSchedulePayload,
	parseLicense,
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
		// Fixed timeout (3 heartbeats), independent of pollIntervalSec — the heartbeat runs on its own
			// fast timer, so a long status-poll interval no longer causes failsafe flapping.
			expect(p.heartbeatTimeoutMs).to.equal(15000);
		expect(p.authToken).to.equal('secret');
	});

	it('flattens schedules into per-channel windows (points and groups) for autonomous mode', () => {
		const config = {
			points: [{ id: 'pt-0', espChannel: 3 }, { id: 'pt-1', espChannel: 5 }, { id: 'pt-2', espChannel: 2 }],
			groups: [{ id: 'grp-0', members: [1, 2] }],
			schedules: [
				{ enabled: true, targets: ['pt-0'], days: [1, 2, 3, 4, 5], from: '06:00', to: '20:00' },
				{ enabled: true, targets: ['grp-0'], days: [], from: '22:00', to: '06:00' },
				{ enabled: false, targets: ['pt-0'], days: [0], from: '00:00', to: '23:59' },
			],
		};
		const w = buildSchedulePayload(config);
		// schedule 1 → channel 3; schedule 2 (group of pt-1,pt-2) → channels 5 and 2; disabled dropped
		expect(w).to.deep.include({ ch: 3, days: [1, 2, 3, 4, 5], from: '06:00', to: '20:00' });
		expect(w.filter(x => x.from === '22:00').map(x => x.ch).sort()).to.deep.equal([2, 5]);
		expect(w).to.have.length(3);
	});

	it('advertises autonomous only when enabled AND a schedule exists', () => {
		const base = {
			points: [{ id: 'pt-0', espChannel: 0 }],
			schedules: [{ enabled: true, targets: ['pt-0'], days: [], from: '06:00', to: '20:00' }],
		};
		expect(buildConfigPayload({ ...base, esp32AutonomousEnabled: true }).autonomous).to.equal(true);
		expect(buildConfigPayload({ ...base, esp32AutonomousEnabled: false }).autonomous).to.equal(false);
		// enabled but no schedule → false
		expect(buildConfigPayload({ points: base.points, schedules: [], esp32AutonomousEnabled: true }).autonomous).to.equal(
			false,
		);
	});

	describe('parseLicense', () => {
		it('treats ungated firmware (no tier field) as present:false and control-allowed', () => {
			for (const info of [null, undefined, {}, { fw: '1.2.0', protocol: 1 }]) {
				const lic = parseLicense(info);
				expect(lic.present, JSON.stringify(info)).to.equal(false);
				expect(lic.controlAllowed).to.equal(true);
				expect(lic).to.include({ tier: '', trial: false, trialDaysLeft: 0, deviceCode: '' });
			}
		});

		it('blocks control on the free tier but allows community and pro', () => {
			expect(parseLicense({ tier: 'free' })).to.include({ present: true, tier: 'free', controlAllowed: false });
			expect(parseLicense({ tier: 'community' })).to.include({ controlAllowed: true });
			expect(parseLicense({ tier: 'pro' })).to.include({ controlAllowed: true });
		});

		it('reports the trial and rounds the remaining days; ignores days when no trial runs', () => {
			const t = parseLicense({ tier: 'pro', trial: true, trialDaysLeft: 12.6, deviceCode: 'AAAA-BBBB-CCCC', licensedTier: 'free' });
			expect(t).to.include({ present: true, tier: 'pro', trial: true, trialDaysLeft: 13, deviceCode: 'AAAA-BBBB-CCCC', licensedTier: 'free', controlAllowed: true });
			// trialDaysLeft is only meaningful while the trial runs
			expect(parseLicense({ tier: 'free', trialDaysLeft: 9 })).to.include({ trial: false, trialDaysLeft: 0 });
		});

		it('coerces bad field types to safe defaults', () => {
			const lic = parseLicense({ tier: 'community', trial: true, trialDaysLeft: 'oops', deviceCode: 42, licensedTier: null });
			expect(lic).to.include({ trialDaysLeft: 0, deviceCode: '', licensedTier: '' });
		});
	});
});
