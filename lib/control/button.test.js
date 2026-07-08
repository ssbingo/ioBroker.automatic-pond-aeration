'use strict';

const { expect } = require('chai');
const { nextButtonState, buttonForcedOn } = require('./button');

describe('lib/control/button – nextButtonState (toggle)', () => {
	it('flips on the rising edge only', () => {
		let s = { on: false, raw: false };
		s = nextButtonState(s, true, 'toggle'); // press
		expect(s.on).to.equal(true);
		expect(s.changed).to.equal(true);
		s = nextButtonState(s, true, 'toggle'); // still held → no change
		expect(s.on).to.equal(true);
		expect(s.changed).to.equal(false);
		s = nextButtonState(s, false, 'toggle'); // release → no change
		expect(s.on).to.equal(true);
		s = nextButtonState(s, true, 'toggle'); // press again → off
		expect(s.on).to.equal(false);
		expect(s.changed).to.equal(true);
	});

	it('defaults to toggle and tolerates a missing previous state', () => {
		const s = nextButtonState(undefined, true);
		expect(s.on).to.equal(true);
		expect(s.raw).to.equal(true);
	});

	it('does not toggle without a press', () => {
		const s = nextButtonState({ on: true, raw: false }, false, 'toggle');
		expect(s.on).to.equal(true);
		expect(s.changed).to.equal(false);
	});
});

describe('lib/control/button – buttonForcedOn', () => {
	const points = [{ id: 'pt-0' }, { id: 'pt-1' }, { id: 'pt-2' }];

	it('forces on only points whose button is present and toggled on', () => {
		const states = [{ on: true }, { on: false }, { on: true }];
		const mask = [true, true, false]; // point 2 has no button present
		expect(buttonForcedOn(points, states, mask)).to.deep.equal([true, false, false]);
	});

	it('treats all points as present when no mask is given', () => {
		const states = [{ on: false }, { on: true }, { on: false }];
		expect(buttonForcedOn(points, states)).to.deep.equal([false, true, false]);
	});
});
