'use strict';

const { expect } = require('chai');
const { MESSAGES, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, translate } = require('./messages');

describe('lib/messages – catalog completeness', () => {
	it('has all supported languages for every message key', () => {
		for (const key of Object.keys(MESSAGES)) {
			for (const lang of SUPPORTED_LANGUAGES) {
				expect(MESSAGES[key][lang], `missing ${lang} for "${key}"`).to.be.a('string').and.not.empty;
			}
		}
	});
	it('uses the same placeholder tokens across all languages of a key', () => {
		const tokens = str => (str.match(/\{[a-zA-Z]+\}/g) || []).sort();
		for (const key of Object.keys(MESSAGES)) {
			const ref = tokens(MESSAGES[key][DEFAULT_LANGUAGE]);
			for (const lang of SUPPORTED_LANGUAGES) {
				expect(tokens(MESSAGES[key][lang]), `token mismatch in ${lang}/"${key}"`).to.deep.equal(ref);
			}
		}
	});
});

describe('lib/messages – translate', () => {
	it('returns the requested language', () => {
		expect(translate('interlockCleared', 'de')).to.equal(MESSAGES.interlockCleared.de);
	});
	it('falls back to English for an unsupported language', () => {
		expect(translate('interlockCleared', 'xx')).to.equal(MESSAGES.interlockCleared.en);
	});
	it('falls back to English when no language is given', () => {
		expect(translate('interlockCleared')).to.equal(MESSAGES.interlockCleared.en);
	});
	it('returns the raw key for an unknown message', () => {
		expect(translate('does-not-exist', 'de')).to.equal('does-not-exist');
	});
	it('substitutes placeholders', () => {
		const out = translate('modeChanged', 'en', { mode: 'auto' });
		expect(out).to.equal('Operating mode changed to "auto".');
	});
	it('substitutes multiple placeholders', () => {
		const out = translate('adapterStarted', 'en', { points: 3, groups: 1, mode: 'auto' });
		expect(out).to.contain('3 aeration point(s)').and.to.contain('1 group(s)').and.to.contain('"auto"');
	});
});
