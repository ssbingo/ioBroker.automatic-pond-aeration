'use strict';

const { expect } = require('chai');
const { toMinutes, isScheduleActiveAt, resolveTargetsToPoints, scheduleDesired } = require('./schedule');

const points = [
	{ id: 'pt-0', name: 'A' },
	{ id: 'pt-1', name: 'B' },
	{ id: 'pt-2', name: 'C' },
];
const groups = [{ id: 'grp-0', name: 'G', members: [1, 2] }];

describe('lib/control/schedule – toMinutes', () => {
	it('parses HH:mm', () => {
		expect(toMinutes('00:00')).to.equal(0);
		expect(toMinutes('08:30')).to.equal(510);
		expect(toMinutes('23:59')).to.equal(1439);
	});
	it('returns 0 for malformed input', () => {
		expect(toMinutes('nope')).to.equal(0);
		expect(toMinutes('')).to.equal(0);
	});
});

describe('lib/control/schedule – isScheduleActiveAt', () => {
	const sch = { enabled: true, days: [1, 2, 3, 4, 5], from: '08:00', to: '18:00' };
	it('is active inside the window on a matching day', () => {
		expect(isScheduleActiveAt(sch, 1, 600)).to.equal(true); // Mon 10:00
	});
	it('is inactive outside the window', () => {
		expect(isScheduleActiveAt(sch, 1, 1200)).to.equal(false); // Mon 20:00
	});
	it('is inactive on a non-matching day', () => {
		expect(isScheduleActiveAt(sch, 0, 600)).to.equal(false); // Sunday
	});
	it('treats an empty day list as every day', () => {
		expect(isScheduleActiveAt({ enabled: true, days: [], from: '08:00', to: '18:00' }, 0, 600)).to.equal(true);
	});
	it('handles overnight windows (22:00–06:00)', () => {
		const night = { enabled: true, days: [], from: '22:00', to: '06:00' };
		expect(isScheduleActiveAt(night, 3, 23 * 60)).to.equal(true); // 23:00
		expect(isScheduleActiveAt(night, 3, 5 * 60)).to.equal(true); // 05:00
		expect(isScheduleActiveAt(night, 3, 12 * 60)).to.equal(false); // 12:00
	});
	it('is inactive when disabled or zero-length', () => {
		expect(isScheduleActiveAt({ enabled: false, days: [], from: '08:00', to: '18:00' }, 1, 600)).to.equal(false);
		expect(isScheduleActiveAt({ enabled: true, days: [], from: '08:00', to: '08:00' }, 1, 480)).to.equal(false);
	});
});

describe('lib/control/schedule – resolveTargetsToPoints', () => {
	it('resolves point ids and group ids to point indices', () => {
		expect(resolveTargetsToPoints(['pt-0'], points, groups)).to.deep.equal([0]);
		expect(resolveTargetsToPoints(['grp-0'], points, groups).sort()).to.deep.equal([1, 2]);
		expect(resolveTargetsToPoints(['pt-0', 'grp-0'], points, groups).sort()).to.deep.equal([0, 1, 2]);
	});
	it('ignores unknown ids', () => {
		expect(resolveTargetsToPoints(['nope'], points, groups)).to.be.empty;
	});
});

describe('lib/control/schedule – scheduleDesired', () => {
	it('opens the targeted points of the active schedule', () => {
		const schedules = [{ enabled: true, days: [], from: '08:00', to: '18:00', targets: ['grp-0'] }];
		expect(scheduleDesired(schedules, points, groups, 1, 600)).to.deep.equal([false, true, true]);
	});
	it('opens nothing when no schedule is active', () => {
		const schedules = [{ enabled: true, days: [], from: '08:00', to: '18:00', targets: ['pt-0'] }];
		expect(scheduleDesired(schedules, points, groups, 1, 1300)).to.deep.equal([false, false, false]);
	});
});
